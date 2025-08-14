// server/controllers/testController.js
const { v4: uuidv4 } = require("uuid");
const Test = require("../models/Test");
let Submission;
try { Submission = require("../models/Submission"); } catch {}

/** ---------------- helpers ---------------- */
const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

const computeWindow = (d) => {
  const start = d?.scheduledDate ? new Date(d.scheduledDate).getTime() : null;
  const end   = start && n(d?.duration) ? start + n(d.duration) * 60 * 1000 : null;
  const now   = Date.now();
  return {
    isUpcoming: !!(start && now < start),
    isLive:     !!(start && end && now >= start && now < end),
    isCompleted:!!(end && now >= end),
  };
};

const shape = (doc, userId = null) => {
  const d = doc?.toObject ? doc.toObject() : doc;
  const w = computeWindow(d);

  const createdBy =
    d?.createdBy && typeof d.createdBy === "object"
      ? { _id: String(d.createdBy._id || d.createdBy), username: d.createdBy.username || d.createdBy.name || "" }
      : d?.createdBy ? { _id: String(d.createdBy), username: "" } : null;

  const creatorId =
    d?.createdBy && typeof d.createdBy === "object"
      ? String(d.createdBy._id || d.createdBy)
      : String(d?.createdBy || "");

  return {
    _id: d?._id,
    link: d?.link || "",
    title: d?.title || "",
    description: d?.description || "",
    syllabus: d?.syllabus || "",
    subject: d?.subject || "",
    type: d?.type || "",
    testMode: d?.testMode || "",
    duration: n(d?.duration),
    questionCount: n(d?.questionCount),
    scheduledDate: d?.scheduledDate || null,
    status: d?.status || "Scheduled",
    isPublic: !!d?.isPublic,
    pdfUrl: d?.pdfUrl || "",
    createdBy,
    isCreator: userId ? creatorId === String(userId) : false,
    registrationCount: Array.isArray(d?.registrations) ? d.registrations.length : 0,
    window: w, // { isUpcoming, isLive, isCompleted }
  };
};

/** ---------------- controllers ---------------- */

// POST /api/test
exports.createTest = async (req, res, next) => {
  try {
    const {
      title, description, syllabus, subject, type, testMode,
      scheduledDate, duration, questionCount, isPublic = false,
      pdfUrl, answerKey,
    } = req.body;

    const userId = req.user?.id || null;

    const doc = await Test.create({
      title: title?.trim() || "",
      description: description || "",
      syllabus: syllabus || "",
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
      createdBy: userId,
      registrations: userId ? [userId] : [],
      status: "Scheduled",
    });

    res.status(201).json({ test: shape(doc, userId) });
  } catch (err) { next(err); }
};

// GET /api/test  (?status=Scheduled&scope=created|registered|all)
exports.getMyTests = async (req, res, next) => {
  try {
    const { status, scope = "created" } = req.query;
    const uid = req.user?.id;

    const base = {};
    if (status) base.status = status;

    let q;
    if (scope === "registered") {
      q = { ...base, registrations: uid };
    } else if (scope === "all") {
      q = { ...base, $or: [{ createdBy: uid }, { registrations: uid }] };
    } else {
      q = { ...base, createdBy: uid };
    }

    const docs = await Test.find(q)
      .sort({ scheduledDate: 1, createdAt: -1 })
      .populate("createdBy", "username name");

    res.json({ tests: docs.map((d) => shape(d, uid)) });
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
      .populate("createdBy", "username name");

    res.json({ tests: docs.map((d) => shape(d, req.user?.id)) });
  } catch (err) {
    console.error("getPublicTests error:", err);
    res.json({ tests: [] });
  }
};

// GET /api/test/public/:link
exports.getPublicTest = async (req, res, next) => {
  try {
    const doc = await Test.findOne({ link: req.params.link }).populate("createdBy", "username name");
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
    if (!uid) return res.json({ registered: false, isCreator: false });

    const isCreator = String(test.createdBy) === String(uid);
    const registered =
      isCreator ||
      (Array.isArray(test.registrations)
        ? test.registrations.some((id) => String(id) === String(uid))
        : false);

    res.json({ registered, isCreator });
  } catch (err) {
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
    if (!test.registrations.some((id) => String(id) === String(uid))) {
      test.registrations.push(uid);
      await test.save();
    }

    res.json({ ok: true, registered: true, registrationCount: test.registrations.length });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/test/:id/submit
exports.submitAnswers = async (req, res) => {
  try {
    if (!Submission) return res.json({ ok: true });
    const { id } = req.params;
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    await Submission.findOneAndUpdate(
      { testId: id, userId: uid },
      { $set: { answers: req.body.answers || {}, submittedAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/test/:id/leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    if (!Submission) return res.json({ results: [] });

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    const key = test.answerKey || {};
    const total = Object.keys(key).length;

    const subs = await Submission.find({ testId: req.params.id })
      .populate("userId", "name username")
      .lean();

    const scored = subs
      .map((s) => {
        const answers = s.answers || {};
        let score = 0;
        for (const q in key) {
          if (
            answers[q] &&
            String(answers[q]).toUpperCase() === String(key[q]).toUpperCase()
          ) score++;
        }
        return {
          _id: s._id,
          user: { _id: s.userId?._id, name: s.userId?.name || s.userId?.username || "—" },
          score,
          total,
          submittedAt: s.submittedAt,
        };
      })
      .sort((a, b) => b.score - a.score || new Date(a.submittedAt) - new Date(b.submittedAt));

    res.json({ results: scored.slice(0, 50) });
  } catch {
    res.json({ results: [] });
  }
};

// GET /api/test/:id/solution
exports.getSolution = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    const w = computeWindow(test);
    if (!w.isCompleted) return res.json({ available: false, answerKey: {} });

    res.json({ available: true, answerKey: test.answerKey || {} });
  } catch {
    res.json({ available: false, answerKey: {} });
  }
};
