import React, { useState, useEffect } from 'react';
import { Loading, Badge, fmtDt } from '../../components/ui';

export default function SponsorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sponsors/dashboard').then(r => r.ok ? r.json() : null).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <p>Failed to load dashboard.</p>;

  const sponsor = data.sponsor || data;
  const metrics = data.metrics || {};
  const events = data.events || [];

  const cards = [
    { icon: 'fas fa-users', label: 'Total Members', value: Number(metrics.totalMembers || 0).toLocaleString('en-KE'), color: 'var(--primary)' },
    { icon: 'fas fa-calendar-alt', label: 'Sponsored Events', value: Number(metrics.sponsoredEvents || events.length || 0).toLocaleString('en-KE'), color: 'var(--accent)' },
    { icon: 'fas fa-user-check', label: 'Total Attendees', value: Number(metrics.totalAttendees || 0).toLocaleString('en-KE'), color: 'var(--success)' },
    { icon: 'fas fa-globe', label: 'Estimated Reach', value: Number(metrics.estimatedReach || 0).toLocaleString('en-KE'), color: 'var(--info)' },
    { icon: 'fas fa-eye', label: 'Logo Impressions', value: Number(metrics.impressions || sponsor.impressions || 0).toLocaleString('en-KE'), color: '#6c5ce7' },
    { icon: 'fas fa-chart-line', label: 'ROI Score', value: metrics.roi || '--', color: '#e17055' },
  ];

  return (
    <>
      <h3 style={{ marginBottom: 16 }}>Sponsor Dashboard</h3>

      <div className="form-card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {sponsor.logo && <img src={sponsor.logo} alt={sponsor.name} style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8 }} />}
        <div>
          <h2>{sponsor.name}</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Badge type="info">{sponsor.tier}</Badge>
            <Badge type={sponsor.isActive !== false ? 'success' : 'danger'}>{sponsor.isActive !== false ? 'Active' : 'Inactive'}</Badge>
          </div>
          {sponsor.description && <p style={{ marginTop: 8, fontSize: '.9rem', color: 'var(--gray-600)' }}>{sponsor.description}</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} className="form-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.color + '18', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}><i className={c.icon}></i></div>
            <div><div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{c.value}</div><small style={{ color: 'var(--gray-500)' }}>{c.label}</small></div>
          </div>
        ))}
      </div>

      {events.length > 0 && (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12 }}>Sponsored Events</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Event</th><th>Date</th><th>Location</th><th>Attendees</th><th>Status</th></tr></thead>
              <tbody>{events.map((ev, i) => (
                <tr key={ev._id || i}>
                  <td>{ev.title || ev.name}</td>
                  <td>{fmtDt(ev.date)}</td>
                  <td>{ev.location || '--'}</td>
                  <td>{ev.attendees || ev.registrations?.length || 0}</td>
                  <td><Badge type={ev.status === 'completed' ? 'success' : ev.status === 'ongoing' ? 'warning' : 'secondary'}>{ev.status || 'upcoming'}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <div className="form-card">
        <h4 style={{ marginBottom: 12 }}>Sponsor Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px 20px' }}>
          {[
            ['Contact Person', sponsor.contactPerson],
            ['Email', sponsor.email],
            ['Phone', sponsor.phone],
            ['Website', sponsor.website],
            ['Partnership Start', sponsor.startDate ? fmtDt(sponsor.startDate) : null],
            ['Partnership End', sponsor.endDate ? fmtDt(sponsor.endDate) : null],
            ['Sponsorship Amount', sponsor.amount ? `KSh ${Number(sponsor.amount).toLocaleString('en-KE')}` : null],
          ].map(([label, value]) => value && (
            <div key={label}><small style={{ color: 'var(--gray-500)' }}>{label}</small><div style={{ fontWeight: 500 }}>{label === 'Website' ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : value}</div></div>
          ))}
        </div>
      </div>
    </>
  );
}
