const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 500 },
  imageUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  category: { type: String, enum: ['events', 'projects', 'campus', 'competitions', 'general'], default: 'general' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('Gallery', gallerySchema);
