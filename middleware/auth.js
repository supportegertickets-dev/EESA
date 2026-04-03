function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: 'Admin authentication required' });
}

function requireMember(req, res, next) {
  if (req.session && req.session.member) return next();
  res.status(401).json({ error: 'Member login required' });
}

function requireVerifiedMember(req, res, next) {
  if (req.session && req.session.member && req.session.member.isVerified) return next();
  res.status(403).json({ error: 'Account not yet verified. Please complete payment and await admin verification.' });
}

function requireLecturer(req, res, next) {
  if (req.session && req.session.lecturer) return next();
  res.status(401).json({ error: 'Lecturer login required' });
}

module.exports = { requireAdmin, requireMember, requireVerifiedMember, requireLecturer };
