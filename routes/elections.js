const express = require('express');
const Election = require('../models/Election');
const { requireAdmin, requireMember, requireVerifiedMember } = require('../middleware/auth');
const router = express.Router();

// Public/Member: list elections
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const elections = await Election.find(filter)
      .populate('candidates.member', 'fullName regNumber department yearOfStudy')
      .sort({ startDate: -1 });
    // Strip voter ids for privacy
    const safe = elections.map(e => {
      const obj = e.toObject();
      obj.totalVoters = obj.voters.length;
      delete obj.voters;
      return obj;
    });
    res.json(safe);
  } catch { res.status(500).json({ error: 'Failed to fetch elections' }); }
});

// Get single election
router.get('/:id', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('candidates.member', 'fullName regNumber department yearOfStudy');
    if (!election) return res.status(404).json({ error: 'Election not found' });
    const obj = election.toObject();
    obj.totalVoters = obj.voters.length;
    // Check if current member has voted
    if (req.session?.member) {
      obj.hasVoted = obj.voters.some(v => v.toString() === req.session.member.id);
    }
    delete obj.voters;
    res.json(obj);
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
router.post('/:id/candidates', requireAdmin, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });
    const { memberId, member, position, manifesto } = req.body;
    election.candidates.push({ member: memberId || member, position, manifesto });
    await election.save();
    res.json(election);
  } catch { res.status(500).json({ error: 'Failed to add candidate' }); }
});

// Admin: update election (whitelisted fields only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['title', 'description', 'startDate', 'endDate', 'positions', 'status'];
    const update = {};
    for (const key of allowed) { if (req.body[key] !== undefined) update[key] = req.body[key]; }
    const election = await Election.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(election);
  } catch { res.status(500).json({ error: 'Failed to update election' }); }
});

// Admin: remove candidate
router.delete('/:id/candidates/:candidateId', requireAdmin, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });
    const candidate = election.candidates.id(req.params.candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    election.candidates.pull(req.params.candidateId);
    await election.save();
    res.json({ message: 'Candidate removed' });
  } catch { res.status(500).json({ error: 'Failed to remove candidate' }); }
});

// Get election results — admin gets full results, members get results for closed elections
router.get('/:id/results', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('candidates.member', 'fullName regNumber department');
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
    await Election.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
