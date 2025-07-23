const mongoose = require("mongoose");


const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["Prelims", "Mains"], required: true },
  testMode: {
    type: String,
    enum: ["Subject Test", "Complete Test"],
    required: true
  },
  testLength: {
    type: String,
    enum: ["Full Length Test", "Half Length Test"],
    required: true
  },
  scheduledDate: { type: Date, required: true },
  pdf: { type: String, default: "" },
  status: { type: String, enum: ["Scheduled", "Cancelled", "Completed"], default: "Scheduled" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  link: { type: String }
}, { timestamps: true });


module.exports = mongoose.model("Test", testSchema);
