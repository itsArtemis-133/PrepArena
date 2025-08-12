// server/controllers/testController.js
const { v4: uuidv4 } = require("uuid");
const Test = require("../models/Test");
let Submission;
try { Submission = require("../models/Submission"); } catch {}

// helpers
const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const shape = (doc, userId = null) => {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    _id: d._id,
    link: d.link || "",
    title: d.title || "",
    description: d.description || "",
    subject: d.subject || "",
    type: d.type || "",
    testMode: d.testMode || "",
    duration: d.duration ?? null,
    questionCount: d.questionCount ?? null,
    scheduledDate: d.scheduledDate || null,
    status: d.status || "Scheduled",
    isPublic: !!d.isPublic,
    pdfUrl: d.pdfUrl || "",
    createdBy: d.createdBy
      ? (typeof d.createdBy === "object"
          ? { _id: String(d.createdBy._id || d.createdBy), username: d.createdBy.username || "" }
          : { _id: String(d.createdBy), username: "" })
      : null,
    isCreator: userId ? String(d.createdBy) === String(userId) : false,
  };
};

// POST /api/test
exports.createTest = async (req, res, next) => {
  try {
    const {
      title, description, subject, type, testMode,
      scheduledDate, duration, questionCount, isPublic = false,
      pdfUrl, answerKey,
    } = req.body;

    const doc = await Test.create({
      title: title?.trim(),
      description: description || "",
      subject: subject || "",
      type: type || "",
      testMode: testMode || "",
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      duration: n(duration),
      questionCount: n(questionCount),
      isPublic: !!isPublic,
      pdfUrl: pdfUrl || "",
      answerKey: answerKey || {},
      link: uuidv4(),
      createdBy: req.user?.id || null,
      registrations: req.user?.id ? [req.user.id] : [],
      status: "Scheduled",
    });

    res.status(201).json({ test: shape(doc, req.user?.id) });
  } catch (err) { next(err); }
};

// GET /api/test (my tests)
exports.getMyTests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const q = { createdBy: req.user?.id };
    if (status) q.status = status;
    const docs = await Test.find(q).sort({ scheduledDate: 1, createdAt: -1 }).populate("createdBy", "username");
    res.json({ tests: docs.map(d => shape(d, req.user?.id)) });
  } catch (err) { next(err); }
};

// GET /api/test/public
exports.getPublicTests = async (req, res) => {
  try {
    const now = new Date();
    const docs = await Test.find({
      isPublic: true,
      $or: [
        { scheduledDate: { $exists: false } },
        { scheduledDate: null },
        { scheduledDate: { $gte: now } },
      ],
    })
      .sort({ scheduledDate: 1, createdAt: -1 })
      .populate("createdBy", "username");

    res.json({ tests: docs.map(d => shape(d, req.user?.id)) });
  } catch (err) {
    console.error("getPublicTests error:", err);
    res.json({ tests: [] }); // never 500 the dashboard
  }
};

// GET /api/test/public/:link
exports.getPublicTest = async (req, res, next) => {
  try {
    const doc = await Test.findOne({ link: req.params.link }).populate("createdBy", "username");
    if (!doc) return res.status(404).json({ message: "Test not found" });
    res.json({ test: shape(doc, req.user?.id) });
  } catch (err) { next(err); }
};

// GET /api/test/registered/:link
exports.checkRegistration = async (req, res) => {
  try {
    const test = await Test.findOne({ link: req.params.link });
    if (!test) return res.status(404).json({ message: "Test not found" });
    const uid = req.user?.id;
    if (!uid) return res.json({ registered: false });
    if (String(test.createdBy) === String(uid)) return res.json({ registered: true });
    const registered = Array.isArray(test.registrations)
      ? test.registrations.some(id => String(id) === String(uid))
      : false;
    res.json({ registered });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/test/:link/register
exports.registerForTest = async (req, res) => {
  try {
    const test = await Test.findOne({ link: req.params.link });
    if (!test) return res.status(404).json({ message: "Test not found" });
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });
    if (!Array.isArray(test.registrations)) test.registrations = [];
    if (!test.registrations.some(id => String(id) === String(uid))) {
      test.registrations.push(uid);
      await test.save();
    }
    res.json({ ok: true, registered: true });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/test/:id/submit
exports.submitAnswers = async (req, res) => {
  try {
    if (!Submission) return res.json({ ok: true }); // soft fallback if model missing
    const { id } = req.params;
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    await Submission.findOneAndUpdate(
      { testId: id, userId: uid },
      { $set: { answers: req.body.answers || {}, submittedAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
