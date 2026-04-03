import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loading, Empty, Badge, fmt } from '../../components/ui';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(0);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetch('/api/attendance/mine').then(r => r.ok ? r.json() : []).then(d => setAttendance(Array.isArray(d) ? d.length : 0)).catch(() => {});
    fetch('/api/announcements').then(r => r.ok ? r.json() : []).then(d => setAnnouncements(Array.isArray(d) ? d.slice(0, 3) : [])).catch(() => {});
  }, []);

  if (!user) return <Loading />;
  const statusGood = user.status === 'active' && user.isVerified;

  return (
    <>
      {/* Status banner */}
      <div className={`status-banner ${statusGood ? 'status-good' : 'status-action'}`} style={{ padding: '14px 20px', borderRadius: 'var(--radius)', marginBottom: 20, background: statusGood ? '#d4edda' : '#fff3cd', borderLeft: `4px solid ${statusGood ? 'var(--success)' : 'var(--warning)'}` }}>
        {statusGood
          ? <span><strong>Your account is active and verified.</strong> Full access to all portal features.</span>
          : <span><strong>Action required:</strong> {!user.registrationPaid ? 'Pay registration fee to activate your account.' : !user.isVerified ? 'Awaiting admin verification.' : 'Account is ' + user.status}</span>
        }
      </div>

      {/* Stat cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: 4 }}><i className="fas fa-user-check"></i> Status</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{user.status || 'pending'}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: 4 }}><i className="fas fa-money-bill"></i> Registration Fee</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{user.registrationPaid ? 'Paid' : 'Unpaid'}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: 4 }}><i className="fas fa-calendar"></i> Semester</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{user.currentSemester || 'Unpaid'}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: 4 }}><i className="fas fa-clipboard-check"></i> Events Attended</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{attendance}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="form-card">
        <h4><i className="fas fa-bolt"></i> Quick Actions</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <a href="/portal/membership" className="btn btn-primary btn-sm"><i className="fas fa-credit-card"></i> Pay Fees</a>
          <a href="/portal/resources" className="btn btn-accent btn-sm"><i className="fas fa-book"></i> Resources</a>
          <a href="/portal/elections" className="btn btn-outline btn-sm"><i className="fas fa-vote-yea"></i> Vote</a>
          <a href="/portal/events" className="btn btn-outline btn-sm"><i className="fas fa-calendar-check"></i> View Events</a>
        </div>
      </div>

      {/* Latest announcements */}
      <div className="form-card" style={{ marginTop: 20 }}>
        <h4><i className="fas fa-bullhorn"></i> Latest Announcements</h4>
        {announcements.length === 0 ? <Empty text="No announcements." /> : announcements.map(a => (
          <div key={a._id} style={{ borderBottom: '1px solid var(--gray-200)', padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {a.pinned && <i className="fas fa-thumbtack" style={{ color: 'var(--accent)' }}></i>}
              <strong>{a.title}</strong>
              {a.priority === 'urgent' && <Badge type="danger">Urgent</Badge>}
              {a.priority === 'high' && <Badge type="warning">High</Badge>}
            </div>
            <p style={{ fontSize: '.88rem', color: 'var(--gray-600)', marginTop: 4 }}>{(a.content || '').slice(0, 200)}</p>
            <small style={{ color: 'var(--gray-500)' }}>{fmt(a.createdAt)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
