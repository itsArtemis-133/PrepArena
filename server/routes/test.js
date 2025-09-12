const express = require("express");
const router = express.Router();

const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      (typeof file.originalname === "string" &&
        file.originalname.toLowerCase().endsWith(".pdf"));
    if (!ok) return cb(new Error("Only PDF files are allowed"));
    cb(null, true);
  },
});

const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const fs = require("fs");

const testController = require("../controllers/testController");
const feedbackController = require("../controllers/feedbackController");
const requireAuth = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");
const s3Service = require("../config/s3");

const Test = require("../models/Test");

// Helper: return a no-op 501 handler if a controller method is missing
const h = (fn) =>
  typeof fn === "function"
    ? fn
    : (_req, res) => res.status(501).json({ message: "Not implemented" });

/* ---------------------- My tests (creator / registered) ---------------------- */
router.get("/test", requireAuth, h(testController.getMyTests));

/* ------------------------- Public list & public view ------------------------- */
router.get("/test/public", optionalAuth, h(testController.getPublicTests));
router.get("/test/public/:link", optionalAuth, h(testController.getPublicTest));

/* --------------------------- Registration flows ----------------------------- */
router.get("/test/registered/:link", optionalAuth, h(testController.checkRegistration));
router.post("/test/:link/register", requireAuth, h(testController.registerForTest));
router.delete("/test/:link/unregister", requireAuth, h(testController.unregisterForTest));

/* ------------------------- Create / Update / Submit ------------------------- */
router.post("/test", requireAuth, h(testController.createTest));
router.patch("/test/:id", requireAuth, h(testController.updateTest));
router.post("/test/:id/submit", requireAuth, h(testController.submitAnswers));

/* ------------------------------ Results reads ------------------------------- */
router.get("/test/:id/leaderboard", optionalAuth, h(testController.getLeaderboard));
router.get("/test/:id/leaderboard.csv", optionalAuth, h(testController.getLeaderboardCsv));
router.get("/test/:id/results/me", requireAuth, h(testController.getMyResult));
router.get("/test/:id/solution", optionalAuth, h(testController.getSolution));

/* -------------------------------- Feedback ---------------------------------- */
router.get("/test/:id/feedback", optionalAuth, h(feedbackController.listFeedbackForTest));
router.post("/test/:id/feedback", requireAuth, h(feedbackController.upsertFeedback));
router.delete("/test/:id/feedback", requireAuth, h(feedbackController.deleteFeedback));

/* --------------- Answer-key extraction proxy (Python microservice) ---------- */
router.post("/test/upload-answers", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const maxQ = Math.max(1, Math.min(400, parseInt(req.body.max_q || "100", 10)));
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const extractorUrl = process.env.EXTRACTOR_URL;
    if (!extractorUrl) {
      return res.status(500).json({ message: "Extractor URL not configured" });
    }
    const token = process.env.EXTRACTOR_AUTH_TOKEN || "";

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    form.append("max_q", String(maxQ));

    const py = await axios.post(`${extractorUrl.replace(/\/+$/, "")}/extract`, form, {
      headers: {
        ...form.getHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000,
    });

    const payload = py.data || {};
    const raw =
      payload.answers ||
      (payload.data && payload.data.answers) ||
      payload.data ||
      {};
    const answers = {};
    for (let i = 1; i <= maxQ; i++) {
      const v = raw[String(i)] ?? raw[i] ?? "";
      answers[i] = typeof v === "string" ? v.toUpperCase() : "";
    }
    return res.json({ answers });
  } catch (err) {
    console.error("upload-answers error:", err.response?.data || err.message);
    return res.json({ answers: {} });
  }
});

/* --------------------------- Secure PDF downloads --------------------------- */
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");

function testIsOver(testDoc) {
  if (!testDoc?.scheduledDate || !testDoc?.duration) return false;
  const start = new Date(testDoc.scheduledDate);
  if (Number.isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + Number(testDoc.duration) * 60 * 1000);
  return Date.now() > end.getTime();
}

function computeWindow(testDoc) {
  if (!testDoc?.scheduledDate || !testDoc?.duration) return { isLive: false, isCompleted: false };
  const start = new Date(testDoc.scheduledDate).getTime();
  const end = start + Number(testDoc.duration) * 60 * 1000;
  const now = Date.now();
  return {
    isLive: now >= start && now < end,
    isCompleted: now >= end,
  };
}

function sanitizeFilename(name, fallback) {
  const base = (name || fallback || "file").toString().trim();
  return base.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, 180);
}

function resolveLocalPathFromStoredName(storedNameOrLegacy) {
  if (!storedNameOrLegacy) return null;
  let fname = storedNameOrLegacy;
  if (typeof fname === "string" && fname.startsWith("/uploads/")) {
    fname = fname.replace(/^\/uploads\//, "");
  }
  const safe = path.basename(fname);
  return path.join(UPLOAD_DIR, safe);
}

async function streamFileResponse(res, urlish, downloadName) {
  if (s3Service.isConfigured && urlish && !urlish.startsWith("http") &&
      (urlish.includes("uploads/") || urlish.includes("__"))) {
    try {
      const key = s3Service.extractKeyFromUrl(urlish);
      const signedUrl = await s3Service.getSignedUrl(key, 3600);
      return res.redirect(signedUrl);
    } catch (error) {
      console.error("S3 signed URL error:", error);
      return res.status(404).json({ message: "File not found in S3" });
    }
  }
  if (typeof urlish === "string" && /^https?:\/\//i.test(urlish)) {
    try {
      const upstream = await axios.get(urlish, { responseType: "stream" });
      res.setHeader("Content-Type", upstream.headers["content-type"] || "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFilename(downloadName, "file")}.pdf"`);
      upstream.data.on("error", () => res.status(500).end());
      return upstream.data.pipe(res);
    } catch (e) {
      return res.status(404).json({ message: "Remote file not reachable" });
    }
  }
  const filePath = resolveLocalPathFromStoredName(urlish);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFilename(downloadName, "file")}.pdf"`);
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => res.status(500).end());
  return stream.pipe(res);
}

/**
 * GET /api/test/:id/pdf
 */
router.get("/test/:id/pdf", requireAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select(
      "_id title createdBy scheduledDate duration pdfUrl registrations"
    );
    if (!test) return res.status(404).json({ message: "Test not found" });

    const uid = req.user?._id || req.user?.id;
    const isCreator = String(test.createdBy) === String(uid);
    const w = computeWindow(test);

    if (!isCreator) {
      const registered = Array.isArray(test.registrations) &&
        test.registrations.some((id) => String(id) === String(uid));

      if (!registered) {
        return res.status(403).json({ message: "Only registered users can access." });
      }
      if (!w.isLive && !w.isCompleted) {
        return res.status(403).json({ message: "Test not started yet." });
      }
    }

    if (!test.pdfUrl) {
      return res.status(404).json({ message: "Question paper not uploaded." });
    }

    const name = `${test.title || "Question Paper"}`;
    return streamFileResponse(res, test.pdfUrl, name);
  } catch (e) {
    console.error("GET /test/:id/pdf error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/test/:id/answers-pdf
 */
router.get("/test/:id/answers-pdf", requireAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select(
      "_id title createdBy scheduledDate duration answersPdfUrl registrations"
    );
    if (!test) return res.status(404).json({ message: "Test not found" });

    const uid = req.user?._id || req.user?.id;
    const isCreator = String(test.createdBy) === String(uid);
    const w = computeWindow(test);

    if (!isCreator) {
      const registered = Array.isArray(test.registrations) &&
        test.registrations.some((id) => String(id) === String(uid));

      if (!registered) {
        return res.status(403).json({ message: "Only registered users can access." });
      }
      if (!w.isCompleted) {
        return res.status(403).json({ message: "Official answers available after the test ends." });
      }
    }

    if (!test.answersPdfUrl) {
      return res.status(404).json({ message: "Official answers PDF not uploaded." });
    }

    const name = `${test.title || "Official Answers"}`;
    return streamFileResponse(res, test.answersPdfUrl, name);
  } catch (e) {
    console.error("GET /test/:id/answers-pdf error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
