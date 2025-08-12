// server/models/Test.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const TestSchema = new Schema(
  {
    title:         { type: String, required: true, trim: true },
    description:   { type: String, default: "" },
    subject:       { type: String, default: "" },
    type:          { type: String, default: "" },
    testMode:      { type: String, default: "" },
    duration:      { type: Number, default: null },
    questionCount: { type: Number, default: null },
    scheduledDate: { type: Date,   default: null },
    status:        { type: String, default: "Scheduled" },

    isPublic:      { type: Boolean, default: false },
    pdfUrl:        { type: String, default: "" },

    answerKey:     { type: Schema.Types.Mixed, default: {} },
    link:          { type: String, required: true, unique: true, index: true },

    createdBy:     { type: Schema.Types.ObjectId, ref: "User" },
    registrations: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", TestSchema);
