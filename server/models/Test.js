// server/models/Test.js
const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  description:   { type: String, default: '' },
  pdfUrl:        { type: String, required: true },
  duration:      { type: Number, required: true },     // minutes
  questionCount: { type: Number, required: true },     // bubbles
  type:          { type: String, default: '' },        // dynamic label
  testMode:      { type: String, default: '' },        // dynamic label

  scheduledDate: { type: Date },
  status:        { 
    type: String,
    enum: ['Scheduled','Cancelled','Completed'],
    default: 'Scheduled'
  },
  isPublic:      { type: Boolean, default: false },

  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  link:          { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
