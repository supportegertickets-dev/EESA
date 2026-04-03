/**
 * EESA MongoDB Seed Script
 * Seeds admin accounts, sample members, events, announcements, and projects
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');


const Admin = require('./models/Admin');
const Member = require('./models/Member');
const Event = require('./models/Event');
const Announcement = require('./models/Announcement');
const Project = require('./models/Project');
const Payment = require('./models/Payment');
const Resource = require('./models/Resource');
const Election = require('./models/Election');
const Sponsor = require('./models/Sponsor');
const Attendance = require('./models/Attendance');
const Lecturer = require('./models/Lecturer');
const Unit = require('./models/Unit');
const Assignment = require('./models/Assignment');
const Notification = require('./models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eesa';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  try {

  // Clear existing data
  await Promise.all([
    Admin.deleteMany({}),
    Member.deleteMany({}),
    Event.deleteMany({}),
    Announcement.deleteMany({}),
    Project.deleteMany({}),
    Payment.deleteMany({}),
    Resource.deleteMany({}),
    Election.deleteMany({}),
    Sponsor.deleteMany({}),
    Attendance.deleteMany({})
  ]);
  await Promise.all([
    Lecturer.deleteMany({}),
    Unit.deleteMany({}),
    Assignment.deleteMany({}),
    Notification.deleteMany({})
  ]);
  console.log('Cleared existing data');

  // ---- Admins ----
  const admins = await Admin.create([
    { username: 'admin', password: 'admin123', fullName: 'System Administrator', role: 'superadmin' },
    { username: 'chairperson', password: 'chair2024', fullName: 'EESA Chairperson', role: 'admin' }
  ]);
  console.log(`Created ${admins.length} admins`);

  // ---- Members ----
  const membersData = [
    { regNumber: 'EN101-0001/2024', fullName: 'John Kamau', email: 'john.kamau@students.egerton.ac.ke', phone: '0712345678', department: 'Electrical & Electronic Engineering', yearOfStudy: 3, gender: 'Male', password: 'member123', isVerified: true, registrationPaid: true, status: 'active', currentSemester: '2025 Sem 1' },
    { regNumber: 'EN101-0002/2024', fullName: 'Grace Wanjiku', email: 'grace.wanjiku@students.egerton.ac.ke', phone: '0723456789', department: 'Civil Engineering', yearOfStudy: 2, gender: 'Female', password: 'member123', isVerified: true, registrationPaid: true, status: 'active', currentSemester: '2025 Sem 1' },
    { regNumber: 'EN101-0003/2023', fullName: 'David Ochieng', email: 'david.ochieng@students.egerton.ac.ke', phone: '0734567890', department: 'Mechanical Engineering', yearOfStudy: 4, gender: 'Male', password: 'member123', isVerified: true, registrationPaid: true, status: 'active', currentSemester: '2025 Sem 1' },
    { regNumber: 'EN101-0004/2024', fullName: 'Faith Muthoni', email: 'faith.muthoni@students.egerton.ac.ke', phone: '0745678901', department: 'Agricultural Engineering', yearOfStudy: 1, gender: 'Female', password: 'member123', isVerified: false, registrationPaid: false, status: 'pending' },
    { regNumber: 'EN101-0005/2023', fullName: 'Peter Njoroge', email: 'peter.njoroge@students.egerton.ac.ke', phone: '0756789012', department: 'Electrical & Electronic Engineering', yearOfStudy: 3, gender: 'Male', password: 'member123', isVerified: true, registrationPaid: true, status: 'active', currentSemester: '2025 Sem 1' },
    { regNumber: 'EN101-0006/2024', fullName: 'Sarah Atieno', email: 'sarah.atieno@students.egerton.ac.ke', phone: '0767890123', department: 'Civil Engineering', yearOfStudy: 2, gender: 'Female', password: 'member123', isVerified: false, registrationPaid: true, status: 'pending' },
    { regNumber: 'EN101-0007/2023', fullName: 'James Kiprop', email: 'james.kiprop@students.egerton.ac.ke', phone: '0778901234', department: 'Mechanical Engineering', yearOfStudy: 3, gender: 'Male', password: 'member123', isVerified: true, registrationPaid: true, status: 'active', currentSemester: '2025 Sem 1' },
    { regNumber: 'EN101-0008/2024', fullName: 'Mary Chebet', email: 'mary.chebet@students.egerton.ac.ke', phone: '0789012345', department: 'Agricultural Engineering', yearOfStudy: 1, gender: 'Female', password: 'member123', isVerified: true, registrationPaid: true, status: 'active', currentSemester: '2025 Sem 1' }
  ];
  const members = await Member.create(membersData);
  console.log(`Created ${members.length} members`);

  // ---- Payments (for verified members) ----
  const verifiedMembers = members.filter(m => m.registrationPaid);
  const payments = await Payment.create(verifiedMembers.map(m => ({
    member: m._id,
    type: 'registration',
    amount: 100,
    mpesaCode: 'SLK' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    status: 'confirmed',
    confirmedBy: admins[0]._id,
    semester: '2025 Sem 1'
  })));
  console.log(`Created ${payments.length} payments`);

  // ---- Events ----
  const events = await Event.create([
    {
      title: 'Annual Engineering Exhibition 2025',
      description: 'Showcase innovative engineering projects from all departments. Students present their year-long projects to industry professionals, faculty, and fellow students.',
      date: new Date('2025-09-15T09:00:00'),
      location: 'Engineering Complex Hall A',
      category: 'competition',
      maxParticipants: 100,
      status: 'upcoming',
      createdBy: admins[0]._id,
      registrations: members.slice(0, 4).map(m => ({ member: m._id }))
    },
    {
      title: 'AutoCAD & SolidWorks Workshop',
      description: 'Hands-on workshop covering AutoCAD 2025 and SolidWorks fundamentals. Bring your laptops with the software pre-installed.',
      date: new Date('2025-08-20T14:00:00'),
      location: 'Computer Lab 3, Engineering Block',
      category: 'workshop',
      maxParticipants: 40,
      status: 'upcoming',
      createdBy: admins[1]._id,
      registrations: members.slice(0, 3).map(m => ({ member: m._id }))
    },
    {
      title: 'Industry Talk: Engineering in Kenya',
      description: 'Guest speaker from Kenya Power discussing career opportunities and the future of engineering in Kenya.',
      date: new Date('2025-08-05T10:00:00'),
      location: 'Main Auditorium',
      category: 'seminar',
      maxParticipants: 200,
      status: 'upcoming',
      createdBy: admins[0]._id,
      registrations: members.slice(0, 6).map(m => ({ member: m._id }))
    },
    {
      title: 'EESA General Meeting — Semester 1',
      description: 'First general meeting of the semester. Agenda: budget review, upcoming activities, elections update.',
      date: new Date('2025-07-28T16:00:00'),
      location: 'Lecture Hall 5',
      category: 'meeting',
      status: 'upcoming',
      createdBy: admins[1]._id,
      registrations: members.slice(0, 5).map(m => ({ member: m._id }))
    }
  ]);
  console.log(`Created ${events.length} events`);

  // ---- Announcements ----
  const announcements = await Announcement.create([
    {
      title: 'Welcome to EESA Portal!',
      content: 'We are excited to launch the new EESA digital portal. Members can now register, pay fees, view events, and stay updated — all in one place. Sign up today!',
      priority: 'high',
      targetAudience: 'all',
      isPinned: true,
      createdBy: admins[0]._id
    },
    {
      title: 'Registration Fee Payment Deadline',
      content: 'All new members must pay the KSh 100 registration fee by August 15th, 2025 to be verified. Use M-Pesa and submit your transaction code via the portal.',
      priority: 'urgent',
      targetAudience: 'members',
      isPinned: true,
      createdBy: admins[0]._id
    },
    {
      title: 'Semester Renewal Now Open',
      content: 'Active members, please renew your membership for this semester. The renewal fee is KSh 50 via M-Pesa. Login to your portal to submit your payment code.',
      priority: 'normal',
      targetAudience: 'members',
      createdBy: admins[1]._id
    },
    {
      title: 'Engineering Exhibition Submissions Open',
      content: 'Submit your project proposals for the 2025 Annual Engineering Exhibition. Deadline: August 30th. See the events section for details and registration.',
      priority: 'high',
      targetAudience: 'all',
      createdBy: admins[1]._id
    },
    {
      title: 'EESA T-Shirts Available',
      content: 'Official EESA branded t-shirts are now available for KSh 500. Contact any committee member to place your order. Available sizes: S, M, L, XL, XXL.',
      priority: 'normal',
      targetAudience: 'all',
      createdBy: admins[0]._id
    }
  ]);
  console.log(`Created ${announcements.length} announcements`);

  // ---- Projects ----
  const projects = await Project.create([
    {
      title: 'Solar-Powered Water Pump System',
      description: 'Design and implementation of a solar-powered water pump for Egerton University farm. Uses photovoltaic panels and DC motor pump system.',
      department: 'Electrical & Electronic Engineering',
      status: 'in-progress',
      budget: 45000,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-10-30'),
      createdBy: admins[0]._id,
      members: [{ member: members[0]._id, role: 'lead' }, { member: members[4]._id, role: 'member' }]
    },
    {
      title: 'Campus Road Assessment Survey',
      description: 'Comprehensive survey and assessment of road conditions within Egerton University main campus, with recommendations for repair priorities.',
      department: 'Civil Engineering',
      status: 'completed',
      budget: 15000,
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-04-30'),
      createdBy: admins[1]._id,
      members: [{ member: members[1]._id, role: 'lead' }, { member: members[5]._id, role: 'member' }]
    },
    {
      title: 'Automated Greenhouse Control System',
      description: 'Building an IoT-based greenhouse monitoring and control system using Arduino and ESP32 for temperature, humidity, and irrigation management.',
      department: 'Agricultural Engineering',
      status: 'in-progress',
      budget: 30000,
      startDate: new Date('2025-05-01'),
      createdBy: admins[0]._id,
      members: [{ member: members[7]._id, role: 'lead' }, { member: members[0]._id, role: 'member' }, { member: members[2]._id, role: 'member' }]
    },
    {
      title: 'Mini Wind Turbine Prototype',
      description: 'Design and fabrication of a small-scale wind turbine for power generation, targeting rural electrification demonstrations.',
      department: 'Mechanical Engineering',
      status: 'planning',
      budget: 25000,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-03-30'),
      createdBy: admins[1]._id,
      members: [{ member: members[2]._id, role: 'lead' }, { member: members[6]._id, role: 'member' }]
    }
  ]);
  console.log(`Created ${projects.length} projects`);

  // ---- Resources ----
  const resources = await Resource.create([
    {
      title: 'Engineering Mathematics I — Past Papers 2020-2024',
      description: 'Collection of past exam papers for Engineering Mathematics I covering calculus, linear algebra, and differential equations.',
      category: 'past-papers',
      department: 'General',
      yearOfStudy: 1,
      externalLink: 'https://example.com/math-papers',
      downloads: 45,
      uploadedBy: admins[0]._id,
      isPublic: true
    },
    {
      title: 'Circuit Theory Lab Manual',
      description: 'Complete lab manual for EEE 201 — Circuit Theory. Includes all experiments, procedures, and sample reports.',
      category: 'lab-manuals',
      department: 'Electrical & Electronic Engineering',
      yearOfStudy: 2,
      externalLink: 'https://example.com/circuit-lab',
      downloads: 32,
      uploadedBy: admins[0]._id,
      isPublic: false
    },
    {
      title: 'AutoCAD 2024 Tutorial Series',
      description: 'Step-by-step video tutorial series covering 2D drafting, 3D modeling, and rendering in AutoCAD 2024.',
      category: 'tutorials',
      department: 'Civil Engineering',
      yearOfStudy: 2,
      externalLink: 'https://example.com/autocad-tutorials',
      downloads: 67,
      uploadedBy: admins[1]._id,
      isPublic: true
    },
    {
      title: 'Fluid Mechanics Notes — Dr. Kamau',
      description: 'Comprehensive lecture notes for Fluid Mechanics (MEC 301) as taught by Dr. Kamau, 2024 edition.',
      category: 'notes',
      department: 'Mechanical Engineering',
      yearOfStudy: 3,
      externalLink: 'https://example.com/fluid-notes',
      downloads: 28,
      uploadedBy: admins[0]._id,
      isPublic: false
    },
    {
      title: 'Soil Mechanics Past Papers 2022-2024',
      description: 'Past exam papers for Soil Mechanics (AGE 302) with marking schemes where available.',
      category: 'past-papers',
      department: 'Agricultural Engineering',
      yearOfStudy: 3,
      externalLink: 'https://example.com/soil-papers',
      downloads: 19,
      uploadedBy: admins[1]._id,
      isPublic: false
    },
    {
      title: 'Arduino Programming Basics',
      description: 'Introductory guide to Arduino programming for engineering students. Covers setup, digital/analog I/O, and common sensors.',
      category: 'tutorials',
      department: 'Electrical & Electronic Engineering',
      yearOfStudy: 2,
      externalLink: 'https://example.com/arduino-guide',
      downloads: 53,
      uploadedBy: admins[0]._id,
      isPublic: true
    }
  ]);
  console.log(`Created ${resources.length} resources`);

  // ---- Sponsors ----
  const sponsors = await Sponsor.create([
    {
      name: 'Kenya Power & Lighting Company',
      description: 'Kenya\'s national electric utility company. Long-standing partner providing industrial attachment opportunities and funding for electrical engineering projects.',
      tier: 'platinum',
      website: 'https://www.kplc.co.ke',
      isActive: true,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-12-31'),
      createdBy: admins[0]._id
    },
    {
      name: 'Safaricom PLC',
      description: 'East Africa\'s leading telecommunications company. Sponsors the annual Engineering Exhibition and provides M-Pesa integration support.',
      tier: 'gold',
      website: 'https://www.safaricom.co.ke',
      isActive: true,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2026-05-31'),
      createdBy: admins[0]._id
    },
    {
      name: 'Engineers Board of Kenya',
      description: 'Kenya\'s professional engineering regulatory body. Partners on accreditation, career talks, and professional development.',
      tier: 'gold',
      website: 'https://www.ebk.go.ke',
      isActive: true,
      startDate: new Date('2024-01-01'),
      createdBy: admins[0]._id
    },
    {
      name: 'Bamburi Cement',
      description: 'Leading cement manufacturer. Provides sponsorship for civil engineering projects and site visits.',
      tier: 'silver',
      website: 'https://www.lafargeafrica.com',
      isActive: true,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      createdBy: admins[1]._id
    },
    {
      name: 'Toyota Kenya',
      description: 'Official automotive partner for mechanical engineering workshops and automotive systems training.',
      tier: 'silver',
      website: 'https://www.toyotakenya.com',
      isActive: true,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2026-02-28'),
      createdBy: admins[1]._id
    },
    {
      name: 'National Construction Authority',
      description: 'Government agency supporting civil engineering field training and site visit programmes.',
      tier: 'bronze',
      website: 'https://www.nca.go.ke',
      isActive: true,
      createdBy: admins[0]._id
    }
  ]);
  console.log(`Created ${sponsors.length} sponsors`);

  // ---- Elections ----
  const verifiedMemberIds = members.filter(m => m.isVerified);
  const elections = await Election.create([
    {
      title: 'EESA Executive Council Elections 2025/2026',
      description: 'Annual elections for the EESA executive council positions. All verified members are eligible to vote and contest.',
      positions: ['Chairperson', 'Vice Chairperson', 'Secretary General', 'Treasurer'],
      candidates: [
        { member: verifiedMemberIds[0]._id, position: 'Chairperson', manifesto: 'I will champion industry partnerships, expand our workshop calendar, and ensure every member gets an industrial attachment opportunity before graduation.', votes: 12 },
        { member: verifiedMemberIds[1]._id, position: 'Chairperson', manifesto: 'My vision is to make EESA the most active student association in Egerton through weekly technical sessions and inter-university competitions.', votes: 8 },
        { member: verifiedMemberIds[2]._id, position: 'Vice Chairperson', manifesto: 'I will coordinate departmental representatives and ensure all four departments are equally represented in EESA activities.', votes: 15 },
        { member: verifiedMemberIds[4]._id, position: 'Secretary General', manifesto: 'I will digitize all EESA records, ensure timely communication, and maintain an updated member database.', votes: 18 },
        { member: verifiedMemberIds[5]._id, position: 'Treasurer', manifesto: 'I bring transparency and accountability. Monthly financial reports will be shared with all members via the portal.', votes: 10 },
        { member: verifiedMemberIds[0]._id, position: 'Treasurer', manifesto: 'I will diversify our revenue streams through partnerships and fundraising events to fund more student projects.', votes: 14 }
      ],
      voters: verifiedMemberIds.slice(0, 5).map(m => m._id),
      status: 'closed',
      startDate: new Date('2025-10-01T08:00:00'),
      endDate: new Date('2025-10-03T17:00:00'),
      createdBy: admins[0]._id
    },
    {
      title: 'Best Project Award Vote — Semester 1, 2026',
      description: 'Vote for the most innovative student project this semester. Winners receive a certificate and showcase opportunity at the Engineering Exhibition.',
      positions: ['Best Overall Project', 'Most Innovative'],
      candidates: [
        { member: verifiedMemberIds[0]._id, position: 'Best Overall Project', manifesto: 'Solar-Powered Water Pump System — An affordable solar pumping solution for smallholder farmers.', votes: 0 },
        { member: verifiedMemberIds[1]._id, position: 'Best Overall Project', manifesto: 'Campus Road Assessment Survey — Comprehensive GIS-mapped road condition report with repair priorities.', votes: 0 },
        { member: verifiedMemberIds[5]._id, position: 'Most Innovative', manifesto: 'Automated Greenhouse Control — IoT-based greenhouse with real-time monitoring and automatic irrigation.', votes: 0 },
        { member: verifiedMemberIds[2]._id, position: 'Most Innovative', manifesto: 'Mini Wind Turbine Prototype — Small-scale wind energy for rural communities.', votes: 0 }
      ],
      voters: [],
      status: 'active',
      startDate: new Date('2026-03-25T08:00:00'),
      endDate: new Date('2026-04-05T17:00:00'),
      createdBy: admins[0]._id
    }
  ]);
  console.log(`Created ${elections.length} elections`);

  // ---- Attendance Records ----
  const attendanceRecords = await Attendance.create([
    { event: events[0]._id, member: members[0]._id, method: 'manual', markedBy: admins[0]._id, checkInTime: new Date('2025-09-15T09:15:00') },
    { event: events[0]._id, member: members[1]._id, method: 'manual', markedBy: admins[0]._id, checkInTime: new Date('2025-09-15T09:20:00') },
    { event: events[0]._id, member: members[2]._id, method: 'self', checkInTime: new Date('2025-09-15T09:30:00') },
    { event: events[0]._id, member: members[4]._id, method: 'manual', markedBy: admins[0]._id, checkInTime: new Date('2025-09-15T09:10:00') },
    { event: events[1]._id, member: members[0]._id, method: 'self', checkInTime: new Date('2025-08-20T14:05:00') },
    { event: events[1]._id, member: members[1]._id, method: 'self', checkInTime: new Date('2025-08-20T14:10:00') },
    { event: events[1]._id, member: members[6]._id, method: 'manual', markedBy: admins[1]._id, checkInTime: new Date('2025-08-20T14:15:00') },
    { event: events[2]._id, member: members[0]._id, method: 'manual', markedBy: admins[0]._id, checkInTime: new Date('2025-08-05T10:05:00') },
    { event: events[2]._id, member: members[2]._id, method: 'manual', markedBy: admins[0]._id, checkInTime: new Date('2025-08-05T10:10:00') },
    { event: events[2]._id, member: members[4]._id, method: 'self', checkInTime: new Date('2025-08-05T10:15:00') },
    { event: events[2]._id, member: members[5]._id, method: 'self', checkInTime: new Date('2025-08-05T10:20:00') },
    { event: events[3]._id, member: members[0]._id, method: 'manual', markedBy: admins[1]._id, checkInTime: new Date('2025-07-28T16:05:00') },
    { event: events[3]._id, member: members[1]._id, method: 'manual', markedBy: admins[1]._id, checkInTime: new Date('2025-07-28T16:10:00') },
    { event: events[3]._id, member: members[7]._id, method: 'self', checkInTime: new Date('2025-07-28T16:12:00') }
  ]);
  console.log(`Created ${attendanceRecords.length} attendance records`);

  // ---- Lecturers ----
  const lecturers = await Lecturer.create([
    { staffId: 'STAFF001', fullName: 'James Mwangi', email: 'j.mwangi@egerton.ac.ke', password: 'lecturer123', phone: '0700111222', department: 'Electrical & Electronic Engineering', title: 'Dr.' },
    { staffId: 'STAFF002', fullName: 'Alice Wambui', email: 'a.wambui@egerton.ac.ke', password: 'lecturer123', phone: '0700333444', department: 'Mechanical Engineering', title: 'Prof.' },
    { staffId: 'STAFF003', fullName: 'Robert Kiptoo', email: 'r.kiptoo@egerton.ac.ke', password: 'lecturer123', phone: '0700555666', department: 'Civil Engineering', title: 'Eng.' }
  ]);
  console.log(`Created ${lecturers.length} lecturers`);

  // ---- Units ----
  const units = await Unit.create([
    { code: 'EEE 2101', name: 'Circuit Theory II', lecturer: lecturers[0]._id, department: 'Electrical & Electronic Engineering', yearOfStudy: 2, semester: 1, students: [members[0]._id, members[4]._id, members[1]._id] },
    { code: 'EEE 3201', name: 'Signal Processing', lecturer: lecturers[0]._id, department: 'Electrical & Electronic Engineering', yearOfStudy: 3, semester: 1, students: [members[0]._id, members[4]._id, members[6]._id] },
    { code: 'MEC 2102', name: 'Thermodynamics I', lecturer: lecturers[1]._id, department: 'Mechanical Engineering', yearOfStudy: 2, semester: 1, students: [members[2]._id, members[6]._id] },
    { code: 'CIV 3101', name: 'Structural Analysis', lecturer: lecturers[2]._id, department: 'Civil Engineering', yearOfStudy: 3, semester: 1, students: [members[1]._id, members[5]._id] }
  ]);
  console.log(`Created ${units.length} units`);

  // ---- Assignments ----
  const assignments = await Assignment.create([
    { unit: units[0]._id, lecturer: lecturers[0]._id, title: 'Circuit Analysis Lab Report', description: 'Analyze the RC and RL circuits from Lab 3. Show all calculations.', dueDate: new Date('2025-09-01T23:59:00') },
    { unit: units[1]._id, lecturer: lecturers[0]._id, title: 'Fourier Transform Assignment', description: 'Compute the DFT of the given signals and plot magnitude/phase spectra.', dueDate: new Date('2025-08-25T23:59:00') },
    { unit: units[2]._id, lecturer: lecturers[1]._id, title: 'Carnot Cycle Problems', description: 'Solve problems 1-5 from Chapter 4 of the textbook.', dueDate: new Date('2025-09-05T23:59:00') }
  ]);
  console.log(`Created ${assignments.length} assignments`);

  // ---- Notifications (sample for active members) ----
  const notifications = await Notification.create([
    { recipient: members[0]._id, recipientModel: 'Member', type: 'event', title: 'New Event: Engineering Exhibition', message: 'The Annual Engineering Exhibition 2025 has been announced. Register now!', link: 'events' },
    { recipient: members[0]._id, recipientModel: 'Member', type: 'announcement', title: 'Welcome Back!', message: 'Welcome to the new semester. Check out the latest announcements.', link: 'announcements' },
    { recipient: members[0]._id, recipientModel: 'Member', type: 'payment', title: 'Membership Verified', message: 'Your latest payment has been received. Check your membership page for your current status.', link: 'membership' },
    { recipient: members[1]._id, recipientModel: 'Member', type: 'system', title: 'New Resources Available', message: 'Fresh learning materials have been added to the resource library.', link: 'resources' }
  ]);
  console.log(`Created ${notifications.length} notifications`);

  console.log('\n=== Seed Complete ===');
  console.log('Admin logins:');
  console.log('  admin / admin123 (superadmin)');
  console.log('  chairperson / chair2024');
  console.log('Member logins (all use password: member123):');
  console.log('  john.kamau@students.egerton.ac.ke (active, verified, Chairperson)');
  console.log('  grace.wanjiku@students.egerton.ac.ke (active, verified)');
  console.log('  faith.muthoni@students.egerton.ac.ke (pending, not verified)');
  console.log('  sarah.atieno@students.egerton.ac.ke (pending, paid but not verified)');
  console.log('Lecturer logins (all use password: lecturer123):');
  console.log('  j.mwangi@egerton.ac.ke (Dr. James Mwangi)');
  console.log('  a.wambui@egerton.ac.ke (Prof. Alice Wambui)');
  console.log('  r.kiptoo@egerton.ac.ke (Eng. Robert Kiptoo)');

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
  } catch (err) {
    console.error('Error during seeding:', err.message || err);
    if (err.errors) console.error('Details:', JSON.stringify(err.errors, null, 2));
    if (err.code) console.error('Code:', err.code);
    await mongoose.disconnect();
    throw err;
  }
}

seed().then(() => {
  console.log('Seed finished successfully');
  process.exit(0);
}).catch(err => {
  console.error('Seed failed:', err.message || err);
  if (err.errors) console.error('Validation errors:', JSON.stringify(err.errors, null, 2));
  process.exit(1);
});
