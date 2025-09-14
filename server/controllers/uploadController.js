const path = require("path");
const fs = require("fs");
const s3Service = require("../config/s3");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");

// Ensure local uploads dir exists if not using S3
if (!s3Service.isConfigured) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Handle PDF upload (S3 or local).
 * Expects `req.file` from multer.
 */
exports.handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (s3Service.isConfigured) {
      // Upload to S3
      const result = await s3Service.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      return res.json({
        ok: true,
        key: result.key,   // ✅ Save this in DB
        url: result.url,   // For preview/debug
        bucket: result.bucket,
      });
    } else {
      // Local fallback
      const safeName = (req.file.originalname || "file")
        .replace(/[^\w.\-]+/g, "_")
        .slice(0, 180);
      const storedName = `${Date.now()}__${safeName}`;
      const filePath = path.join(UPLOAD_DIR, storedName);

      fs.writeFileSync(filePath, req.file.buffer);

      return res.json({
        ok: true,
        key: `uploads/${storedName}`,   // ✅ Save this in DB
        url: `/uploads/${storedName}`,  // Local preview
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      message: "Upload failed",
      error: error.message,
    });
  }
};
