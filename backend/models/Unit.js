const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  code:        { type: String, required: true, unique: true, trim: true, uppercase: true },
  name:        { type: String, required: true, trim: true },
  lecturer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', required: true },
  department:  { type: String, required: true },
  yearOfStudy: { type: Number, required: true, min: 1, max: 5 },
  semester:    { type: String, required: true }, // e.g. "2025/2026 Sem 1"
  students:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  // Attendance sessions created by the lecturer
  attendanceSessions: [{
    date:      { type: Date, default: Date.now },
    topic:     { type: String },
    present:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
    createdAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Unit', unitSchema);
