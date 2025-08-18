// server/controllers/feedbackController.js
const mongoose = require("mongoose");
const Test = require("../models/Test");

// Optional models (app should still run if they’re absent during local dev)
let Submission;
try { Submission = require("../models/Submission"); } catch {}
let Feedback;
try { Feedback = require("../models/Feedback"); } catch {}

/** ---------- helpers ---------- */
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

/** ---------- controllers ---------- */

// GET /api/test/:id/feedback  (optional auth)
// -> { avg, count, my }
exports.getFeedback = async (req, res) => {
  try {
    if (!Feedback) return res.json({ avg: 0, count: 0, my: null });

    const { id } = req.params;
    const uid = req.user?.id || null;
    const objId = new mongoose.Types.ObjectId(id);

    // Aggregate avg & count for non-null ratings
    const [agg] = await Feedback.aggregate([
      { $match: { testId: objId, rating: { $ne: null } } },
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$rating" } } },
    ]);

    let my = null;
    if (uid) {
      my = await Feedback.findOne({ testId: id, userId: uid }).lean();
    }

    const avg = agg?.avg ? Math.round(agg.avg * 10) / 10 : 0;
    const count = agg?.count || 0;

    res.json({ avg, count, my });
  } catch (err) {
    res.json({ avg: 0, count: 0, my: null });
  }
};

// POST /api/test/:id/feedback  (require auth)
// body: { rating (1..5 or null), comment }
exports.upsertFeedback = async (req, res) => {
  try {
    if (!Feedback) return res.status(501).json({ message: "Feedback not enabled" });

    const { id } = req.params;
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const test = await Test.findById(id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    const w = computeWindow(test);
    if (!w.isCompleted) return res.status(400).json({ message: "Feedback opens only after completion" });

    // Only participants (creator / registered / submitted) can rate
    const isCreator = String(test.createdBy) === String(uid);
    const wasRegistered = Array.isArray(test.registrations) && test.registrations.some((x) => String(x) === String(uid));
    const hasSubmission = Submission ? await Submission.exists({ testId: id, userId: uid }) : false;

    if (!(isCreator || wasRegistered || hasSubmission)) {
      return res.status(403).json({ message: "Only participants can leave feedback" });
    }

    const { rating, comment } = req.body;

    // Clear if rating is null/undefined
    if (rating === null || rating === undefined) {
      await Feedback.deleteOne({ testId: id, userId: uid });
      return res.json({ ok: true, cleared: true });
    }

    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(422).json({ message: "Invalid rating" });
    }

    const doc = await Feedback.findOneAndUpdate(
      { testId: id, userId: uid },
      { $set: { rating: r, comment: String(comment || "") } },
      { upsert: true, new: true }
    );

    res.json({ ok: true, feedback: doc });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/test/:id/feedback  (require auth)
exports.deleteFeedback = async (req, res) => {
  try {
    if (!Feedback) return res.status(501).json({ message: "Feedback not enabled" });

    const { id } = req.params;
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const test = await Test.findById(id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    await Feedback.deleteOne({ testId: id, userId: uid });
    res.json({ ok: true, cleared: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
