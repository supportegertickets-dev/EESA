const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: String,
  category:    String,
  status:      { type: String, enum: ['planning', 'ongoing', 'in-progress', 'completed', 'on-hold'], default: 'planning' },
  teamLead:    String,
  startDate:   Date,
  endDate:     Date,
  members:     [{ member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' }, role: { type: String, default: 'member' } }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
