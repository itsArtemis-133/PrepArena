// server/models/Feedback.js
const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const FeedbackSchema = new Schema(
  {
    testId: { type: Types.ObjectId, ref: "Test", required: true, index: true },
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true }, // rater
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

// Only one rating per user per test
FeedbackSchema.index({ testId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", FeedbackSchema);
