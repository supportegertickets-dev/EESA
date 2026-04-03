import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const defaultRole = useMemo(() => {
    if (params.role && ['admin', 'lecturer', 'sponsor', 'member'].includes(params.role)) return params.role;
    if (location.pathname.startsWith('/admin')) return 'admin';
    if (location.pathname.startsWith('/lecturer')) return 'lecturer';
    if (location.pathname.startsWith('/sponsor')) return 'sponsor';
    return 'member';
  }, [location.pathname, params.role]);

  const [activeRole, setActiveRole] = useState(defaultRole);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* form fields */
  const [mEmail, setMEmail] = useState('');
  const [mPass, setMPass] = useState('');
  const [aUser, setAUser] = useState('');
  const [aPass, setAPass] = useState('');
  const [lEmail, setLEmail] = useState('');
  const [lPass, setLPass] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPass, setSPass] = useState('');

  /* lecturer register */
  const [showRegister, setShowRegister] = useState(false);
  const [reg, setReg] = useState({ fullName: '', staffId: '', email: '', phone: '', department: '', title: 'Mr.', password: '' });
  const [regMsg, setRegMsg] = useState('');

  const handleSubmit = async (e, role) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let creds;
      if (role === 'member') creds = { email: mEmail, password: mPass };
      else if (role === 'admin') creds = { username: aUser, password: aPass };
      else if (role === 'lecturer') creds = { email: lEmail, password: lPass };
      else creds = { email: sEmail, password: sPass };
      await login(role, creds);
      const dest = role === 'member' ? '/portal' : role === 'admin' ? '/admin' : role === 'lecturer' ? '/lecturer' : '/sponsor';
      navigate(dest);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegMsg('');
    try {
      const res = await fetch('/api/auth/lecturer/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setRegMsg('Registered successfully! Please login.');
      setShowRegister(false);
    } catch (err) {
      setRegMsg(err.message);
    }
  };

  const roles = [
    { key: 'member', label: 'Member' },
    { key: 'admin', label: 'Admin' },
    { key: 'lecturer', label: 'Lecturer' },
    { key: 'sponsor', label: 'Sponsor' }
  ];

  return (
    <div className="admin-login-screen" style={{ display: 'flex' }}>
      <div className="login-card">
        <div className="login-header">
          <img src="/images/eesa-logo.svg" alt="EESA" className="login-logo" />
          <h2>EESA Portal</h2>
          <p>Sign in to your account</p>
        </div>

        <div className="login-tabs">
          {roles.map(r => (
            <button key={r.key} className={`login-tab ${activeRole === r.key ? 'active' : ''}`} onClick={() => { setActiveRole(r.key); setError(''); }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Member */}
        {activeRole === 'member' && (
          <form onSubmit={e => handleSubmit(e, 'member')}>
            <div className="form-group"><label>Email</label><input type="email" value={mEmail} onChange={e => setMEmail(e.target.value)} required placeholder="you@students.egerton.ac.ke" /></div>
            <div className="form-group"><label>Password</label><input type="password" value={mPass} onChange={e => setMPass(e.target.value)} required /></div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}><i className="fas fa-sign-in-alt"></i> {submitting ? 'Signing in...' : 'Sign In'}</button>
            <p style={{ marginTop: 12, textAlign: 'center', fontSize: '.85rem', color: 'var(--gray-500)' }}>New member? <Link to="/register">Create an account</Link></p>
          </form>
        )}

        {/* Admin */}
        {activeRole === 'admin' && (
          <form onSubmit={e => handleSubmit(e, 'admin')}>
            <div className="form-group"><label>Username</label><input type="text" value={aUser} onChange={e => setAUser(e.target.value)} required placeholder="admin" /></div>
            <div className="form-group"><label>Password</label><input type="password" value={aPass} onChange={e => setAPass(e.target.value)} required /></div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}><i className="fas fa-sign-in-alt"></i> {submitting ? 'Signing in...' : 'Sign In'}</button>
          </form>
        )}

        {/* Lecturer */}
        {activeRole === 'lecturer' && !showRegister && (
          <form onSubmit={e => handleSubmit(e, 'lecturer')}>
            <div className="form-group"><label>Email</label><input type="email" value={lEmail} onChange={e => setLEmail(e.target.value)} required placeholder="name@egerton.ac.ke" /></div>
            <div className="form-group"><label>Password</label><input type="password" value={lPass} onChange={e => setLPass(e.target.value)} required /></div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}><i className="fas fa-sign-in-alt"></i> {submitting ? 'Signing in...' : 'Sign In'}</button>
            <p style={{ marginTop: 12, textAlign: 'center', fontSize: '.85rem', color: 'var(--gray-500)' }}>New lecturer? <a href="#" onClick={e => { e.preventDefault(); setShowRegister(true); }}>Register here</a></p>
            {regMsg && <p className="form-error" style={{ textAlign: 'center', color: regMsg.includes('success') ? 'var(--success)' : 'var(--danger)' }}>{regMsg}</p>}
          </form>
        )}

        {/* Lecturer Register */}
        {activeRole === 'lecturer' && showRegister && (
          <form onSubmit={handleRegister}>
            <div className="form-row"><div className="form-group"><label>Full Name</label><input required value={reg.fullName} onChange={e => setReg({...reg, fullName: e.target.value})} /></div><div className="form-group"><label>Staff ID</label><input required value={reg.staffId} onChange={e => setReg({...reg, staffId: e.target.value})} /></div></div>
            <div className="form-row"><div className="form-group"><label>Email</label><input type="email" required value={reg.email} onChange={e => setReg({...reg, email: e.target.value})} /></div><div className="form-group"><label>Phone</label><input value={reg.phone} onChange={e => setReg({...reg, phone: e.target.value})} /></div></div>
            <div className="form-row"><div className="form-group"><label>Department</label><input required value={reg.department} onChange={e => setReg({...reg, department: e.target.value})} /></div><div className="form-group"><label>Title</label><select value={reg.title} onChange={e => setReg({...reg, title: e.target.value})}><option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Dr.</option><option>Prof.</option></select></div></div>
            <div className="form-group"><label>Password</label><input type="password" required value={reg.password} onChange={e => setReg({...reg, password: e.target.value})} /></div>
            <button type="submit" className="btn btn-primary btn-block btn-lg"><i className="fas fa-user-plus"></i> Register</button>
            <p style={{ marginTop: 12, textAlign: 'center', fontSize: '.85rem' }}><a href="#" onClick={e => { e.preventDefault(); setShowRegister(false); }}>Back to login</a></p>
          </form>
        )}

        {/* Sponsor */}
        {activeRole === 'sponsor' && (
          <form onSubmit={e => handleSubmit(e, 'sponsor')}>
            <div className="form-group"><label>Email</label><input type="email" value={sEmail} onChange={e => setSEmail(e.target.value)} required placeholder="contact@company.com" /></div>
            <div className="form-group"><label>Password</label><input type="password" value={sPass} onChange={e => setSPass(e.target.value)} required /></div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}><i className="fas fa-sign-in-alt"></i> {submitting ? 'Signing in...' : 'Sign In'}</button>
          </form>
        )}

        {error && <div className="form-error" style={{ marginTop: 10, textAlign: 'center' }}>{error}</div>}
      </div>
    </div>
  );
}
