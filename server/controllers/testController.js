const { v4: uuidv4 } = require("uuid");
const Test = require("../models/Test");
const User = require("../models/User");

let Submission;
try {
  Submission = require("../models/Submission");
} catch {}

/** ---------------- constants ---------------- */
const CREATOR_PROJECTION =
  "username name creatorRatingAvg creatorRatingCount";

/** ---------------- helpers ---------------- */
const n = (v) =>
  Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;

const computeWindow = (d) => {
  const start = d?.scheduledDate ? new Date(d.scheduledDate).getTime() : null;
  const end =
    start && n(d?.duration) ? start + n(d.duration) * 60 * 1000 : null;
  const now = Date.now();
  return {
    isUpcoming: !!(start && now < start),
    isLive: !!(start && end && now >= start && now < end),
    isCompleted: !!(end && now >= end),
  };
};

const shape = (doc, userId = null) => {
  const d = doc?.toObject ? doc.toObject() : doc;
  const w = computeWindow(d);

  const createdBy =
    d?.createdBy && typeof d.createdBy === "object"
      ? {
          _id: String(d.createdBy._id || d.createdBy),
          username: d.createdBy.username || d.createdBy.name || "",
          creatorRatingAvg: d.createdBy.creatorRatingAvg || 0,
          creatorRatingCount: d.createdBy.creatorRatingCount || 0,
        }
      : d?.createdBy
      ? {
          _id: String(d.createdBy),
          username: "",
          creatorRatingAvg: 0,
          creatorRatingCount: 0,
        }
      : null;

  const creatorId =
    d?.createdBy && typeof d.createdBy === "object"
      ? String(d.createdBy._id || d.createdBy)
      : String(d?.createdBy || "");

  const userRegistered =
    userId && Array.isArray(d?.registrations)
      ? d.registrations.some((id) => String(id) === String(userId))
      : false;

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
    answersPdfUrl: d?.answersPdfUrl || "",
    createdBy,
    isCreator: userId ? creatorId === String(userId) : false,
    isRegistered: userRegistered,
    registrationCount: Array.isArray(d?.registrations)
      ? d.registrations.length
      : 0,
    window: w,
  };
};

/** ---------------- controllers ---------------- */

// POST /api/test
exports.createTest = async (req, res, next) => {
  try {
    const {
      title,
      description,
      syllabus,
      subject,
      type,
      testMode,
      scheduledDate,
      duration,
      questionCount,
      isPublic = false,
      pdfUrl,
      answersPdfUrl,
      answerKey,
    } = req.body;

    // ✅ Map filenames (storedName) -> existing url fields (back-compat friendly)
    const pdfFilename = req.body?.pdfFilename || "";
    const answersPdfFilename = req.body?.answersPdfFilename || "";

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

      // Store the storedName in these existing fields (your streamers already handle it)
      pdfUrl: pdfFilename || pdfUrl || "",
      answersPdfUrl: answersPdfFilename || answersPdfUrl || "",

      answerKey: answerKey || {},
      link: uuidv4(),
      createdBy: userId,
      registrations: [], // creator NOT auto-registered
      status: "Scheduled",
    });

    res.status(201).json({ test: shape(doc, userId) });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/test/:id
exports.updateTest = async (req, res) => {
  try {
    const uid = req.user?.id;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    if (String(test.createdBy) !== String(uid)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const w = computeWindow(test);
    if (!w.isUpcoming) {
      return res.status(400).json({ message: "Cannot modify after start" });
    }

    // ✅ Accept filenames and map to existing fields if provided
    if (req.body?.pdfFilename && !req.body.pdfUrl) {
      req.body.pdfUrl = req.body.pdfFilename;
    }
    if (req.body?.answersPdfFilename && !req.body.answersPdfUrl) {
      req.body.answersPdfUrl = req.body.answersPdfFilename;
    }

    const allowed = [
      "title",
      "description",
      "syllabus",
      "subject",
      "type",
      "testMode",
      "scheduledDate",
      "duration",
      "questionCount",
      "isPublic",
      "pdfUrl",
      "answersPdfUrl",
    ];
    allowed.forEach((k) => {
      if (k in req.body) {
        if (k === "scheduledDate")
          test[k] = req.body[k] ? new Date(req.body[k]) : null;
        else if (k === "duration" || k === "questionCount")
          test[k] = n(req.body[k]);
        else test[k] = req.body[k];
      }
    });

    await test.save();
    res.json({ test: shape(test, uid) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/test
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
      .populate("createdBy", CREATOR_PROJECTION);

    res.json({ tests: docs.map((d) => shape(d, uid)) });
  } catch (err) {
    next(err);
  }
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
      .populate("createdBy", CREATOR_PROJECTION);

    res.json({ tests: docs.map((d) => shape(d, req.user?.id)) });
  } catch (err) {
    console.error("getPublicTests error:", err);
    res.json({ tests: [] });
  }
};

// GET /api/test/public/:link
exports.getPublicTest = async (req, res, next) => {
  try {
    const doc = await Test.findOne({ link: req.params.link }).populate(
      "createdBy",
      CREATOR_PROJECTION
    );
    if (!doc) return res.status(404).json({ message: "Test not found" });
    res.json({ test: shape(doc, req.user?.id) });
  } catch (err) {
    next(err);
  }
};

// GET /api/test/registered/:link
exports.checkRegistration = async (req, res) => {
  try {
    const test = await Test.findOne({ link: req.params.link });
    if (!test) return res.status(404).json({ message: "Test not found" });

    const uid = req.user?.id;
    if (!uid) return res.json({ registered: false, isCreator: false, hasSubmitted: false });

    const isCreator = String(test.createdBy) === String(uid);
    const registered =
      Array.isArray(test.registrations) &&
      test.registrations.some((id) => String(id) === String(uid));

    // Check if user has already submitted
    let hasSubmitted = false;
    if (Submission) {
      try {
        const submission = await Submission.findOne({
          testId: test._id,
          userId: uid
        });
        hasSubmitted = !!submission;
      } catch (err) {
        console.warn("Error checking submission:", err);
      }
    }

    res.json({ registered, isCreator, hasSubmitted });
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

    res.json({
      ok: true,
      registered: true,
      registrationCount: test.registrations.length,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/test/:link/unregister
exports.unregisterForTest = async (req, res) => {
  try {
    const test = await Test.findOne({ link: req.params.link });
    if (!test) return res.status(404).json({ message: "Test not found" });

    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const w = computeWindow(test);

    // Block only if live or completed (unscheduled is allowed)
    if (w.isLive || w.isCompleted) {
      return res
        .status(400)
        .json({ message: "Cannot unregister during or after the test" });
    }

    if (!Array.isArray(test.registrations)) test.registrations = [];
    const before = test.registrations.length;

    // Remove user if present (idempotent)
    test.registrations = test.registrations.filter(
      (id) => String(id) !== String(uid)
    );
    if (test.registrations.length !== before) {
      await test.save();
    }

    return res.json({
      ok: true,
      registered: false,
      registrationCount: test.registrations.length,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/test/:id/submit
exports.submitAnswers = async (req, res) => {
  try {
    if (!Submission) return res.json({ ok: true });
    const { id } = req.params;
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const test = await Test.findById(id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    const w = computeWindow(test);
    if (!w.isLive) {
      return res.status(403).json({ message: "Submission closed" });
    }

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
    if (!Submission)
      return res.json({ results: [], total: 0, page: 1, limit: 25 });

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    const key = test.answerKey || {};
    const keys = Object.keys(key).sort((a, b) => Number(a) - Number(b));
    const totalQuestions = keys.length;
    const MARK_CORRECT = 2; // UPSC GS: +2
    const MARK_WRONG = -2 / 3; // UPSC GS: -0.666...

    const subs = await Submission.find({ testId: req.params.id })
      .populate("userId", "name username")
      .lean();

    const scored = subs
      .map((s) => {
        const answers = s.answers || {};
        let score = 0;
        let attempted = 0;

        for (const q of keys) {
          const correct = String(key[q]).toUpperCase();
          const marked = answers[q] ? String(answers[q]).toUpperCase() : null;
          if (marked) {
            attempted++;
            if (marked === correct) score += MARK_CORRECT;
            else score += MARK_WRONG;
          }
        }

        return {
          _id: s._id,
          user: {
            _id: s.userId?._id,
            name: s.userId?.name || s.userId?.username || "—",
          },
          score: Number(score.toFixed(3)),
          total: totalQuestions * MARK_CORRECT, // total possible marks
          attempted,
          submittedAt: s.submittedAt,
        };
      })
      // Higher score first; tie-breaker: earlier submission wins
      .sort(
        (a, b) =>
          b.score - a.score ||
          new Date(a.submittedAt) - new Date(b.submittedAt)
      );

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const start = (page - 1) * limit;
    const paged = scored.slice(start, start + limit);

    res.json({ results: paged, total: scored.length, page, limit });
  } catch {
    res.json({ results: [], total: 0, page: 1, limit: 25 });
  }
};

// GET /api/test/:id/leaderboard.csv
exports.getLeaderboardCsv = async (req, res) => {
  try {
    if (!Submission) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=leaderboard.csv"
      );
      return res.send("rank,user,score,total,attempted,submittedAt\n");
    }

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    const key = test.answerKey || {};
    const keys = Object.keys(key).sort((a, b) => Number(a) - Number(b));
    const totalQuestions = keys.length;
    const MARK_CORRECT = 2; // UPSC GS
    const MARK_WRONG = -2 / 3; // UPSC GS

    const subs = await Submission.find({ testId: req.params.id })
      .populate("userId", "name username")
      .lean();

    const scored = subs
      .map((s) => {
        const answers = s.answers || {};
        let score = 0;
        let attempted = 0;

        for (const q of keys) {
          const correct = String(key[q]).toUpperCase();
          const marked = answers[q] ? String(answers[q]).toUpperCase() : null;
          if (marked) {
            attempted++;
            if (marked === correct) score += MARK_CORRECT;
            else score += MARK_WRONG;
          }
        }

        return {
          user: s.userId?.name || s.userId?.username || "—",
          score: Number(score.toFixed(3)),
          total: totalQuestions * MARK_CORRECT,
          attempted,
          submittedAt: s.submittedAt
            ? new Date(s.submittedAt).toISOString()
            : "",
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          new Date(a.submittedAt) - new Date(b.submittedAt)
      );

    let csv = "rank,user,score,total,attempted,submittedAt\n";
    scored.forEach((row, idx) => {
      csv += `${idx + 1},"${String(row.user).replace(/"/g, '""')}",${
        row.score
      },${row.total},${row.attempted},${row.submittedAt}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment: filename=leaderboard.csv"
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/test/:id/results/me
exports.getMyResult = async (req, res) => {
  try {
    if (!Submission) return res.json({ available: false });

    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    const w = computeWindow(test);
    if (!w.isCompleted) return res.json({ available: false });

    const sub = await Submission.findOne({
      testId: req.params.id,
      userId: uid,
    }).lean();
    if (!sub) return res.json({ available: false });

    const key = test.answerKey || {};
    const answers = sub.answers || {};
    const keys = Object.keys(key).sort((a, b) => Number(a) - Number(b));
    const zeroIndexed = keys.includes("0");

    const MARK_CORRECT = 2; // UPSC GS
    const MARK_WRONG = -2 / 3; // UPSC GS

    let score = 0;
    let attempted = 0;
    const details = keys.map((q) => {
      const correct = String(key[q]).toUpperCase();
      const marked = answers[q] ? String(answers[q]).toUpperCase() : null;
      let isCorrect = false;

      if (marked) {
        attempted++;
        if (marked === correct) {
          isCorrect = true;
          score += MARK_CORRECT;
        } else {
          score += MARK_WRONG;
        }
      }

      const displayQ = zeroIndexed ? Number(q) + 1 : Number(q);
      return { q: displayQ, marked, correct, isCorrect };
    });

    const totalMarks = keys.length * MARK_CORRECT;

    res.json({
      available: true,
      score: Number(score.toFixed(3)),
      total: totalMarks,
      attempted,
      submittedAt: sub.submittedAt || null,
      details,
    });
  } catch (err) {
    res.json({ available: false });
  }
};

// GET /api/test/:id/solution
exports.getSolution = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    const w = computeWindow(test);
    if (!w.isCompleted) {
      return res.status(403).json({ message: "Solutions available after test completion" });
    }

    const key = test.answerKey || {};
    const keys = Object.keys(key).sort((a, b) => Number(a) - Number(b));
    const zeroIndexed = keys.includes("0");

    const solutions = keys.map((q) => {
      const displayQ = zeroIndexed ? Number(q) + 1 : Number(q);
      return {
        question: displayQ,
        answer: String(key[q]).toUpperCase()
      };
    });

    res.json({
      available: true,
      solutions,
      totalQuestions: keys.length
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
