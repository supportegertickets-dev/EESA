const express = require('express');
const Member = require('../models/Member');
const { requireMember, requireAdmin } = require('../middleware/auth');
const { uploadImage, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const { upload } = require('../middleware/upload');
const router = express.Router();

// Member: upload profile photo
router.post('/profile-photo', requireMember, uploadImage.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const member = await Member.findById(req.session.member.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Delete old photo if it's on Cloudinary
    if (member.profilePhoto && member.profilePhoto.includes('cloudinary')) {
      const publicId = member.profilePhoto.split('/').slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    }

    const result = await uploadToCloudinary(req.file.buffer, 'eesa/profiles', 'image');
    member.profilePhoto = result.url;
    await member.save();
    res.json({ message: 'Photo uploaded', url: result.url });
  } catch (err) { res.status(500).json({ error: 'Upload failed: ' + err.message }); }
});

// General file upload (returns URL)
router.post('/file', requireMember, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const folder = req.body.folder || 'eesa/files';
    const result = await uploadToCloudinary(req.file.buffer, folder);
    res.json({ url: result.url, publicId: result.publicId, name: req.file.originalname, size: result.size });
  } catch (err) { res.status(500).json({ error: 'Upload failed: ' + err.message }); }
});

// Member directory (verified members only see other verified members)
router.get('/directory', requireMember, async (req, res) => {
  try {
    const { search, department, year } = req.query;
    const filter = { status: 'active', isVerified: true };
    if (department) filter.department = department;
    if (year) filter.yearOfStudy = Number(year);
    if (search) filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { regNumber: { $regex: search, $options: 'i' } }
    ];
    const members = await Member.find(filter)
      .select('fullName regNumber department yearOfStudy gender profilePhoto execPosition')
      .sort({ fullName: 1 });
    res.json(members);
  } catch { res.status(500).json({ error: 'Failed to fetch directory' }); }
});

module.exports = router;
