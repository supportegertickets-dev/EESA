import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, StatusBadge, fmt } from '../../components/ui';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/events').then(r => r.ok ? r.json() : []).then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? events : events.filter(e => (e.status || '').toLowerCase() === filter);

  if (loading) return <Loading />;

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'upcoming', 'ongoing', 'past'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? <Empty text="No events found." /> : (
        <div className="react-data-grid">
          {filtered.map(ev => (
            <div key={ev._id} className="form-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <Badge type="accent">{fmt(ev.date)}</Badge>
                  {ev.category && <Badge type="info">{ev.category}</Badge>}
                </div>
                <StatusBadge status={ev.status} />
              </div>
              <h4 style={{ marginBottom: 4 }}>{ev.title}</h4>
              <p style={{ fontSize: '.88rem', color: 'var(--gray-600)', marginBottom: 8 }}>{(ev.description || '').slice(0, 180)}</p>
              <div style={{ fontSize: '.82rem', color: 'var(--gray-500)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span><i className="fas fa-map-marker-alt"></i> {ev.location || 'TBA'}</span>
                {ev.registrations != null && <span><i className="fas fa-users"></i> {ev.registrations} registered</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
