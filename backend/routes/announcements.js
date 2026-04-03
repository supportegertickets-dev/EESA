const express = require('express');
const Announcement = require('../models/Announcement');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const items = await Announcement.find().populate('createdBy', 'fullName').sort({ isPinned: -1, createdAt: -1 });
    res.json(items);
  } catch { res.status(500).json({ error: 'Failed to fetch announcements' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Announcement.findById(req.params.id).populate('createdBy', 'fullName');
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const item = await Announcement.create({ ...req.body, createdBy: req.session.admin.id });
    res.status(201).json(item);
  } catch { res.status(500).json({ error: 'Failed to create announcement' }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch { res.status(500).json({ error: 'Failed to update' }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
