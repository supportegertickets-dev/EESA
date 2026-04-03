import React, { useState, useEffect } from 'react';
import { Loading, fmt, fmtDt } from '../../components/ui';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!stats) return <p>Failed to load dashboard stats.</p>;

  const cards = [
    { icon: 'fas fa-users', label: 'Total Members', value: stats.totalMembers || stats.members || 0, color: 'var(--primary)' },
    { icon: 'fas fa-user-check', label: 'Active Members', value: stats.activeMembers || 0, color: 'var(--success)' },
    { icon: 'fas fa-calendar-alt', label: 'Events', value: stats.totalEvents || stats.events || 0, color: 'var(--accent)' },
    { icon: 'fas fa-money-bill', label: 'Revenue (KSh)', value: Number(stats.totalRevenue || stats.revenue || 0).toLocaleString('en-KE'), color: 'var(--warning)' },
    { icon: 'fas fa-project-diagram', label: 'Projects', value: stats.totalProjects || stats.projects || 0, color: 'var(--info)' },
    { icon: 'fas fa-bullhorn', label: 'Announcements', value: stats.totalAnnouncements || stats.announcements || 0, color: '#6c5ce7' },
    { icon: 'fas fa-book', label: 'Resources', value: stats.totalResources || stats.resources || 0, color: '#00b894' },
    { icon: 'fas fa-handshake', label: 'Sponsors', value: stats.totalSponsors || stats.sponsors || 0, color: '#e17055' },
  ];

  return (
    <>
      <h3 style={{ marginBottom: 16 }}>Admin Dashboard</h3>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} className="form-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.color + '18', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              <i className={c.icon}></i>
            </div>
            <div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{c.value}</div><small style={{ color: 'var(--gray-500)' }}>{c.label}</small></div>
          </div>
        ))}
      </div>

      {stats.departmentBreakdown && (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 10 }}>Members by Department</h4>
          {Object.entries(stats.departmentBreakdown).map(([dept, count]) => (
            <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ minWidth: 180 }}>{dept}</span>
              <div style={{ flex: 1, background: 'var(--gray-200)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((count / (stats.totalMembers || 1)) * 100, 100)}%`, background: 'var(--primary)', height: '100%', borderRadius: 4 }}></div>
              </div>
              <small style={{ minWidth: 32, textAlign: 'right' }}>{count}</small>
            </div>
          ))}
        </div>
      )}

      {stats.recentMembers && stats.recentMembers.length > 0 && (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 10 }}>Recent Registrations</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table"><thead><tr><th>Name</th><th>Reg No</th><th>Department</th><th>Date</th></tr></thead>
              <tbody>{stats.recentMembers.map(m => <tr key={m._id}><td>{m.fullName}</td><td>{m.regNumber || m.registrationNumber}</td><td>{m.department}</td><td>{fmtDt(m.createdAt)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {stats.pendingPayments > 0 && (
        <div className="form-card" style={{ background: 'var(--warning-bg, #fff3cd)', borderLeft: '4px solid var(--warning)' }}>
          <h4><i className="fas fa-exclamation-triangle"></i> {stats.pendingPayments} Pending Payments</h4>
          <p style={{ fontSize: '.9rem' }}>Review and confirm member payments in the Payments section.</p>
        </div>
      )}
    </>
  );
}
