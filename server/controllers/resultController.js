// server/controllers/resultController.js
const Result = require('../models/Result');

// @desc    Get recent results for the logged-in user
// @route   GET /api/test/results/recent
// @access  Private
exports.getRecentResults = async (req, res, next) => {
  try {
    // Grab the 5 most recent results for this user
    const results = await Result.find({ user: req.user.id })
      .sort({ takenAt: -1 })
      .limit(5);
    res.json({ results });
  } catch (err) {
    next(err);
  }
};
