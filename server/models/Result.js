// server/models/Result.js
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testLink:  { type: String,   required: true },   // the Test.link
  testTitle: { type: String,   required: true },
  score:     { type: Number,   required: true },
  total:     { type: Number,   required: true },
  takenAt:   { type: Date,     default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
