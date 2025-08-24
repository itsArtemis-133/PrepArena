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

const testController = require("../controllers/testController");
const feedbackController = require("../controllers/feedbackController");
const requireAuth = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");

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
router.post("/test/:link/unregister", requireAuth, h(testController.unregisterForTest));  // creator/user opt-out (if implemented)

/* ------------------------- Create / Update / Submit ------------------------- */
router.post("/test", requireAuth, h(testController.createTest));
router.patch("/test/:id", requireAuth, h(testController.updateTest)); // creator edit (if implemented)
router.post("/test/:id/submit", requireAuth, h(testController.submitAnswers));

/* ------------------------------ Results reads ------------------------------- */
router.get("/test/:id/leaderboard", optionalAuth, h(testController.getLeaderboard));
router.get("/test/:id/leaderboard.csv", optionalAuth, h(testController.getLeaderboardCsv));
router.get("/test/:id/results/me", requireAuth, h(testController.getMyResult));
router.get("/test/:id/solution", optionalAuth, h(testController.getSolution));

/* -------------------------------- Feedback ---------------------------------- */
// GET avg/count + my feedback (optional auth)
router.get("/test/:id/feedback", optionalAuth, h(feedbackController.getFeedback));
// POST upsert my feedback (require auth)
router.post("/test/:id/feedback", requireAuth, h(feedbackController.upsertFeedback));
// DELETE clear my feedback (require auth)
router.delete("/test/:id/feedback", requireAuth, h(feedbackController.deleteFeedback));

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

module.exports = router;
