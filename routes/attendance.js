const express = require('express');
const Attendance = require('../models/Attendance');
const Event = require('../models/Event');
const QRCode = require('qrcode');
const { requireAdmin, requireMember } = require('../middleware/auth');
const router = express.Router();

// Admin: generate QR code for an event
router.get('/qr/:eventId', requireAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const qrData = JSON.stringify({ eventId: event._id, title: event.title, ts: Date.now() });
    const qrImage = await QRCode.toDataURL(qrData, { width: 400, margin: 2 });
    res.json({ qrImage, eventId: event._id, title: event.title });
  } catch { res.status(500).json({ error: 'Failed to generate QR' }); }
});

// Member: QR-based check-in
router.post('/qr-checkin', requireMember, async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const existing = await Attendance.findOne({ event: eventId, member: req.session.member.id });
    if (existing) return res.status(409).json({ error: 'Already checked in' });

    const record = await Attendance.create({
      event: eventId,
      member: req.session.member.id,
      method: 'code'
    });
    res.status(201).json({ message: 'QR check-in successful!', record });
  } catch { res.status(500).json({ error: 'QR check-in failed' }); }
});

// Admin: mark attendance for event
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { eventId, memberId, method } = req.body;
    if (!eventId || !memberId) return res.status(400).json({ error: 'eventId and memberId required' });

    const existing = await Attendance.findOne({ event: eventId, member: memberId });
    if (existing) return res.status(409).json({ error: 'Already marked present' });

    const record = await Attendance.create({
      event: eventId, member: memberId,
      method: method || 'manual',
      markedBy: req.session.admin.id
    });
    res.status(201).json(record);
  } catch { res.status(500).json({ error: 'Failed to mark attendance' }); }
});

// Admin: bulk mark attendance
router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { eventId, memberIds } = req.body;
    if (!eventId || !memberIds?.length) return res.status(400).json({ error: 'eventId and memberIds required' });

    const records = [];
    for (const memberId of memberIds) {
      const existing = await Attendance.findOne({ event: eventId, member: memberId });
      if (!existing) {
        const r = await Attendance.create({
          event: eventId, member: memberId,
          method: 'manual', markedBy: req.session.admin.id
        });
        records.push(r);
      }
    }
    res.json({ message: `Marked ${records.length} attendees`, records });
  } catch { res.status(500).json({ error: 'Failed to mark attendance' }); }
});

// Admin: get attendance for an event
router.get('/event/:eventId', requireAdmin, async (req, res) => {
  try {
    const records = await Attendance.find({ event: req.params.eventId })
      .populate('member', 'fullName regNumber department yearOfStudy')
      .populate('markedBy', 'fullName')
      .sort({ checkInTime: -1 });
    res.json(records);
  } catch { res.status(500).json({ error: 'Failed to fetch attendance' }); }
});

// Member: self check-in with event code
router.post('/checkin', requireMember, async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const existing = await Attendance.findOne({ event: eventId, member: req.session.member.id });
    if (existing) return res.status(409).json({ error: 'Already checked in' });

    const record = await Attendance.create({
      event: eventId,
      member: req.session.member.id,
      method: 'self'
    });
    res.status(201).json({ message: 'Checked in successfully', record });
  } catch { res.status(500).json({ error: 'Check-in failed' }); }
});

// Member: view own attendance history
router.get('/mine', requireMember, async (req, res) => {
  try {
    const records = await Attendance.find({ member: req.session.member.id })
      .populate('event', 'title date location category')
      .sort({ checkInTime: -1 });
    res.json(records);
  } catch { res.status(500).json({ error: 'Failed to fetch attendance' }); }
});

// Admin: member attendance summary
router.get('/member/:memberId', requireAdmin, async (req, res) => {
  try {
    const records = await Attendance.find({ member: req.params.memberId })
      .populate('event', 'title date location category')
      .sort({ checkInTime: -1 });
    res.json(records);
  } catch { res.status(500).json({ error: 'Failed to fetch attendance' }); }
});

// Admin: delete attendance record
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
