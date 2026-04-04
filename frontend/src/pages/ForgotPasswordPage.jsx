import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'code' | 'done'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setInfo(data.message || 'Check your email for the reset code.');
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setInfo(data.message || 'Password reset successful!');
      setStep('done');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-screen" style={{ display: 'flex' }}>
      <div className="login-card" style={{ maxWidth: 440 }}>
        <div className="login-header">
          <img src="/images/eesa-logo.svg" alt="EESA" className="login-logo" />
          <h2>Reset Password</h2>
          <p>{step === 'email' ? 'Enter your registered email' : step === 'code' ? 'Enter the code sent to your email' : 'All done!'}</p>
        </div>

        {info && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--success-bg, #d4edda)', color: 'var(--success, #155724)', borderRadius: 8, textAlign: 'center', fontSize: '.9rem' }}>{info}</div>}
        {error && <div className="form-error" style={{ marginBottom: 16, textAlign: 'center' }}>{error}</div>}

        {step === 'email' && (
          <form onSubmit={requestCode}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@students.egerton.ac.ke" />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? <><i className="fas fa-spinner fa-spin"></i> Sending...</> : <><i className="fas fa-paper-plane"></i> Send Reset Code</>}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={resetPassword}>
            <div className="form-group">
              <label>6-Digit Code</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} required placeholder="123456" maxLength={6} style={{ textAlign: 'center', letterSpacing: 8, fontSize: '1.3rem', fontWeight: 700 }} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Min 6 characters" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontSize: '1rem' }}><i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Re-enter password" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontSize: '1rem' }}><i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? <><i className="fas fa-spinner fa-spin"></i> Resetting...</> : <><i className="fas fa-lock"></i> Reset Password</>}
            </button>
            <p style={{ marginTop: 10, textAlign: 'center', fontSize: '.83rem', color: 'var(--gray-500)' }}>
              <a href="#" onClick={e => { e.preventDefault(); setStep('email'); setError(''); setInfo(''); }}>Resend code</a>
            </p>
          </form>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: 'var(--success)' }}></i>
            <p style={{ marginTop: 12, fontWeight: 600 }}>Password reset successful!</p>
            <p style={{ fontSize: '.88rem', color: 'var(--gray-500)' }}>Redirecting to login...</p>
          </div>
        )}

        <p style={{ marginTop: 14, textAlign: 'center', fontSize: '.82rem', color: 'var(--gray-500)' }}>
          <Link to="/login"><i className="fas fa-arrow-left"></i> Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
