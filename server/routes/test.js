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
const requireAuth = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");

// My tests (creator view)
router.get("/test", requireAuth, testController.getMyTests);

// Public list & detail
router.get("/test/public", optionalAuth, testController.getPublicTests);
router.get("/test/public/:link", optionalAuth, testController.getPublicTest);

// Registration
router.get("/test/registered/:link", optionalAuth, testController.checkRegistration);
router.post("/test/:link/register", requireAuth, testController.registerForTest);

// Create & submit
router.post("/test", requireAuth, testController.createTest);
router.post("/test/:id/submit", requireAuth, testController.submitAnswers);

// Results (public reads; controller gates by completion window)
router.get("/test/:id/leaderboard", optionalAuth, testController.getLeaderboard);
router.get("/test/:id/solution", optionalAuth, testController.getSolution);

// Answer-key extraction proxy (Python service on :8001)
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
