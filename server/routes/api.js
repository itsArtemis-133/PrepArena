// server/routes/api.js
const express = require('express');
const router  = express.Router();
const protect             = require('../middleware/authMiddleware');
const { getRecentResults } = require('../controllers/resultController');
const { getAnnouncements } = require('../controllers/announcementController');

// Protected recent results
router.get('/test/results/recent', protect, getRecentResults);

// Public announcements
router.get('/announcements', getAnnouncements);

module.exports = router;
