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
    const { title, content, priority, targetAudience, isPinned } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const item = await Announcement.create({ title, content, priority, targetAudience, isPinned, createdBy: req.session.admin.id });
    res.status(201).json(item);
  } catch { res.status(500).json({ error: 'Failed to create announcement' }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['title', 'content', 'priority', 'targetAudience', 'isPinned'];
    const update = {};
    for (const key of allowed) { if (req.body[key] !== undefined) update[key] = req.body[key]; }
    const item = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return res.status(404).json({ error: 'Announcement not found' });
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
