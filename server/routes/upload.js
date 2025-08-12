// server/routes/upload.js
const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const stamp = Date.now();
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${stamp}-${safe}`);
  },
});
const upload = multer({ storage });

router.post("/upload", upload.single("file"), (req, res) => {
  const rel = `/uploads/${req.file.filename}`;
  res.json({ url: rel });
});

module.exports = router;
