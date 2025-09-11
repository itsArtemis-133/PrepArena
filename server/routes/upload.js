// server/routes/upload.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const requireAuth = require("../middleware/authMiddleware");
const { uploadToS3, isS3Configured } = require("../config/s3");

const router = express.Router();

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  path.join(__dirname, "..", "uploads"); // fallback for local dev without disk

// Ensure directory exists for fallback storage
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Multer storage configuration - uses memory storage for S3, disk storage for local fallback
 */
const storage = isS3Configured() 
  ? multer.memoryStorage() // Store in memory for S3 upload
  : multer.diskStorage({
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

  try {
    let storedName;
    let uploadResult;

    if (isS3Configured()) {
      // Upload to S3
      const ts = Date.now();
      const safe = (req.file.originalname || "file")
        .toString()
        .replace(/[^\w.\-]+/g, "_")
        .slice(0, 180);
      storedName = `${ts}__${safe}`;
      
      uploadResult = await uploadToS3(req.file, storedName);
      
      if (!uploadResult.success) {
        return res.status(500).json({ 
          message: "Upload failed", 
          error: uploadResult.error 
        });
      }
    } else {
      // Fallback to local storage
      storedName = req.file.filename;
      uploadResult = { success: true };
    }

    return res.json({
      ok: true,
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storedName, // save this in DB
        storageType: isS3Configured() ? 's3' : 'local',
        // If you want to maintain backward compat with existing fields:
        // legacyPath: `/uploads/${storedName}` // NOT publicly exposed
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
