// server/routes/upload.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  path.join(__dirname, "..", "uploads"); // fallback for local dev without disk

// Ensure directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Multer storage to disk under UPLOAD_DIR with safe filenames.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = (file.originalname || "file")
      .toString()
      .replace(/[^\w.\-]+/g, "_")
      .slice(0, 180);
    cb(null, `${ts}__${safe}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB cap
  },
});

/**
 * POST /api/upload/file
 * Auth required. Stores a single file field named "file".
 * Returns metadata you can persist in DB (we DO NOT expose a public URL).
 */
router.post("/upload/file", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  // Only return server-side reference (no public static exposure)
  // You usually persist `storedName` into test.pdfUrl or test.answersPdfUrl
  const storedName = req.file.filename;

  return res.json({
    ok: true,
    file: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storedName, // save this in DB
      // If you want to maintain backward compat with existing fields:
      // legacyPath: `/uploads/${storedName}` // NOT publicly exposed
    },
  });
});

module.exports = router;
