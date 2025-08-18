// server/models/Feedback.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const FeedbackSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    rating: { type: Number, min: 1, max: 5, default: null }, // allow null for “cleared”
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

FeedbackSchema.index({ testId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", FeedbackSchema);
