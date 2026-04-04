const express = require('express');
const Project = require('../models/Project');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const projects = await Project.find(filter).populate('members.member', 'fullName regNumber').sort({ createdAt: -1 });
    res.json(projects);
  } catch { res.status(500).json({ error: 'Failed to fetch projects' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await Project.findById(req.params.id).populate('members.member', 'fullName regNumber department');
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, description, category, status, teamLead, startDate, endDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Project title is required' });
    const p = await Project.create({ title, description, category, status, teamLead, startDate, endDate, createdBy: req.session.admin.id });
    res.status(201).json(p);
  } catch { res.status(500).json({ error: 'Failed to create project' }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['title', 'description', 'category', 'status', 'teamLead', 'startDate', 'endDate'];
    const update = {};
    for (const key of allowed) { if (req.body[key] !== undefined) update[key] = req.body[key]; }
    const p = await Project.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!p) return res.status(404).json({ error: 'Project not found' });
    res.json(p);
  } catch { res.status(500).json({ error: 'Failed to update' }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
