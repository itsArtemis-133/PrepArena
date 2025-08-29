// server/controllers/feedbackController.js
const Feedback = require("../models/Feedback");
const Test = require("../models/Test");
const User = require("../models/User");

/**
 * Adjust creator's denormalized rating aggregate on User.
 * op: "create" | "update" | "delete"
 */
async function adjustCreatorAggregate(creatorId, op, oldRating, newRating) {
  const creator = await User.findById(creatorId).select("creatorRatingAvg creatorRatingCount");
  if (!creator) return;

  let { creatorRatingAvg: avg, creatorRatingCount: count } = creator;

  if (op === "create") {
    const sum = avg * count + newRating;
    count += 1;
    avg = sum / count;
  } else if (op === "update") {
    const sum = avg * count - oldRating + newRating;
    avg = count > 0 ? sum / count : 0;
  } else if (op === "delete") {
    if (count <= 1) {
      avg = 0; count = 0;
    } else {
      const sum = avg * count - oldRating;
      count -= 1;
      avg = sum / count;
    }
  }

  await User.updateOne(
    { _id: creatorId },
    { $set: { creatorRatingAvg: Number(avg.toFixed(4)), creatorRatingCount: count } }
  );
}

/**
 * Utility: robustly read testId from either :id or :testId to match existing routes.
 */
function getTestId(req) {
  return req.params.id || req.params.testId;
}

/**
 * POST /test/:id/feedback  (create or update rating for this test by the current user)
 * Body: { rating: 1..5, comment?: string }
 * Enforces single feedback per (test,user). If rating changes, adjusts creator aggregate.
 */
exports.upsertFeedback = async function upsertFeedback(req, res) {
  try {
    const testId = getTestId(req);
    const { rating, comment = "" } = req.body;
    const raterId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const test = await Test.findById(testId).select("createdBy status");
    if (!test) return res.status(404).json({ message: "Test not found" });

    // If you gate ratings to "only after completion", keep your existing check here
    // await ensureUserCompletedTest(raterId, testId);

    const existing = await Feedback.findOne({ testId, userId: raterId }).lean();

    if (!existing) {
      await Feedback.create({ testId, userId: raterId, rating, comment });
      await adjustCreatorAggregate(test.createdBy, "create", null, rating);
    } else {
      const changedRating = existing.rating !== rating;
      if (changedRating || existing.comment !== comment) {
        await Feedback.updateOne({ _id: existing._id }, { $set: { rating, comment } });
        if (changedRating) {
          await adjustCreatorAggregate(test.createdBy, "update", existing.rating, rating);
        }
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    if (err?.code === 11000) {
      // unique index on (testId, userId)
      return res.status(409).json({ message: "Feedback already exists" });
    }
    console.error("upsertFeedback error", err);
    return res.status(500).json({ message: "Failed to save feedback" });
  }
};

/**
 * DELETE /test/:id/feedback  (delete current user's feedback for this test)
 */
exports.deleteFeedback = async function deleteFeedback(req, res) {
  try {
    const testId = getTestId(req);
    const raterId = req.user.id;

    const test = await Test.findById(testId).select("createdBy");
    if (!test) return res.status(404).json({ message: "Test not found" });

    const fb = await Feedback.findOne({ testId, userId: raterId });
    if (!fb) return res.status(404).json({ message: "Feedback not found" });

    await Feedback.deleteOne({ _id: fb._id });
    await adjustCreatorAggregate(test.createdBy, "delete", fb.rating, null);

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteFeedback error", err);
    return res.status(500).json({ message: "Failed to delete feedback" });
  }
};

/**
 * GET /test/:id/feedback  (list feedback for a test + summary + "my" feedback)
 * Kept for your Bridge view; returns { items, summary: { avg, count }, my }
 */
exports.listFeedbackForTest = async function listFeedbackForTest(req, res) {
  try {
    const testId = getTestId(req);
    const me = req.user?.id || null;

    const items = await Feedback.find({ testId })
      .select("userId rating comment createdAt")
      .populate("userId", "username name")
      .sort({ createdAt: -1 })
      .lean();

    let sum = 0;
    for (const x of items) sum += x.rating;
    const count = items.length;
    const avg = count ? Number((sum / count).toFixed(2)) : 0;

    const my = me ? items.find((x) => String(x.userId?._id || x.userId) === String(me)) : null;

    return res.json({
      items,
      summary: { avg, count },
      my: my ? { rating: my.rating, comment: my.comment } : null,
    });
  } catch (err) {
    console.error("listFeedbackForTest error", err);
    return res.status(500).json({ message: "Failed to load feedback" });
  }
};
