// server/controllers/announcementController.js
const announcements = require('../data/announcements.json');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Public
exports.getAnnouncements = (req, res) => {
  res.json({ announcements });
};
