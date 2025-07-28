// server/routes/upload.js
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const protect = require('../middleware/authMiddleware');       // import the middleware function
const { handleUpload } = require('../controllers/uploadController');

const router = express.Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${name}${ext}`);
  }
});

const upload = multer({ storage });

// @route   POST /api/upload
// @desc    Upload a single PDF or answer-key file
// @access  Private
router.post(
  '/',
  protect,
  upload.single('file'),
  handleUpload
);

module.exports = router;
