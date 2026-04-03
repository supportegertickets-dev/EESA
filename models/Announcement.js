const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  content:  { type: String, required: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  targetAudience: { type: String, enum: ['all', 'members'], default: 'all' },
  isPinned: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
