const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sponsorSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  logo:        { type: String },
  website:     { type: String },
  description: { type: String },
  tier:        { type: String, enum: ['platinum', 'gold', 'silver', 'bronze', 'partner'], default: 'partner' },
  isActive:    { type: Boolean, default: true },
  startDate:   { type: Date },
  endDate:     { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  // Sponsor auth
  email:         { type: String, trim: true, lowercase: true, sparse: true, unique: true },
  password:      { type: String },
  contactPerson: { type: String, trim: true },
  phone:         { type: String, trim: true },
  // Sponsorship details
  amount:      { type: Number, default: 0 },
  events:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  impressions: { type: Number, default: 0 },
}, { timestamps: true });

sponsorSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

sponsorSchema.methods.comparePassword = async function(candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Sponsor', sponsorSchema);
