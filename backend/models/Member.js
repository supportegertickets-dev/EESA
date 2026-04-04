const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const memberSchema = new mongoose.Schema({
  regNumber:    { type: String, required: true, unique: true, trim: true },
  fullName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  phone:        { type: String, trim: true },
  yearOfStudy:  { type: Number, required: true, min: 1, max: 5 },
  department:   { type: String, required: true },
  gender:       { type: String, enum: ['Male', 'Female', 'Other'] },
  
  // Verification & Payment
  isVerified:       { type: Boolean, default: false },
  registrationFee:  { type: Number, default: 250 }, // KSh registration fee
  registrationPaid: { type: Boolean, default: false },
  
  // Semester renewal
  currentSemester:  { type: String, default: '' },
  renewalHistory:   [{
    semester: String,
    amount:   { type: Number, default: 50 },
    paidAt:   { type: Date, default: Date.now },
    mpesaCode: String
  }],
  
  status: { type: String, enum: ['pending', 'active', 'suspended', 'inactive'], default: 'pending' },
  execPosition: { type: String, default: '' }, // e.g. 'Chairperson', 'Secretary' — set by admin
  profilePhoto: String,

  // Password reset
  resetCode:      { type: String },
  resetCodeExpiry: { type: Date },
}, { timestamps: true });

memberSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

memberSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

memberSchema.methods.toPublic = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Member', memberSchema);
