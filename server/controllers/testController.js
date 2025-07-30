// server/controllers/testController.js
const Test        = require('../models/Test');
const { v4: uuidv4 } = require('uuid');

// Create a new test
exports.createTest = async (req, res, next) => {
  try {
    const {
      title, description, pdfUrl,
      duration, questionCount,
      type, testMode, scheduledDate, isPublic
    } = req.body;

    if (!title || !pdfUrl || !duration || !questionCount) {
      return res.status(400).json({
        message: 'Title, PDF URL, duration and question count are required'
      });
    }

    const link = uuidv4();
    const test = await Test.create({
      title,
      description,
      pdfUrl,
      duration,
      questionCount,
      type,
      testMode,
      scheduledDate,
      status: 'Scheduled',
      isPublic: !!isPublic,
      createdBy: req.user.id,
      link,
    });

    res.status(201).json({ test });
  } catch (err) {
    next(err);
  }
};

// Get all (protected) tests for this user, optional ?status=
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

// Get a public test by its share link
exports.getPublicTest = async (req, res, next) => {
  try {
    const test = await Test.findOne({ link: req.params.uniqueId })
      .populate('createdBy', 'username rating ratersCount');
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

// Cancel a test
exports.cancelTest = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    test.status = 'Cancelled';
    await test.save();
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

// Reschedule a test
exports.rescheduleTest = async (req, res, next) => {
  try {
    const { scheduledDate } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    test.scheduledDate = scheduledDate;
    await test.save();
    res.json({ test });
  } catch (err) {
    next(err);
  }
};

exports.submitAnswersController = async (req, res) => {
  const testId = req.params.id;
  const { answers } = req.body;
  const userId = req.user.id;
  // TODO: Validate, grade, store result
  res.json({ success: true, score: 42 }); // Dummy response
};

