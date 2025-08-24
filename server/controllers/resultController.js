// server/controllers/resultController.js
const Result = require('../models/Result');

// @desc    Get recent results for the logged-in user (paginated)
// @route   GET /api/test/results/recent?limit=&page=
// @access  Private
exports.getRecentResults = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5));
    const page  = Math.max(1, Number(req.query.page) || 1);
    const skip  = (page - 1) * limit;

    const [results, total] = await Promise.all([
      Result.find({ user: userId })
        .sort({ takenAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Result.countDocuments({ user: userId }),
    ]);

    res.json({ results, total, page, limit });
  } catch (err) {
    next(err);
  }
};
