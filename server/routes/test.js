// server/routes/test.js

const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createTest,
  getAllTests,
  getPublicTest,
  cancelTest,
  rescheduleTest,
  registerForTest,
  checkRegistration
} = require('../controllers/testController');
const { getPublicTests } = require('../controllers/publicTestController');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const upload = multer({ dest: 'uploads/' });

// --- Public "open tests" list ---
router.get('/public', getPublicTests);

// --- Public single test by unique share link ---
router.get('/public/:uniqueId', getPublicTest);

// --- Upload answer key PDF, extract via Python microservice ---
router.post('/upload-answers', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), req.file.originalname);
    if (req.body.max_q) form.append('max_q', req.body.max_q);

    const resp = await axios.post('http://localhost:8001/extract', form, {
      headers: form.getHeaders(),
      timeout: 30000
    });

    fs.unlinkSync(filePath);
    res.json(resp.data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to extract answers' });
  }
});

// --- Protected test management (login required) ---
router.post('/',              authMiddleware, createTest);
router.get('/',               authMiddleware, getAllTests);
router.patch('/:id/cancel',   authMiddleware, cancelTest);
router.patch('/:id/reschedule', authMiddleware, rescheduleTest);
router.post('/:id/register', authMiddleware, registerForTest);
router.get('/registered/:id', authMiddleware, checkRegistration);
module.exports = router;
