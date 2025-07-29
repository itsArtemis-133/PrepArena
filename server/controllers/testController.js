// server/controllers/testController.js

const Test   = require('../models/Test');
const Result = require('../models/Result');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/test
 * Creates a new test.
 */
exports.createTest = async (req, res, next) => {
  try {
    const {
      title,
      description,
      pdfUrl,
      duration,
      questionCount,
      type,
      testMode,
      scheduledDate,
      isPublic
    } = req.body;

    if (!title || !pdfUrl || !duration || !questionCount) {
      return res.status(400).json({
        message: 'Title, PDF URL, duration and question count are required'
      });
    }

    const link = uuidv4();
    const test = await Test.create({
      title,
      description: description || '',
      pdfUrl,
      duration,
      questionCount,
      type: type || '',
      testMode: testMode || '',
      scheduledDate,
      status: 'Scheduled',
      isPublic: !!isPublic,
      createdBy: req.user.id,
      link
    });

    res.status(201).json({ test });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/test
 * Returns all tests created by the logged-in user.
 * Optional query: ?status=Scheduled|Cancelled|Completed
 */
exports.getAllTests = async (req, res, next) => {
  try {
    const filter = { createdBy: req.user.id };
    if (req.query.status) filter.status = req.query.status;

    const tests = await Test.find(filter)
      .sort({ scheduledDate: 1 })
      .populate('createdBy', 'username rating ratersCount');

    res.json({ tests });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/test/:id
 * (Optional) Fetch a single test by ID for its creator.
 */
exports.getTestById = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('createdBy', 'username rating ratersCount');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    // ensure only creator can fetch
    if (test.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/test/:id/cancel
 */
exports.cancelTest = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    test.status = 'Cancelled';
    await test.save();
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/test/:id/reschedule
 */
exports.rescheduleTest = async (req, res, next) => {
  try {
    const { scheduledDate } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    test.scheduledDate = scheduledDate;
    await test.save();
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/test/:id/submit
 * Records a user's answers and returns their result.
 */
exports.submitTest = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Simple scoring: full marks
    const total = test.questionCount;
    const score = total;

    const result = await Result.create({
      user:      req.user.id,
      testLink:  test.link,
      testTitle: test.title,
      score,
      total
    });

    res.json({ result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/test/:id/results
 * Returns the logged-in user's latest result for this test.
 */
exports.getMyResults = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const results = await Result.find({
      user:     req.user.id,
      testLink: test.link
    })
      .sort('-createdAt')
      .limit(1);

    res.json({ results });
  } catch (err) {
    next(err);
  }
};
