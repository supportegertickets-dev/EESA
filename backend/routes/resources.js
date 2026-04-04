const express = require('express');
const Resource = require('../models/Resource');
const { requireAdmin, requireMember } = require('../middleware/auth');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const router = express.Router();

function requireMemberOrAdmin(req, res, next) {
  if (req.session?.member || req.session?.admin) return next();
  res.status(401).json({ error: 'Login required' });
}

const populateResource = (q) =>
  q.populate('uploadedBy', 'fullName username')
   .populate('uploadedByMember', 'fullName department regNumber');

// Public resources
router.get('/public', async (req, res) => {
  try {
    const resources = await populateResource(
      Resource.find({ isPublic: true, approvalStatus: 'approved' })
    ).sort({ createdAt: -1 });
    res.json(resources);
  } catch { res.status(500).json({ error: 'Failed to fetch resources' }); }
});

// Member/Admin: browse resources
router.get('/', requireMemberOrAdmin, async (req, res) => {
  try {
    const { category, department, year, search, status } = req.query;
    const clauses = [];
    if (category) clauses.push({ category });
    if (department) clauses.push({ department });
    if (year) clauses.push({ yearOfStudy: Number(year) });
    if (status) clauses.push({ approvalStatus: status });
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      clauses.push({
        $or: [
          { title: { $regex: safe, $options: 'i' } },
          { description: { $regex: safe, $options: 'i' } },
          { fileName: { $regex: safe, $options: 'i' } }
        ]
      });
    }
    if (req.session?.member) {
      clauses.push({
        $or: [
          { approvalStatus: 'approved' },
          { uploadedByMember: req.session.member.id }
        ]
      });
    }
    const filter = clauses.length ? { $and: clauses } : {};
    const resources = await populateResource(
      Resource.find(filter)
    ).sort({ createdAt: -1 });
    res.json(resources);
  } catch { res.status(500).json({ error: 'Failed to fetch resources' }); }
});

// Stats for admin dashboard
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      Resource.countDocuments(),
      Resource.countDocuments({ approvalStatus: 'pending' }),
      Resource.countDocuments({ approvalStatus: 'approved' }),
      Resource.countDocuments({ approvalStatus: 'rejected' }),
    ]);
    const totalDownloads = await Resource.aggregate([{ $group: { _id: null, total: { $sum: '$downloads' } } }]);
    res.json({ total, pending, approved, rejected, totalDownloads: totalDownloads[0]?.total || 0 });
  } catch { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

// Member: submit a resource for admin review
router.post('/submit', requireMember, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, department, yearOfStudy, externalLink } = req.body;
    const data = {
      title, description, category, department, yearOfStudy, externalLink,
      uploadedByMember: req.session.member.id,
      submittedByName: req.session.member.fullName,
      submittedByRole: 'Member',
      approvalStatus: 'pending',
      isPublic: false
    };

    if (!req.file && !data.externalLink) {
      return res.status(400).json({ error: 'Attach a file or provide an external link' });
    }

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'eesa/resources');
      data.fileUrl = result.url;
      data.fileName = req.file.originalname;
      data.fileSize = result.size;
      data.filePublicId = result.publicId;
    }

    if (data.yearOfStudy) data.yearOfStudy = Number(data.yearOfStudy);
    const resource = await Resource.create(data);
    const populated = await populateResource(Resource.findById(resource._id));
    res.status(201).json({ message: 'Resource submitted for admin review', resource: populated });
  } catch (err) {
    console.error('Member resource submit error:', err.message);
    res.status(500).json({ error: 'Failed to submit resource' });
  }
});

// Member/Admin: download / increment count
router.post('/:id/download', requireMemberOrAdmin, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true });
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json({ fileUrl: resource.fileUrl || resource.externalLink });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Admin: create resource
router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, department, yearOfStudy, externalLink, isPublic, approvalStatus } = req.body;
    const data = {
      title, description, category, department, yearOfStudy, externalLink,
      uploadedBy: req.session.admin.id,
      submittedByName: req.session.admin.fullName || req.session.admin.username,
      submittedByRole: 'Admin',
      approvalStatus: approvalStatus || 'approved'
    };
    if (!req.file && !data.externalLink) {
      return res.status(400).json({ error: 'Attach a file or provide an external link' });
    }
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'eesa/resources');
      data.fileUrl = result.url;
      data.fileName = req.file.originalname;
      data.fileSize = result.size;
      data.filePublicId = result.publicId;
    }
    if (data.yearOfStudy) data.yearOfStudy = Number(data.yearOfStudy);
    data.isPublic = data.isPublic === true || data.isPublic === 'true';
    const resource = await Resource.create(data);
    const populated = await populateResource(Resource.findById(resource._id));
    res.status(201).json(populated);
  } catch { res.status(500).json({ error: 'Failed to create resource' }); }
});

// Admin: update
router.put('/:id', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const allowed = ['title', 'description', 'category', 'department', 'yearOfStudy', 'externalLink', 'isPublic', 'approvalStatus'];
    const data = {};
    for (const key of allowed) { if (req.body[key] !== undefined) data[key] = req.body[key]; }
    if (req.file) {
      // Clean up old file from Cloudinary
      const existing = await Resource.findById(req.params.id);
      if (existing?.filePublicId) {
        await deleteFromCloudinary(existing.filePublicId, 'raw').catch(() => {});
      }
      const result = await uploadToCloudinary(req.file.buffer, 'eesa/resources');
      data.fileUrl = result.url;
      data.fileName = req.file.originalname;
      data.fileSize = result.size;
      data.filePublicId = result.publicId;
    }
    if (data.yearOfStudy) data.yearOfStudy = Number(data.yearOfStudy);
    if (typeof data.isPublic !== 'undefined') data.isPublic = data.isPublic === true || data.isPublic === 'true';
    const resource = await populateResource(
      Resource.findByIdAndUpdate(req.params.id, data, { new: true })
    );
    res.json(resource);
  } catch { res.status(500).json({ error: 'Failed to update resource' }); }
});

// Admin: delete
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    // Clean up Cloudinary file
    if (resource.filePublicId) {
      await deleteFromCloudinary(resource.filePublicId, 'raw').catch(() => {});
    }
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
