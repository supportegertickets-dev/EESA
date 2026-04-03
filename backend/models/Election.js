const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  member:    { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  position:  { type: String, required: true },
  manifesto: { type: String },
  votes:     { type: Number, default: 0 },
});

const electionSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String },
  positions:   [{ type: String }],
  candidates:  [candidateSchema],
  voters:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  status:      { type: String, enum: ['upcoming', 'active', 'closed', 'cancelled'], default: 'upcoming' },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Election', electionSchema);
