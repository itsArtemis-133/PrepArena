// server/server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { connectDB } = require("./config/db");
const s3Service = require("./config/s3");

let helmet = null;
let rateLimit = null;
try {
  helmet = require("helmet");
} catch (_) {
  console.warn('[WARN] "helmet" not found; continuing without security headers.');
}
try {
  rateLimit = require("express-rate-limit");
} catch (_) {
  console.warn('[WARN] "express-rate-limit" not found; continuing without rate limiting.');
}

const app = express();
app.set("trust proxy", 1);

if (helmet) {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
}

// --- CORS setup (same as your version) ---
const rawEnv = (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "").trim();
const allowAll = rawEnv === "*";
let allowList = allowAll
  ? []
  : rawEnv.split(",").map((s) => s.trim()).filter(Boolean);

if (!allowAll && allowList.length === 0) {
  allowList = ["http://localhost:5173", "http://127.0.0.1:5173"];
  if (process.env.NODE_ENV !== "production") {
    console.warn("[CORS] Defaulting to localhost for development.");
  }
}

function buildMatcher(entry) {
  if (entry === "*") return () => true;
  if (entry.startsWith("https://*.")) {
    const suffix = entry.replace("https://*.", "");
    return (origin) => !!origin && origin.startsWith("https://") && origin.endsWith("." + suffix);
  }
  if (entry.startsWith("http://*.")) {
    const suffix = entry.replace("http://*.", "");
    return (origin) => !!origin && origin.startsWith("http://") && origin.endsWith("." + suffix);
  }
  return (origin) => origin === entry;
}
const allowMatchers = allowList.map(buildMatcher);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow curl/postman
      if (allowAll) return cb(null, true);
      if (allowMatchers.some((fn) => fn(origin))) return cb(null, true);
      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.options(/.*/, cors());
app.use(express.json({ limit: "10mb" }));

// --- Rate limiting ---
if (rateLimit) {
  const isProd = process.env.NODE_ENV === "production";
  const maxRequests = isProd
    ? Number(process.env.SUBMIT_RATE_PER_MIN || 600)
    : 10000;

  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      message: "Too many requests, please try again later.",
    })
  );
} else {
  console.warn("[WARN] Rate limiting disabled (express-rate-limit not found).");
}

// --- IMPORTANT: serve /uploads only in local dev ---
if (!s3Service.isConfigured) {
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
}

// --- Routes ---
app.use("/api/auth", require("./routes/auth"));
app.use("/api", require("./routes/api"));
app.use("/api", require("./routes/test"));   // test routes
app.use("/api", require("./routes/upload")); // upload routes

// --- Health ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- Not found handler ---
app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));

// --- Error handler ---
app.use((err, _req, res, _next) => {
  const msg = err && (err.message || err.toString());
  const isCors = msg && msg.startsWith("Not allowed by CORS");
  const status = isCors ? 403 : err.status || 500;

  if (status >= 500) {
    console.error("Server error:", err);
  }

  res
    .status(status)
    .json({ message: isCors ? msg : "Server error", detail: isCors ? undefined : msg });
});

const PORT = process.env.PORT || 8000;
(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
  } catch (err) {
    console.error("❌ Mongo connect failed:", err.message);
    process.exit(1);
  }
})();

process.on("SIGINT", async () => {
  try {
    await require("mongoose").disconnect();
  } catch {}
  process.exit(0);
});
