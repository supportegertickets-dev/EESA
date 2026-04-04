const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category:    { type: String, required: true, enum: ['past-papers', 'notes', 'lab-manuals', 'tutorials', 'projects', 'other'], default: 'other' },
  department:  { type: String, trim: true },
  yearOfStudy: { type: Number, min: 1, max: 5 },
  fileUrl:     { type: String },
  fileName:    { type: String, trim: true },
  fileSize:    { type: Number },
  filePublicId:{ type: String, trim: true },
  externalLink:{ type: String, trim: true },
  downloads:   { type: Number, default: 0 },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  uploadedByMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  submittedByName: { type: String, trim: true },
  submittedByRole: { type: String, enum: ['Admin', 'Member'], default: 'Admin' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  isPublic:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);
