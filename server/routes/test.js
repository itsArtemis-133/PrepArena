const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createTest,
  getAllTests,
  getPublicTest,
  cancelTest,
  rescheduleTest
} = require('../controllers/testController');
const { getPublicTests } = require('../controllers/publicTestController');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const upload = multer({ dest: 'uploads/' });

// ... other routes ...

router.post('/upload-answers', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), req.file.originalname);
    // add max_q only if you use it in Flask (optional)
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

module.exports = router;
