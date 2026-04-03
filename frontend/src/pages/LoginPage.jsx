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

  const handleSubmit = async (e, role) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let creds;
      if (role === 'member') creds = { email: mEmail, password: mPass };
      else if (role === 'admin') creds = { username: aUser, password: aPass };
      else creds = { email: mEmail, password: mPass };
      await login(role, creds);
      const dest = role === 'member' ? '/portal' : '/admin';
      navigate(dest);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const roles = [
    { key: 'member', label: 'Member' },
    { key: 'admin', label: 'Admin' }
  ];

  return (
    <div className="admin-login-screen" style={{ display: 'flex' }}>
      <div className="login-card">
        <div className="login-header">
          <img src="/images/eesa-logo.svg" alt="EESA" className="login-logo" />
          <h2>EESA Portal</h2>
          <p>Choose your portal access and sign in securely</p>
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



        {error && <div className="form-error" style={{ marginTop: 10, textAlign: 'center' }}>{error}</div>}
        <p style={{ marginTop: 14, textAlign: 'center', fontSize: '.82rem', color: 'var(--gray-500)' }}>
          Need help accessing the portal? Contact <a href="mailto:eesa@egerton.ac.ke">eesa@egerton.ac.ke</a>.
        </p>
      </div>
    </div>
  );
}
