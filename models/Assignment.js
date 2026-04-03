const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  unit:        { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  lecturer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String },
  dueDate:     { type: Date, required: true },
  attachments: [{ type: String }], // file paths
  submissions: [{
    student:     { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    submittedAt: { type: Date, default: Date.now },
    file:        { type: String },
    notes:       { type: String },
    grade:       { type: String },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
