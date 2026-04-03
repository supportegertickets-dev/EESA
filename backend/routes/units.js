const express = require('express');
const Unit = require('../models/Unit');
const Assignment = require('../models/Assignment');
const { requireMember, requireLecturer, requireAdmin } = require('../middleware/auth');
const router = express.Router();

/* ============================
   UNITS
   ============================ */

// List units — for members: units they are enrolled in + available units
// For lecturers: their own units
router.get('/', async (req, res) => {
  try {
    if (req.session?.lecturer) {
      const units = await Unit.find({ lecturer: req.session.lecturer.id })
        .populate('students', 'fullName regNumber department yearOfStudy')
        .select('-attendanceSessions');
      return res.json(units);
    }
    if (req.session?.member) {
      const allUnits = await Unit.find()
        .populate('lecturer', 'fullName title department staffId')
        .select('-attendanceSessions');
      const result = allUnits.map(u => {
        const obj = u.toObject();
        obj.studentCount = obj.students.length;
        obj.isEnrolled = obj.students.some(s => s.toString() === req.session.member.id);
        delete obj.students;
        return obj;
      });
      return res.json(result);
    }
    res.status(401).json({ error: 'Login required' });
  } catch { res.status(500).json({ error: 'Failed to fetch units' }); }
});

// Get unit detail
router.get('/:id', async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id)
      .populate('lecturer', 'fullName title department staffId email')
      .populate('students', 'fullName regNumber department yearOfStudy');
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    const obj = unit.toObject();
    if (req.session?.member) {
      obj.isEnrolled = obj.students.some(s => s._id.toString() === req.session.member.id);
    }
    res.json(obj);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Member: register for a unit
router.post('/:id/register', requireMember, async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    const memberId = req.session.member.id;
    if (unit.students.some(s => s.toString() === memberId))
      return res.status(409).json({ error: 'Already registered for this unit' });
    unit.students.push(memberId);
    await unit.save();
    res.json({ message: 'Registered for ' + unit.code + ' successfully!' });
  } catch { res.status(500).json({ error: 'Failed to register' }); }
});

// Member: unregister from a unit
router.post('/:id/unregister', requireMember, async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    unit.students = unit.students.filter(s => s.toString() !== req.session.member.id);
    await unit.save();
    res.json({ message: 'Unregistered from ' + unit.code });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Lecturer: create unit
router.post('/', requireLecturer, async (req, res) => {
  try {
    const { code, name, department, yearOfStudy, semester } = req.body;
    if (!code || !name || !department || !yearOfStudy || !semester)
      return res.status(400).json({ error: 'All fields required' });
    const unit = await Unit.create({ code, name, department, yearOfStudy, semester, lecturer: req.session.lecturer.id });
    res.status(201).json(unit);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Unit code already exists' });
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

// Lecturer: update unit
router.put('/:id', requireLecturer, async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (unit.lecturer.toString() !== req.session.lecturer.id)
      return res.status(403).json({ error: 'Not your unit' });
    const allowed = ['name', 'department', 'yearOfStudy', 'semester'];
    for (const key of allowed) { if (req.body[key] !== undefined) unit[key] = req.body[key]; }
    await unit.save();
    res.json(unit);
  } catch { res.status(500).json({ error: 'Failed to update' }); }
});

/* ============================
   ATTENDANCE (Unit-based)
   ============================ */

// Lecturer: create attendance session
router.post('/:id/attendance', requireLecturer, async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (unit.lecturer.toString() !== req.session.lecturer.id)
      return res.status(403).json({ error: 'Not your unit' });
    const { date, topic, presentStudentIds } = req.body;
    unit.attendanceSessions.push({
      date: date || new Date(),
      topic,
      present: presentStudentIds || []
    });
    await unit.save();
    res.status(201).json(unit.attendanceSessions[unit.attendanceSessions.length - 1]);
  } catch { res.status(500).json({ error: 'Failed to create attendance session' }); }
});

// Get attendance sessions for a unit
router.get('/:id/attendance', async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id)
      .populate('attendanceSessions.present', 'fullName regNumber');
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    // Lecturer sees all; student sees their own attendance
    if (req.session?.lecturer && unit.lecturer.toString() === req.session.lecturer.id) {
      return res.json(unit.attendanceSessions);
    }
    if (req.session?.member) {
      const sessions = unit.attendanceSessions.map(s => ({
        _id: s._id,
        date: s.date,
        topic: s.topic,
        wasPresent: s.present.some(p => (p._id || p).toString() === req.session.member.id),
        totalPresent: s.present.length
      }));
      return res.json(sessions);
    }
    res.status(401).json({ error: 'Login required' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

/* ============================
   ASSIGNMENTS
   ============================ */

// Lecturer: create assignment for a unit
router.post('/:id/assignments', requireLecturer, async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (unit.lecturer.toString() !== req.session.lecturer.id)
      return res.status(403).json({ error: 'Not your unit' });
    const { title, description, dueDate } = req.body;
    if (!title || !dueDate) return res.status(400).json({ error: 'Title and due date required' });
    const assignment = await Assignment.create({
      unit: unit._id, lecturer: req.session.lecturer.id,
      title, description, dueDate
    });
    res.status(201).json(assignment);
  } catch { res.status(500).json({ error: 'Failed to create assignment' }); }
});

// Get assignments for a unit
router.get('/:id/assignments', async (req, res) => {
  try {
    const assignments = await Assignment.find({ unit: req.params.id })
      .populate('lecturer', 'fullName title')
      .sort({ dueDate: -1 });
    // If member, strip other students' submissions
    if (req.session?.member) {
      const memberId = req.session.member.id;
      const safe = assignments.map(a => {
        const obj = a.toObject();
        obj.mySubmission = obj.submissions.find(s => s.student?.toString() === memberId) || null;
        obj.submissionCount = obj.submissions.length;
        delete obj.submissions;
        return obj;
      });
      return res.json(safe);
    }
    res.json(assignments);
  } catch { res.status(500).json({ error: 'Failed to fetch assignments' }); }
});

// Member: submit assignment
router.post('/assignments/:assignmentId/submit', requireMember, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    const memberId = req.session.member.id;
    // Check student is enrolled in the unit
    const unit = await Unit.findById(assignment.unit);
    if (!unit || !unit.students.some(s => s.toString() === memberId))
      return res.status(403).json({ error: 'You are not enrolled in this unit' });
    // Check if already submitted
    const existing = assignment.submissions.find(s => s.student.toString() === memberId);
    if (existing) return res.status(409).json({ error: 'Already submitted' });
    assignment.submissions.push({ student: memberId, notes: req.body.notes || '' });
    await assignment.save();
    res.json({ message: 'Assignment submitted!' });
  } catch { res.status(500).json({ error: 'Submission failed' }); }
});

module.exports = router;
