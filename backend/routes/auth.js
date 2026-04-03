const express = require('express');
const Admin = require('../models/Admin');
const Member = require('../models/Member');
const Lecturer = require('../models/Lecturer');
const router = express.Router();

// ── Admin Login ──
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const admin = await Admin.findOne({ username });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    req.session.admin = { id: admin._id, username: admin.username, fullName: admin.fullName, role: admin.role };
    res.json({ message: 'Login successful', admin: req.session.admin });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/admin/logout', (req, res) => { req.session.destroy(); res.json({ message: 'Logged out' }); });
router.get('/admin/me', (req, res) => {
  if (req.session?.admin) return res.json({ admin: req.session.admin });
  res.status(401).json({ error: 'Not authenticated' });
});

// ── Member Registration ──
router.post('/member/register', async (req, res) => {
  try {
    const { regNumber, fullName, email, password, phone, yearOfStudy, department, gender } = req.body;
    if (!regNumber || !fullName || !email || !password || !yearOfStudy || !department)
      return res.status(400).json({ error: 'All required fields must be filled' });

    const exists = await Member.findOne({ $or: [{ email }, { regNumber }] });
    if (exists) return res.status(409).json({ error: 'Member with this email or registration number already exists' });

    const member = await Member.create({
      regNumber, fullName, email, password, phone, yearOfStudy, department, gender,
      status: 'pending', isVerified: false, registrationPaid: false
    });

    req.session.member = { id: member._id, fullName: member.fullName, email: member.email, isVerified: false, status: 'pending' };
    res.status(201).json({ message: 'Registration successful! Please pay the registration fee to activate your account.', member: member.toPublic() });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Duplicate registration number or email' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Member Login ──
router.post('/member/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const member = await Member.findOne({ email });
    if (!member || !(await member.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    req.session.member = {
      id: member._id, fullName: member.fullName, email: member.email,
      isVerified: member.isVerified, status: member.status, regNumber: member.regNumber,
      department: member.department, yearOfStudy: member.yearOfStudy
    };
    res.json({ message: 'Login successful', member: member.toPublic() });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/member/logout', (req, res) => { req.session.destroy(); res.json({ message: 'Logged out' }); });
router.get('/member/me', async (req, res) => {
  if (!req.session?.member) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const member = await Member.findById(req.session.member.id);
    if (!member) return res.status(401).json({ error: 'Member not found' });
    // Refresh session
    req.session.member = {
      id: member._id, fullName: member.fullName, email: member.email,
      isVerified: member.isVerified, status: member.status, regNumber: member.regNumber,
      department: member.department, yearOfStudy: member.yearOfStudy
    };
    res.json({ member: member.toPublic() });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── Lecturer Registration ──
router.post('/lecturer/register', async (req, res) => {
  try {
    const { staffId, fullName, email, password, phone, department, title } = req.body;
    if (!staffId || !fullName || !email || !password || !department)
      return res.status(400).json({ error: 'All required fields must be filled' });
    const exists = await Lecturer.findOne({ $or: [{ email }, { staffId }] });
    if (exists) return res.status(409).json({ error: 'Lecturer with this email or staff ID already exists' });
    const lecturer = await Lecturer.create({ staffId, fullName, email, password, phone, department, title });
    req.session.lecturer = { id: lecturer._id, staffId: lecturer.staffId, fullName: lecturer.fullName, email: lecturer.email, department: lecturer.department, title: lecturer.title };
    res.status(201).json({ message: 'Registration successful', lecturer: req.session.lecturer });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Duplicate staff ID or email' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Lecturer Login ──
router.post('/lecturer/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const lecturer = await Lecturer.findOne({ email });
    if (!lecturer || !(await lecturer.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password' });
    if (lecturer.status !== 'active') return res.status(403).json({ error: 'Account is inactive' });
    req.session.lecturer = { id: lecturer._id, staffId: lecturer.staffId, fullName: lecturer.fullName, email: lecturer.email, department: lecturer.department, title: lecturer.title };
    res.json({ message: 'Login successful', lecturer: req.session.lecturer });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/lecturer/logout', (req, res) => { req.session.destroy(); res.json({ message: 'Logged out' }); });
router.get('/lecturer/me', (req, res) => {
  if (req.session?.lecturer) return res.json(req.session.lecturer);
  res.status(401).json({ error: 'Not authenticated' });
});

module.exports = router;
