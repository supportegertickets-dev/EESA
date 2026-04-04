const express = require('express');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const { requireAdmin, requireMember } = require('../middleware/auth');
const { uploadImage, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const router = express.Router();

function requireMemberOrAdmin(req, res, next) {
  if (req.session?.member || req.session?.admin) return next();
  res.status(401).json({ error: 'Login required' });
}

function serializeEvent(ev, memberId) {
  const obj = ev.toObject ? ev.toObject() : { ...ev };
  obj.registrationCount = Array.isArray(obj.registrations) ? obj.registrations.length : 0;
  if (memberId) {
    obj.isRegistered = Array.isArray(obj.registrations) &&
      obj.registrations.some(r => (r.member?._id || r.member)?.toString() === memberId);
  }
  return obj;
}

// List events with filters
router.get('/', async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { location: { $regex: safe, $options: 'i' } }
      ];
    }
    const memberId = req.session?.member?.id;
    const events = await Event.find(filter)
      .populate('createdBy', 'fullName')
      .sort({ date: -1 });
    res.json(events.map(ev => serializeEvent(ev, memberId)));
  } catch { res.status(500).json({ error: 'Failed to fetch events' }); }
});

// Stats for admin
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [total, upcoming, ongoing, completed, cancelled] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'upcoming' }),
      Event.countDocuments({ status: 'ongoing' }),
      Event.countDocuments({ status: 'completed' }),
      Event.countDocuments({ status: 'cancelled' }),
    ]);
    const totalRegs = await Event.aggregate([
      { $project: { count: { $size: '$registrations' } } },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);
    res.json({ total, upcoming, ongoing, completed, cancelled, totalRegistrations: totalRegs[0]?.total || 0 });
  } catch { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

// Get single event with full registrations
router.get('/:id', requireMemberOrAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'fullName')
      .populate('registrations.member', 'fullName regNumber department yearOfStudy profilePhoto');
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const memberId = req.session?.member?.id;
    res.json(serializeEvent(event, memberId));
  } catch { res.status(500).json({ error: 'Failed to fetch event' }); }
});

// Admin: create event
router.post('/', requireAdmin, uploadImage.single('image'), async (req, res) => {
  try {
    const { title, description, date, endDate, location, category, status, maxParticipants } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Title and date are required' });
    const data = { title, description, date, location, category, status, maxParticipants, createdBy: req.session.admin.id };
    if (endDate) data.endDate = endDate;
    if (maxParticipants) data.maxParticipants = Number(maxParticipants);
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'eesa/events');
      data.imageUrl = result.url;
      data.imagePublicId = result.publicId;
    }
    const event = await Event.create(data);
    const populated = await Event.findById(event._id).populate('createdBy', 'fullName');
    res.status(201).json(serializeEvent(populated));
  } catch { res.status(500).json({ error: 'Failed to create event' }); }
});

// Admin: update event
router.put('/:id', requireAdmin, uploadImage.single('image'), async (req, res) => {
  try {
    const allowed = ['title', 'description', 'date', 'endDate', 'location', 'category', 'status', 'maxParticipants'];
    const update = {};
    for (const key of allowed) { if (req.body[key] !== undefined) update[key] = req.body[key]; }
    if (update.maxParticipants) update.maxParticipants = Number(update.maxParticipants);
    if (req.file) {
      const existing = await Event.findById(req.params.id);
      if (existing?.imagePublicId) {
        await deleteFromCloudinary(existing.imagePublicId).catch(() => {});
      }
      const result = await uploadToCloudinary(req.file.buffer, 'eesa/events');
      update.imageUrl = result.url;
      update.imagePublicId = result.publicId;
    }
    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('createdBy', 'fullName')
      .populate('registrations.member', 'fullName regNumber department yearOfStudy');
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(serializeEvent(event));
  } catch { res.status(500).json({ error: 'Failed to update event' }); }
});

// Admin: delete event (cleanup image + attendances)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.imagePublicId) {
      await deleteFromCloudinary(event.imagePublicId).catch(() => {});
    }
    await Attendance.deleteMany({ event: req.params.id });
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete event' }); }
});

// Member: register for event
router.post('/:id/register', requireMember, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status === 'cancelled') return res.status(400).json({ error: 'Event is cancelled' });
    if (event.status === 'completed') return res.status(400).json({ error: 'Event has already ended' });
    if (event.maxParticipants && event.registrations.length >= event.maxParticipants) {
      return res.status(400).json({ error: 'Event is full' });
    }
    const already = event.registrations.find(r => r.member.toString() === req.session.member.id);
    if (already) return res.status(409).json({ error: 'Already registered' });
    event.registrations.push({ member: req.session.member.id });
    await event.save();
    res.json({ message: 'Registered for event', registrationCount: event.registrations.length });
  } catch { res.status(500).json({ error: 'Registration failed' }); }
});

// Member: unregister from event
router.delete('/:id/register', requireMember, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const idx = event.registrations.findIndex(r => r.member.toString() === req.session.member.id);
    if (idx === -1) return res.status(404).json({ error: 'Not registered' });
    event.registrations.splice(idx, 1);
    await event.save();
    res.json({ message: 'Unregistered from event', registrationCount: event.registrations.length });
  } catch { res.status(500).json({ error: 'Failed to unregister' }); }
});

module.exports = router;
