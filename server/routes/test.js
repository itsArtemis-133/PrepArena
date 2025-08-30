// server/routes/test.js
const express = require("express");
const router = express.Router();

const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");

const testController = require("../controllers/testController");
const feedbackController = require("../controllers/feedbackController");
const requireAuth = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");

const Test = require("../models/Test"); // <-- add model import

// Helper: return a no-op 501 handler if a controller method is missing,
// so the app doesn't crash during development.
const h = (fn) =>
  typeof fn === "function"
    ? fn
    : (req, res) => res.status(501).json({ message: "Not implemented" });

/* ---------------------- My tests (creator / registered) ---------------------- */
router.get("/test", requireAuth, h(testController.getMyTests));

/* ------------------------- Public list & public view ------------------------- */
router.get("/test/public", optionalAuth, h(testController.getPublicTests));
router.get("/test/public/:link", optionalAuth, h(testController.getPublicTest));

/* --------------------------- Registration flows ----------------------------- */
router.get("/test/registered/:link", optionalAuth, h(testController.checkRegistration));
router.post("/test/:link/register", requireAuth, h(testController.registerForTest));
router.delete("/test/:link/unregister", requireAuth, h(testController.unregisterForTest)); // ✅ canonical DELETE

/* ------------------------- Create / Update / Submit ------------------------- */
router.post("/test", requireAuth, h(testController.createTest));
router.patch("/test/:id", requireAuth, h(testController.updateTest)); // creator edit
router.post("/test/:id/submit", requireAuth, h(testController.submitAnswers));

/* ------------------------------ Results reads ------------------------------- */
router.get("/test/:id/leaderboard", optionalAuth, h(testController.getLeaderboard));
router.get("/test/:id/leaderboard.csv", optionalAuth, h(testController.getLeaderboardCsv));
router.get("/test/:id/results/me", requireAuth, h(testController.getMyResult));
router.get("/test/:id/solution", optionalAuth, h(testController.getSolution));

/* -------------------------------- Feedback ---------------------------------- */
router.get("/test/:id/feedback", optionalAuth, h(feedbackController.listFeedbackForTest)); // avg/count + my (optional auth)
router.post("/test/:id/feedback", requireAuth, h(feedbackController.upsertFeedback));      // upsert my feedback
router.delete("/test/:id/feedback", requireAuth, h(feedbackController.deleteFeedback));    // clear my feedback

/* --------------- Answer-key extraction proxy (local Python) ----------------- */
router.post(
  "/test/upload-answers",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const maxQ = Math.max(1, Math.min(400, parseInt(req.body.max_q || "100", 10)));
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      form.append("max_q", String(maxQ));

      const py = await axios.post("http://127.0.0.1:8001/extract", form, {
        headers: form.getHeaders(),
        timeout: 20000,
      });

      const raw = (py.data && py.data.answers) || {};
      const answers = {};
      for (let i = 1; i <= maxQ; i++) {
        const v = raw[String(i)] ?? raw[i] ?? "";
        answers[i] = typeof v === "string" ? v.toUpperCase() : "";
      }
      return res.json({ answers });
    } catch (err) {
      console.error("upload-answers error:", err.response?.data || err.message);
      return res.json({ answers: {} }); // do not block wizard
    }
  }
);

/* --------------------------- Secure PDF downloads --------------------------- */
/**
 * We support two storage styles (based on your current schema):
 *  - Local: pdfUrl/answersPdfUrl looks like "/uploads/<filename>" or "<filename>"
 *  - Remote: pdfUrl/answersPdfUrl is "http(s)://..."
 *
 * For local, we stream from server/uploads.
 * For remote, we proxy via axios and stream to the client (keeps route protected).
 */

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

function testIsOver(testDoc) {
  if (!testDoc?.scheduledDate || !testDoc?.duration) return false;
  const start = new Date(testDoc.scheduledDate);
  if (Number.isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + Number(testDoc.duration) * 60 * 1000);
  return Date.now() > end.getTime();
}

function sanitizeFilename(name, fallback) {
  const base = (name || fallback || "file").toString().trim();
  return base.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, 180);
}

function localPathFromUrlish(u) {
  if (!u) return null;
  // strip leading /uploads/
  if (u.startsWith("/uploads/")) u = u.replace(/^\/uploads\//, "");
  // keep only basename to avoid path traversal
  const fname = path.basename(u);
  return path.join(UPLOADS_DIR, fname);
}

async function streamLocalOrRemotePdf(res, urlish, downloadName) {
  // If remote http(s), proxy-stream it
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

  // Else treat it as local file path/name
  const filePath = localPathFromUrlish(urlish);
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
 * - Creator: allowed anytime
 * - Others: allowed only after test ends
 */
router.get("/test/:id/pdf", requireAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .select("_id title createdBy scheduledDate duration pdfUrl");
    if (!test) return res.status(404).json({ message: "Test not found" });

    const isCreator = String(test.createdBy) === String(req.user?._id || req.user?.id);
    if (!isCreator && !testIsOver(test)) {
      return res.status(403).json({ message: "Question paper available after the test ends." });
    }
    if (!test.pdfUrl) {
      return res.status(404).json({ message: "Question paper not uploaded." });
    }

    const name = `${test.title || "Question Paper"}`;
    return streamLocalOrRemotePdf(res, test.pdfUrl, name);
  } catch (e) {
    console.error("GET /test/:id/pdf error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/test/:id/answers-pdf
 * - Creator: allowed anytime
 * - Others: allowed only after test ends
 */
router.get("/test/:id/answers-pdf", requireAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .select("_id title createdBy scheduledDate duration answersPdfUrl");
    if (!test) return res.status(404).json({ message: "Test not found" });

    const isCreator = String(test.createdBy) === String(req.user?._id || req.user?.id);
    if (!isCreator && !testIsOver(test)) {
      return res.status(403).json({ message: "Official answers available after the test ends." });
    }
    if (!test.answersPdfUrl) {
      return res.status(404).json({ message: "Official answers PDF not uploaded." });
    }

    const name = `${test.title || "Official Answers"}`;
    return streamLocalOrRemotePdf(res, test.answersPdfUrl, name);
  } catch (e) {
    console.error("GET /test/:id/answers-pdf error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
