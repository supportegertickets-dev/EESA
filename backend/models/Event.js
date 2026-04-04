const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  date:        { type: Date, required: true },
  endDate:     { type: Date },
  location:    { type: String, trim: true },
  category:    { type: String, enum: ['workshop', 'seminar', 'social', 'competition', 'meeting', 'general', 'other'], default: 'general' },
  status:      { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  maxParticipants: Number,
  imageUrl:    { type: String, trim: true },
  imagePublicId: { type: String, trim: true },
  registrations: [{ member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' }, registeredAt: { type: Date, default: Date.now } }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
