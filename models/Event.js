const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: String,
  date:        { type: Date, required: true },
  location:    String,
  category:    { type: String, default: 'general' },
  status:      { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  maxParticipants: Number,
  registrations: [{ member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' }, registeredAt: { type: Date, default: Date.now } }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
