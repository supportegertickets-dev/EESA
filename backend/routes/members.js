const express = require('express');
const Member = require('../models/Member');
const bcrypt = require('bcryptjs');
const { requireAdmin, requireMember } = require('../middleware/auth');
const router = express.Router();

// Member: change own password (must be BEFORE /:id routes)
router.put('/me/password', requireMember, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const member = await Member.findById(req.session.member.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const match = await member.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    member.password = newPassword;
    await member.save();
    res.json({ message: 'Password updated successfully' });
  } catch { res.status(500).json({ error: 'Failed to change password' }); }
});

// Get all members (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search, department, year, status } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { regNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
    if (department) filter.department = department;
    if (year) filter.yearOfStudy = Number(year);
    if (status) filter.status = status;

    const members = await Member.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(members);
  } catch { res.status(500).json({ error: 'Failed to fetch members' }); }
});

// Get one member
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).select('-password');
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch { res.status(500).json({ error: 'Failed to fetch member' }); }
});

// Verify member (admin)
router.put('/:id/verify', requireAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!member.registrationPaid) return res.status(400).json({ error: 'Registration fee not yet paid' });
    
    member.isVerified = true;
    member.status = 'active';
    await member.save();
    res.json({ message: 'Member verified', member: member.toPublic() });
  } catch { res.status(500).json({ error: 'Verification failed' }); }
});

// Suspend/Activate member
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const member = await Member.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
    res.json(member);
  } catch { res.status(500).json({ error: 'Update failed' }); }
});

// Update member (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { fullName, phone, yearOfStudy, department, gender, status } = req.body;
    const member = await Member.findByIdAndUpdate(req.params.id,
      { fullName, phone, yearOfStudy, department, gender, status },
      { new: true }
    ).select('-password');
    res.json(member);
  } catch { res.status(500).json({ error: 'Update failed' }); }
});

// Delete member
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member deleted' });
  } catch { res.status(500).json({ error: 'Delete failed' }); }
});

module.exports = router;
