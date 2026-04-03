const express = require('express');
const Notification = require('../models/Notification');
const { requireMember, requireAdmin, requireLecturer } = require('../middleware/auth');
const router = express.Router();

// Get notifications for current user (member, lecturer, or admin)
router.get('/', async (req, res) => {
  try {
    let recipientId, recipientModel;
    if (req.session?.member) { recipientId = req.session.member.id; recipientModel = 'Member'; }
    else if (req.session?.lecturer) { recipientId = req.session.lecturer.id; recipientModel = 'Lecturer'; }
    else if (req.session?.admin) { recipientId = req.session.admin.id; recipientModel = 'Admin'; }
    else return res.status(401).json({ error: 'Login required' });

    const { unread } = req.query;
    const filter = { recipient: recipientId, recipientModel };
    if (unread === 'true') filter.read = false;
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ recipient: recipientId, recipientModel, read: false });
    res.json({ notifications, unreadCount });
  } catch { res.status(500).json({ error: 'Failed to fetch notifications' }); }
});

// Mark one as read
router.put('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Not found' });
    notif.read = true;
    notif.readAt = new Date();
    await notif.save();
    res.json({ message: 'Marked as read' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    let recipientId;
    if (req.session?.member) recipientId = req.session.member.id;
    else if (req.session?.lecturer) recipientId = req.session.lecturer.id;
    else if (req.session?.admin) recipientId = req.session.admin.id;
    else return res.status(401).json({ error: 'Login required' });

    await Notification.updateMany(
      { recipient: recipientId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ message: 'All marked as read' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Admin: send notification to all members or specific member
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, message, type, link, recipientId, broadcast } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required' });

    if (broadcast) {
      const Member = require('../models/Member');
      const members = await Member.find({ status: 'active' }).select('_id');
      const notifications = members.map(m => ({
        recipient: m._id, recipientModel: 'Member',
        type: type || 'system', title, message, link
      }));
      await Notification.insertMany(notifications);
      return res.json({ message: `Sent to ${notifications.length} members` });
    }

    if (recipientId) {
      const notif = await Notification.create({
        recipient: recipientId, recipientModel: 'Member',
        type: type || 'system', title, message, link
      });
      return res.json(notif);
    }

    res.status(400).json({ error: 'Provide recipientId or set broadcast: true' });
  } catch { res.status(500).json({ error: 'Failed to send notification' }); }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
