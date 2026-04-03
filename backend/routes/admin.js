const express = require('express');
const Member = require('../models/Member');
const Event = require('../models/Event');
const Project = require('../models/Project');
const Announcement = require('../models/Announcement');
const Payment = require('../models/Payment');
const Resource = require('../models/Resource');
const Election = require('../models/Election');
const Attendance = require('../models/Attendance');
const Sponsor = require('../models/Sponsor');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [totalMembers, activeMembers, pendingMembers, totalEvents, upcomingEvents,
           totalProjects, ongoingProjects, totalAnnouncements, pendingPayments, totalRevenue,
           totalResources, totalElections, activeElections, totalSponsors, totalAttendanceRecords] = await Promise.all([
      Member.countDocuments(),
      Member.countDocuments({ status: 'active' }),
      Member.countDocuments({ status: 'pending' }),
      Event.countDocuments(),
      Event.countDocuments({ status: 'upcoming' }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'ongoing' }),
      Announcement.countDocuments(),
      Payment.countDocuments({ status: 'pending' }),
      Payment.aggregate([{ $match: { status: 'confirmed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Resource.countDocuments(),
      Election.countDocuments(),
      Election.countDocuments({ status: 'active' }),
      Sponsor.countDocuments({ isActive: true }),
      Attendance.countDocuments()
    ]);

    const membersByDept = await Member.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const membersByYear = await Member.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$yearOfStudy', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const recentMembers = await Member.find().select('fullName department regNumber createdAt status isVerified').sort({ createdAt: -1 }).limit(5);
    const nextEvents = await Event.find({ status: 'upcoming' }).select('title date location category').sort({ date: 1 }).limit(5);
    const pinnedAnnouncements = await Announcement.find({ isPinned: true }).sort({ createdAt: -1 }).limit(3);
    const recentPayments = await Payment.find().populate('member', 'fullName regNumber').sort({ createdAt: -1 }).limit(10);

    res.json({
      totalMembers, activeMembers, pendingMembers, totalEvents, upcomingEvents,
      totalProjects, ongoingProjects, totalAnnouncements, pendingPayments,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalResources, totalElections, activeElections, totalSponsors, totalAttendanceRecords,
      membersByDept, membersByYear, recentMembers, nextEvents, pinnedAnnouncements, recentPayments
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

module.exports = router;
