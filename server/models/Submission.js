// server/models/Submission.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const SubmissionSchema = new Schema({
  testId:   { type: Schema.Types.ObjectId, ref: "Test", required: true },
  userId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  answers:  { type: Schema.Types.Mixed, default: {} },
  submittedAt: { type: Date, default: Date.now },
});
SubmissionSchema.index({ testId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Submission", SubmissionSchema);
