const path = require("path");

// Returns { url: "/uploads/filename.pdf" }
// server/controllers/uploadController.js
exports.handleUpload = (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  // Public URL:
  const url = `/uploads/${req.file.filename}`;
  return res.json({ url });
};

