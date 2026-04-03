const express = require('express');
const Sponsor = require('../models/Sponsor');
const Event = require('../models/Event');
const Member = require('../models/Member');
const { requireAdmin } = require('../middleware/auth');
const { uploadImage, uploadToCloudinary } = require('../middleware/upload');
const router = express.Router();

// Middleware: require sponsor session
function requireSponsor(req, res, next) {
  if (req.session?.sponsor) return next();
  res.status(401).json({ error: 'Sponsor login required' });
}

// ── Sponsor Auth ──
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const sponsor = await Sponsor.findOne({ email });
    if (!sponsor || !(await sponsor.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    if (!sponsor.isActive) return res.status(403).json({ error: 'Sponsor account inactive' });
    req.session.sponsor = { id: sponsor._id, name: sponsor.name, tier: sponsor.tier, email: sponsor.email };
    res.json({ message: 'Login successful', sponsor: req.session.sponsor });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

router.post('/auth/logout', (req, res) => { req.session.destroy(); res.json({ message: 'Logged out' }); });
router.get('/auth/me', (req, res) => {
  if (req.session?.sponsor) return res.json({ sponsor: req.session.sponsor });
  res.status(401).json({ error: 'Not authenticated' });
});

// ── Sponsor Dashboard ──
router.get('/dashboard', requireSponsor, async (req, res) => {
  try {
    const sponsor = await Sponsor.findById(req.session.sponsor.id).populate('events', 'title date participants location status');
    if (!sponsor) return res.status(404).json({ error: 'Sponsor not found' });

    const totalMembers = await Member.countDocuments({ status: 'active' });
    const sponsoredEvents = sponsor.events || [];
    let totalAttendees = 0;
    for (const evt of sponsoredEvents) {
      totalAttendees += (evt.participants?.length || 0);
    }

    // Tier visibility multiplier (higher tiers get more visibility)
    const tierMultiplier = { platinum: 5, gold: 4, silver: 3, bronze: 2, partner: 1 };
    const estimatedReach = totalMembers * (tierMultiplier[sponsor.tier] || 1);

    res.json({
      sponsor: {
        name: sponsor.name, tier: sponsor.tier, logo: sponsor.logo,
        website: sponsor.website, description: sponsor.description,
        contactPerson: sponsor.contactPerson,
        startDate: sponsor.startDate, endDate: sponsor.endDate,
        amount: sponsor.amount, impressions: sponsor.impressions
      },
      metrics: {
        totalMembers,
        sponsoredEvents: sponsoredEvents.length,
        totalAttendees,
        estimatedReach,
        impressions: sponsor.impressions,
        roi: sponsor.amount > 0 ? ((estimatedReach + totalAttendees) / sponsor.amount * 100).toFixed(1) : 'N/A'
      },
      events: sponsoredEvents.map(e => ({
        _id: e._id, title: e.title, date: e.date,
        location: e.location, status: e.status,
        attendees: e.participants?.length || 0
      }))
    });
  } catch { res.status(500).json({ error: 'Failed to load dashboard' }); }
});

// Track impression (called when sponsor logo is viewed on public site)
router.post('/:id/impression', async (req, res) => {
  try {
    await Sponsor.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Public: active sponsors
router.get('/', async (req, res) => {
  try {
    const sponsors = await Sponsor.find({ isActive: true }).sort({ tier: 1, createdAt: -1 });
    res.json(sponsors);
  } catch { res.status(500).json({ error: 'Failed to fetch sponsors' }); }
});

// Admin: all sponsors
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const sponsors = await Sponsor.find().sort({ createdAt: -1 });
    res.json(sponsors);
  } catch { res.status(500).json({ error: 'Failed to fetch sponsors' }); }
});

// Admin: create
router.post('/', requireAdmin, uploadImage.single('logo'), async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.session.admin.id };
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'eesa/sponsors', 'image');
      data.logo = result.url;
    }
    if (data.isActive === 'true') data.isActive = true;
    if (data.isActive === 'false') data.isActive = false;
    const sponsor = await Sponsor.create(data);
    res.status(201).json(sponsor);
  } catch { res.status(500).json({ error: 'Failed to create sponsor' }); }
});

// Admin: update
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const sponsor = await Sponsor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(sponsor);
  } catch { res.status(500).json({ error: 'Failed to update' }); }
});

// Admin: delete
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Sponsor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
