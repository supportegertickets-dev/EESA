const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const lecturerSchema = new mongoose.Schema({
  staffId:     { type: String, required: true, unique: true, trim: true },
  fullName:    { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true },
  phone:       { type: String, trim: true },
  department:  { type: String, required: true },
  title:       { type: String, default: '' }, // e.g. Dr., Prof., Mr.
  status:      { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

lecturerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

lecturerSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Lecturer', lecturerSchema);
