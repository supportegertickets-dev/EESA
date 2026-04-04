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
  const [showPass, setShowPass] = useState(false);

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
      const dest = { member: '/portal', admin: '/admin', lecturer: '/lecturer', sponsor: '/sponsor' }[role] || '/portal';
      navigate(dest);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isAdminRoute = defaultRole === 'admin';
  const roles = isAdminRoute
    ? [{ key: 'admin', label: 'Admin' }]
    : [{ key: 'member', label: 'Member' }];

  return (
    <div className="admin-login-screen" style={{ display: 'flex' }}>
      <div className="login-card">
        <div className="login-header">
          <img src="/images/eesa-logo.svg" alt="EESA" className="login-logo" />
          <h2>{isAdminRoute ? 'Admin Portal' : 'EESA Portal'}</h2>
          <p>{isAdminRoute ? 'Sign in to the admin dashboard' : 'Sign in to access your account'}</p>
        </div>

        {roles.length > 1 && (
          <div className="login-tabs">
            {roles.map(r => (
              <button key={r.key} className={`login-tab ${activeRole === r.key ? 'active' : ''}`} onClick={() => { setActiveRole(r.key); setError(''); }}>
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* Member */}
        {activeRole === 'member' && (
          <form onSubmit={e => handleSubmit(e, 'member')}>
            <div className="form-group"><label>Email</label><input type="email" value={mEmail} onChange={e => setMEmail(e.target.value)} required placeholder="you@students.egerton.ac.ke" /></div>
            <div className="form-group"><label>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={mPass} onChange={e => setMPass(e.target.value)} required style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontSize: '1rem' }}><i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>{submitting ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : <><i className="fas fa-sign-in-alt"></i> Sign In</>}</button>
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: '.85rem', color: 'var(--gray-500)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <Link to="/forgot-password">Forgot password?</Link>
              <span>New member? <Link to="/register">Create an account</Link></span>
            </div>
          </form>
        )}

        {/* Admin */}
        {activeRole === 'admin' && (
          <form onSubmit={e => handleSubmit(e, 'admin')}>
            <div className="form-group"><label>Username</label><input type="text" value={aUser} onChange={e => setAUser(e.target.value)} required placeholder="admin" /></div>
            <div className="form-group"><label>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={aPass} onChange={e => setAPass(e.target.value)} required style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontSize: '1rem' }}><i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>{submitting ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : <><i className="fas fa-sign-in-alt"></i> Sign In</>}</button>
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
