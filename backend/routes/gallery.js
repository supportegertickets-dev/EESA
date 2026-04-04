const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');
const { requireAdmin } = require('../middleware/auth');
const { uploadImage, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');

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
        uploadedBy: req.session.admin?.id
      });
      saved.push(photo);
    }

    try {
      const admins = await Admin.find({}).select('_id').lean();
      if (admins.length > 0) {
        const actor = req.session.admin?.fullName || req.session.admin?.username || 'An admin';
        const notifications = admins.map((admin) => ({
          recipient: admin._id,
          recipientModel: 'Admin',
          type: 'system',
          title: saved.length === 1 ? 'Gallery image uploaded' : 'Gallery images uploaded',
          message: `${actor} uploaded ${saved.length} image${saved.length === 1 ? '' : 's'} to the ${safeCategory} gallery.`,
          link: '/admin/gallery',
          data: {
            category: safeCategory,
            count: saved.length,
            photoIds: saved.map((photo) => String(photo._id))
          }
        }));
        await Notification.insertMany(notifications);
      }
    } catch (notificationError) {
      console.error('Gallery notification error:', notificationError.message);
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
