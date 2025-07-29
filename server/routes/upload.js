// server/routes/upload.js

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const auth    = require('../middleware/authMiddleware');
const { handleUpload } = require('../controllers/uploadController');

// Configure Multer storage: files go to server/uploads/
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

// POST /api/upload
// Protected: user must be authenticated
// Single file field name: "file"
router.post('/', auth, upload.single('file'), handleUpload);

module.exports = router;
