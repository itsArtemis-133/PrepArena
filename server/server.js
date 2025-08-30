// server/server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { connectDB } = require("./config/db");

const app = express();

/* ---------- trust proxy (needed behind vercel/nginx/render) ---------- */
app.set("trust proxy", 1);

/* ---------- CORS (allow-list via env) ---------- */
// Accept either CORS_ORIGIN or CORS_ORIGINS (comma-separated, no spaces)
const rawEnv =
  (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "").trim(); // e.g. "http://localhost:5173,https://preparena.vercel.app"

const allowAll = rawEnv === "*";
let allowList = allowAll
  ? []
  : rawEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

// Dev safeguard: don’t lock yourself out locally
if (!allowAll && allowList.length === 0) {
  allowList = ["http://localhost:5173"];
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[CORS] No CORS origins configured; defaulting to http://localhost:5173 for development."
    );
  }
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser tools (curl/health checks) with no Origin header
      if (!origin) return cb(null, true);
      if (allowAll) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Optional: handle OPTIONS quickly
// app.options("(.*)", cors()); // v6-compatible wildcard


app.use(express.json({ limit: "10mb" }));

/* ---------- IMPORTANT: stop serving /uploads publicly ---------- */
// If you keep this line, anyone with a link can fetch PDFs.
// We’ll serve via protected routes instead.
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ---------- Routes ---------- */
app.use("/api/auth", require("./routes/auth"));
app.use("/api", require("./routes/api"));
app.use("/api", require("./routes/test"));    // includes secure /test/:id/pdf, /answers-pdf
app.use("/api", require("./routes/upload"));

/* ---------- Health ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- Not found (API) ---------- */
app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));

/* ---------- Error handler (JSON, including CORS errors) ---------- */
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

/* ---------- Graceful shutdown ---------- */
process.on("SIGINT", async () => {
  try {
    await require("mongoose").disconnect();
  } catch {}
  process.exit(0);
});
