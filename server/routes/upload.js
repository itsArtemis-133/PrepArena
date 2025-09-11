// server/routes/upload.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const requireAuth = require("../middleware/authMiddleware");
const s3Service = require("../config/s3");

const router = express.Router();

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  path.join(__dirname, "..", "uploads"); // fallback for local dev without disk

// Ensure directory exists for fallback
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Configure multer for both S3 and local storage
 */
const storage = s3Service.isConfigured 
  ? multer.memoryStorage() // Use memory storage for S3 uploads
  : multer.diskStorage({    // Fallback to disk storage
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
 * Auth required. Stores a single file field named "file".
 * Uses S3 if configured, otherwise falls back to local storage.
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
        url: result.key, // Store the S3 key for database
        s3Url: result.url, // Full S3 URL for immediate access
        key: result.key,
        bucket: result.bucket,
      });
    } else {
      // Fallback to local storage
      const storedName = req.file.filename;
      return res.json({
        url: `/uploads/${storedName}`, // Legacy path format
        storedName,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ 
      message: "Upload failed", 
      error: error.message 
    });
  }
});

/**
 * Legacy endpoint for backward compatibility
 */
router.post("/upload/file", requireAuth, upload.single("file"), async (req, res) => {
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
        file: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          storedName: result.key, // S3 key for database storage
          s3Url: result.url,
          key: result.key,
          bucket: result.bucket,
        },
      });
    } else {
      // Fallback to local storage
      const storedName = req.file.filename;
      return res.json({
        ok: true,
        file: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          storedName, // Local filename for database storage
        },
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ 
      message: "Upload failed", 
      error: error.message 
    });
  }
});

module.exports = router;
