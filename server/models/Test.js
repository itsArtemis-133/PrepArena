// server/models/Test.js
const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  description:   { type: String, default: '' },
  pdfUrl:        { type: String, required: true },
  duration:      { type: Number, required: true },     // minutes
  questionCount: { type: Number, required: true },     // bubbles
  subject:       { type: String, default: '' },
  type:          { type: String, default: '' },        // dynamic label
  testMode:      { type: String, default: '' },        // dynamic label


  scheduledDate: { type: Date, required: true },
  status:        { 
    type: String,
    enum: ['Scheduled','Cancelled','Completed'],
    default: 'Scheduled'
  },
  isPublic:      { type: Boolean, default: false },

  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registrations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  link:          { type: String, required: true, unique: true },
  answerKey: {
    type: Map,
    of: String,
    default: {},   // No problem for old records!
    required: false
  },
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
