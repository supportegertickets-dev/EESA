const express = require('express');
const Election = require('../models/Election');
const Member = require('../models/Member');
const { requireAdmin, requireVerifiedMember } = require('../middleware/auth');
const { uploadImage, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const router = express.Router();

function serializeElection(election, memberId) {
  const obj = election.toObject();
  obj.totalVoters = Array.isArray(obj.voters) ? obj.voters.length : 0;
  if (memberId) {
    obj.hasVoted = (obj.voters || []).some(v => String(v) === String(memberId));
  }
  obj.candidates = (obj.candidates || []).sort((a, b) => {
    if ((a.position || '') !== (b.position || '')) {
      return (a.position || '').localeCompare(b.position || '');
    }
    if ((b.votes || 0) !== (a.votes || 0)) {
      return (b.votes || 0) - (a.votes || 0);
    }
    return (a.member?.fullName || '').localeCompare(b.member?.fullName || '');
  });
  delete obj.voters;
  return obj;
}

// Public/Member: list elections
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const elections = await Election.find(filter)
      .populate('candidates.member', 'fullName regNumber department yearOfStudy profilePhoto')
      .sort({ startDate: -1 });
    const safe = elections.map(e => serializeElection(e, req.session?.member?.id));
    res.json(safe);
  } catch { res.status(500).json({ error: 'Failed to fetch elections' }); }
});

// Get single election
router.get('/:id', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('candidates.member', 'fullName regNumber department yearOfStudy profilePhoto');
    if (!election) return res.status(404).json({ error: 'Election not found' });
    res.json(serializeElection(election, req.session?.member?.id));
  } catch { res.status(500).json({ error: 'Failed to fetch election' }); }
});

// Member: cast vote (supports single candidateId or multi-position votes object)
router.post('/:id/vote', requireVerifiedMember, async (req, res) => {
  try {
    const { candidateId, votes } = req.body;
    if (!candidateId && (!votes || !Object.keys(votes).length))
      return res.status(400).json({ error: 'candidateId or votes required' });

    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });
    if (election.status !== 'active') return res.status(400).json({ error: 'Election is not currently active' });

    const now = new Date();
    if (now < election.startDate || now > election.endDate)
      return res.status(400).json({ error: 'Voting period has ended or not started' });

    const memberId = req.session.member.id;
    if (election.voters.some(v => v.toString() === memberId))
      return res.status(409).json({ error: 'You have already voted in this election' });

    // Handle multi-position votes: { "Chairperson": "candidateId", ... }
    const candidateIds = votes ? Object.values(votes) : [candidateId];
    // Validate no duplicate candidate IDs
    if (new Set(candidateIds).size !== candidateIds.length)
      return res.status(400).json({ error: 'Duplicate candidate selections' });
    for (const cid of candidateIds) {
      const candidate = election.candidates.id(cid);
      if (!candidate) return res.status(404).json({ error: 'Candidate not found: ' + cid });
      candidate.votes += 1;
    }
    election.voters.push(memberId);
    await election.save();

    res.json({ message: 'Vote cast successfully' });
  } catch { res.status(500).json({ error: 'Voting failed' }); }
});

// Admin: create election
router.post('/', requireAdmin, async (req, res) => {
  try {
    const election = await Election.create({ ...req.body, createdBy: req.session.admin.id });
    res.status(201).json(election);
  } catch { res.status(500).json({ error: 'Failed to create election' }); }
});

// Admin: add candidate
router.post('/:id/candidates', requireAdmin, uploadImage.single('image'), async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });

    const memberId = req.body.memberId || req.body.member;
    const position = (req.body.position || '').trim();
    const manifesto = (req.body.manifesto || '').trim();

    if (!memberId || !position) {
      return res.status(400).json({ error: 'Aspirant and position are required' });
    }
    if (!election.positions.includes(position)) {
      return res.status(400).json({ error: 'Selected position does not exist in this election' });
    }
    if (election.candidates.some(candidate => String(candidate.member) === String(memberId))) {
      return res.status(409).json({ error: 'This aspirant is already added to the election' });
    }

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    let imageUrl = '';
    let imagePublicId = '';
    if (req.file?.buffer) {
      const upload = await uploadToCloudinary(req.file.buffer, 'eesa/elections/aspirants', 'image');
      imageUrl = upload.url;
      imagePublicId = upload.publicId;
    }

    election.candidates.push({
      member: member._id,
      position,
      manifesto,
      imageUrl,
      imagePublicId
    });

    await election.save();
    await election.populate('candidates.member', 'fullName regNumber department yearOfStudy profilePhoto');
    res.status(201).json(serializeElection(election, req.session?.member?.id));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to add candidate' });
  }
});

// Admin: update election (whitelisted fields only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['title', 'description', 'startDate', 'endDate', 'positions', 'status'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const election = await Election.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('candidates.member', 'fullName regNumber department yearOfStudy profilePhoto');
    res.json(serializeElection(election, req.session?.member?.id));
  } catch (err) { res.status(500).json({ error: err.message || 'Failed to update election' }); }
});

// Admin: update candidate
router.put('/:id/candidates/:candidateId', requireAdmin, uploadImage.single('image'), async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });

    const candidate = election.candidates.id(req.params.candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const memberId = req.body.memberId || req.body.member;
    const position = (req.body.position || candidate.position || '').trim();
    const manifesto = (req.body.manifesto || '').trim();

    if (memberId && election.candidates.some(item => String(item._id) !== String(candidate._id) && String(item.member) === String(memberId))) {
      return res.status(409).json({ error: 'This aspirant is already added to the election' });
    }
    if (!election.positions.includes(position)) {
      return res.status(400).json({ error: 'Selected position does not exist in this election' });
    }

    if (memberId) {
      const member = await Member.findById(memberId);
      if (!member) return res.status(404).json({ error: 'Member not found' });
      candidate.member = member._id;
    }
    candidate.position = position;
    candidate.manifesto = manifesto;

    if (req.file?.buffer) {
      if (candidate.imagePublicId) {
        await deleteFromCloudinary(candidate.imagePublicId, 'image');
      }
      const upload = await uploadToCloudinary(req.file.buffer, 'eesa/elections/aspirants', 'image');
      candidate.imageUrl = upload.url;
      candidate.imagePublicId = upload.publicId;
    }

    await election.save();
    await election.populate('candidates.member', 'fullName regNumber department yearOfStudy profilePhoto');
    res.json(serializeElection(election, req.session?.member?.id));
  } catch (err) { res.status(500).json({ error: err.message || 'Failed to update candidate' }); }
});

// Admin: remove candidate
router.delete('/:id/candidates/:candidateId', requireAdmin, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });
    const candidate = election.candidates.id(req.params.candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    if (candidate.imagePublicId) {
      await deleteFromCloudinary(candidate.imagePublicId, 'image');
    }
    election.candidates.pull(req.params.candidateId);
    await election.save();
    res.json({ message: 'Candidate removed' });
  } catch (err) { res.status(500).json({ error: err.message || 'Failed to remove candidate' }); }
});

// Get election results — admin gets full results, members get results for closed elections
router.get('/:id/results', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('candidates.member', 'fullName regNumber department yearOfStudy profilePhoto');
    if (!election) return res.status(404).json({ error: 'Election not found' });
    // Non-admin can only see results for closed elections
    if (!req.session?.admin && election.status !== 'closed')
      return res.status(403).json({ error: 'Results available after election closes' });
    const obj = election.toObject();
    obj.totalVoters = obj.voters.length;
    // Only admin sees full voter list
    if (req.session?.admin) {
      await election.populate('voters', 'fullName regNumber');
      obj.voterList = election.voters;
    }
    delete obj.voters;
    res.json(obj);
  } catch { res.status(500).json({ error: 'Failed to fetch results' }); }
});

// Admin: delete election
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });

    for (const candidate of election.candidates || []) {
      if (candidate.imagePublicId) {
        await deleteFromCloudinary(candidate.imagePublicId, 'image');
      }
    }

    await Election.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message || 'Failed to delete' }); }
});

module.exports = router;
