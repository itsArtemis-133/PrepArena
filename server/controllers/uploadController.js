const path = require("path");

// Returns { url: "/uploads/filename.pdf" }
exports.handleUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  // Build the public URL
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
};
