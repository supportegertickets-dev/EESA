const express = require('express');
const Event = require('../models/Event');
const { requireAdmin, requireMember } = require('../middleware/auth');
const router = express.Router();

// Public: list events
router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const events = await Event.find(filter).populate('createdBy', 'fullName').sort({ date: -1 });
    res.json(events);
  } catch { res.status(500).json({ error: 'Failed to fetch events' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'fullName').populate('registrations.member', 'fullName regNumber department');
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch { res.status(500).json({ error: 'Failed to fetch event' }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, createdBy: req.session.admin.id });
    res.status(201).json(event);
  } catch { res.status(500).json({ error: 'Failed to create event' }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(event);
  } catch { res.status(500).json({ error: 'Failed to update event' }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete event' }); }
});

// Member register for event
router.post('/:id/register', requireMember, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const already = event.registrations.find(r => r.member.toString() === req.session.member.id);
    if (already) return res.status(409).json({ error: 'Already registered' });
    event.registrations.push({ member: req.session.member.id });
    await event.save();
    res.json({ message: 'Registered for event' });
  } catch { res.status(500).json({ error: 'Registration failed' }); }
});

module.exports = router;
