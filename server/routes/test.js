// server/routes/test.js
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

// Public “open tests” list
router.get('/public', getPublicTests);

// Public single test by link
router.get('/public/:uniqueId', getPublicTest);

// Protected test management
router.post('/',            authMiddleware, createTest);
router.get('/',             authMiddleware, getAllTests);
router.patch('/:id/cancel', authMiddleware, cancelTest);
router.patch('/:id/reschedule', authMiddleware, rescheduleTest);

module.exports = router;
