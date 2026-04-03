const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  event:      { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  member:     { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  checkInTime:  { type: Date, default: Date.now },
  checkOutTime: { type: Date },
  method:     { type: String, enum: ['manual', 'code', 'self'], default: 'manual' },
  markedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

attendanceSchema.index({ event: 1, member: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
