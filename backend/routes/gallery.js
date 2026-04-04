const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const { uploadImage, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');

/* ── Helpers ─────────────────────────────────────── */
function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(401).json({ error: 'Admin access required' });
  }
  next();
}

const ALLOWED_CATEGORIES = ['events', 'projects', 'campus', 'competitions', 'general'];

/* ── GET /api/gallery — Public list ────────────── */
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 24 } = req.query;
    const filter = {};
    if (category && ALLOWED_CATEGORIES.includes(category)) filter.category = category;

    const skip = (Math.max(1, +page) - 1) * +limit;
    const [photos, total] = await Promise.all([
      Gallery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Gallery.countDocuments(filter)
    ]);
    res.json({ photos, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/gallery — Admin upload ──────────── */
router.post('/', requireAdmin, uploadImage.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    const { title, description, category } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const safeCategory = ALLOWED_CATEGORIES.includes(category) ? category : 'general';
    const saved = [];

    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer, 'eesa/gallery', 'image');
      const photo = await Gallery.create({
        title: title.trim(),
        description: (description || '').trim(),
        imageUrl: result.url,
        publicId: result.publicId,
        category: safeCategory,
        uploadedBy: req.session.userId
      });
      saved.push(photo);
    }

    res.status(201).json({ message: `${saved.length} photo(s) uploaded`, photos: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── PUT /api/gallery/:id — Admin update ────────── */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category && ALLOWED_CATEGORIES.includes(category)) updates.category = category;

    const photo = await Gallery.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    res.json(photo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /api/gallery/:id — Admin delete ─────── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const photo = await Gallery.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    // Best-effort Cloudinary cleanup — don't fail if it errors
    try { await deleteFromCloudinary(photo.publicId, 'image'); } catch (_) {}
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
