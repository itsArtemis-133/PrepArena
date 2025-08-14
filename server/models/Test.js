// server/models/Test.js
const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema(
  {
    title: String,
    description: { type: String, default: "" },
    syllabus:    { type: String, default: "" },
    subject: String,
    type: String,
    testMode: String,
    duration: Number,
    questionCount: Number,
    scheduledDate: Date,
    status: { type: String, default: "Scheduled" },
    isPublic: { type: Boolean, default: false },
    pdfUrl: { type: String, default: "" },
    answerKey: { type: Object, default: {} },
    link: { type: String, unique: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    registrations: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", TestSchema);
