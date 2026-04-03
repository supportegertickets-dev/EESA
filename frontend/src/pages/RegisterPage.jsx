import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const DEPARTMENTS = [
  'Agricultural Engineering',
  'Civil Engineering',
  'Electrical & Electronic Engineering',
  'Mechanical Engineering',
  'Mechatronic Engineering',
  'Industrial & Energy Engineering',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    regNumber: '', fullName: '', email: '', password: '', confirmPassword: '',
    phone: '', yearOfStudy: '', department: '', gender: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const { confirmPassword, ...body } = form;
      body.yearOfStudy = Number(body.yearOfStudy);
      const res = await fetch('/api/auth/member/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSuccess(data.message || 'Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-screen" style={{ display: 'flex' }}>
      <div className="login-card" style={{ maxWidth: 520 }}>
        <div className="login-header">
          <img src="/images/eesa-logo.svg" alt="EESA" className="login-logo" />
          <h2>Member Registration</h2>
          <p>Join the Egerton Engineering Student Association</p>
        </div>

        {success && <div className="alert alert-success" style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--success-bg, #d4edda)', color: 'var(--success, #155724)', borderRadius: 8, textAlign: 'center', fontSize: '.9rem' }}>{success}</div>}
        {error && <div className="form-error" style={{ marginBottom: 16, textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required value={form.fullName} onChange={set('fullName')} placeholder="John Kamau" />
            </div>
            <div className="form-group">
              <label>Registration Number <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required value={form.regNumber} onChange={set('regNumber')} placeholder="ENG/2023/001" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="email" required value={form.email} onChange={set('email')} placeholder="you@students.egerton.ac.ke" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="0712345678" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select required value={form.department} onChange={set('department')}>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Year of Study <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select required value={form.yearOfStudy} onChange={set('yearOfStudy')}>
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Gender</label>
            <select value={form.gender} onChange={set('gender')}>
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="password" required value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
            </div>
            <div className="form-group">
              <label>Confirm Password <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="password" required value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting} style={{ marginTop: 8 }}>
            <i className="fas fa-user-plus"></i> {submitting ? 'Creating account...' : 'Create Account'}
          </button>

          <p style={{ marginTop: 14, textAlign: 'center', fontSize: '.85rem', color: 'var(--gray-500)' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
