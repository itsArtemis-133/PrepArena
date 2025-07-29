// server/controllers/publicTestController.js

const Test = require('../models/Test');

/**
 * GET /api/test/public
 * List all open/public tests scheduled from now onwards,
 * sorted by scheduledDate ascending.
 */
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

/**
 * GET /api/test/public/:uniqueId
 * Fetch a single public test by its share-link (the `link` field).
 */
exports.getPublicTest = async (req, res, next) => {
  try {
    const test = await Test.findOne({ link: req.params.uniqueId })
      .populate('createdBy', 'username rating ratersCount');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json({ test });
  } catch (err) {
    next(err);
  }
};
