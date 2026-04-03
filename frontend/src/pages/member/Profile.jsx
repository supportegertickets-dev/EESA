import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui';

export default function Profile() {
  const { user, checkSession } = useAuth();
  const toast = useToast();
  const [pw, setPw] = useState({ current: '', newPassword: '', confirm: '' });
  const [uploading, setUploading] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) { toast('Passwords do not match', 'error'); return; }
    try {
      const res = await fetch('/api/members/me/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.newPassword }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      toast('Password changed!', 'success');
      setPw({ current: '', newPassword: '', confirm: '' });
    } catch (err) { toast(err.message, 'error'); }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch('/api/upload/profile-photo', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      toast('Photo updated!', 'success');
      checkSession();
    } catch (err) { toast(err.message, 'error'); }
    setUploading(false);
  };

  const info = [
    ['Full Name', user?.fullName],
    ['Registration No', user?.regNumber || user?.registrationNumber],
    ['Email', user?.email],
    ['Phone', user?.phone],
    ['Department', user?.department],
    ['Year of Study', user?.yearOfStudy],
    ['Status', user?.status],
    ['Verified', user?.isVerified ? 'Yes' : 'No'],
    ['Registration Fee', user?.registrationPaid ? 'Paid' : 'Unpaid'],
    ['Current Semester', user?.currentSemester || 'Unpaid'],
  ];

  return (
    <>
      <h3 style={{ marginBottom: 16 }}>My Profile</h3>

      <div className="form-card" style={{ marginBottom: 20, display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '0 auto 10px' }}>
            {user?.profilePhoto ? <img src={user.profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fas fa-user" style={{ fontSize: 40, color: 'var(--gray-400)' }}></i>}
          </div>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : 'Change Photo'}
            <input type="file" accept="image/*" onChange={uploadPhoto} hidden />
          </label>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px 20px' }}>
          {info.map(([label, value]) => (
            <div key={label}><small style={{ color: 'var(--gray-500)' }}>{label}</small><div style={{ fontWeight: 500 }}>{value || '--'}</div></div>
          ))}
        </div>
      </div>

      <div className="form-card">
        <h4>Change Password</h4>
        <form onSubmit={changePassword} style={{ maxWidth: 400, marginTop: 12 }}>
          <div className="form-group"><label>Current Password</label><input type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} required /></div>
          <div className="form-group"><label>New Password</label><input type="password" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} required minLength={6} /></div>
          <div className="form-group"><label>Confirm New Password</label><input type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} required /></div>
          <button className="btn btn-primary" type="submit">Update Password</button>
        </form>
      </div>
    </>
  );
}
