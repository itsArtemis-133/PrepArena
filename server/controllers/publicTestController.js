// server/controllers/publicTestController.js
const Test = require('../models/Test');

// List all open (public) tests
exports.getPublicTests = async (req, res, next) => {
  try {
    const now = new Date();
    const tests = await Test.find({
      isPublic: true,
      scheduledDate: { $gte: now }
    })
      .sort({ scheduledDate: 1 })
      .populate('createdBy', 'username rating ratersCount');
    res.json({ tests });
  } catch (err) {
    next(err);
  }
};
