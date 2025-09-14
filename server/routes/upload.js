const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const requireAuth = require("../middleware/authMiddleware");
const s3Service = require("../config/s3");

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");

// Ensure local directory exists for fallback
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Configure multer for both S3 and local storage
 */
const storage = s3Service.isConfigured
  ? multer.memoryStorage() // S3 → keep in memory
  : multer.diskStorage({   // Local fallback
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      (typeof file.originalname === "string" &&
        file.originalname.toLowerCase().endsWith(".pdf"));
    if (!ok) return cb(new Error("Only PDF files are allowed"));
    cb(null, true);
  },
});

/**
 * POST /api/upload
 * Upload a PDF. Returns S3/local key (store this in DB).
 */
router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    if (s3Service.isConfigured) {
      // Upload to S3
      const result = await s3Service.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      return res.json({
        ok: true,
        key: result.key,       // ✅ Save this in Test.pdfUrl / answersPdfUrl
        url: result.url,       // Just for preview/debug
        bucket: result.bucket,
      });
    } else {
      // Local fallback
      const storedName = req.file.filename;
      return res.json({
        ok: true,
        key: `uploads/${storedName}`,  // ✅ Store this in DB
        url: `/uploads/${storedName}`, // For local preview
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      message: "Upload failed",
      error: error.message,
    });
  }
});

module.exports = router;
