import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, StatusBadge, Modal, fmt, fmtDt } from '../../components/ui';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch('/api/events').then(r => r.ok ? r.json() : []).then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? events : events.filter(e => (e.status || '').toLowerCase() === filter);

  const openDetail = async (ev) => {
    setDetailLoading(true);
    setSelected(ev);
    try {
      const res = await fetch(`/api/events/${ev._id}`);
      if (res.ok) {
        const full = await res.json();
        setSelected(full);
      }
    } catch { /* keep the list-level data */ }
    setDetailLoading(false);
  };

  const regCount = (ev) => {
    if (Array.isArray(ev.registrations)) return ev.registrations.length;
    if (typeof ev.registrations === 'number') return ev.registrations;
    return 0;
  };

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
            <div key={ev._id} className="form-card" style={{ cursor: 'pointer' }} onClick={() => openDetail(ev)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <Badge type="accent">{fmt(ev.date)}</Badge>
                  {ev.category && <Badge type="info">{ev.category}</Badge>}
                </div>
                <StatusBadge status={ev.status} />
              </div>
              <h4 style={{ marginBottom: 4 }}>{ev.title}</h4>
              <p style={{ fontSize: '.88rem', color: 'var(--gray-600)', marginBottom: 8 }}>{(ev.description || '').slice(0, 180)}{(ev.description || '').length > 180 ? '…' : ''}</p>
              <div style={{ fontSize: '.82rem', color: 'var(--gray-500)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span><i className="fas fa-map-marker-alt"></i> {ev.location || 'TBA'}</span>
                <span><i className="fas fa-users"></i> {regCount(ev)} registered</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title} large>
        {detailLoading ? <Loading text="Loading event details..." /> : selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <StatusBadge status={selected.status} />
              {selected.category && <Badge type="info">{selected.category}</Badge>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18, fontSize: '.9rem' }}>
              <div>
                <div style={{ color: 'var(--gray-500)', fontSize: '.78rem', marginBottom: 2 }}>Date & Time</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-calendar-alt" style={{ marginRight: 6, color: 'var(--primary)' }}></i>{selected.date ? new Date(selected.date).toLocaleString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBA'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--gray-500)', fontSize: '.78rem', marginBottom: 2 }}>Location</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-map-marker-alt" style={{ marginRight: 6, color: 'var(--danger)' }}></i>{selected.location || 'TBA'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--gray-500)', fontSize: '.78rem', marginBottom: 2 }}>Registered</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-users" style={{ marginRight: 6, color: 'var(--info)' }}></i>{regCount(selected)}{selected.maxParticipants ? ` / ${selected.maxParticipants}` : ''}</div>
              </div>
              {selected.createdBy && (
                <div>
                  <div style={{ color: 'var(--gray-500)', fontSize: '.78rem', marginBottom: 2 }}>Organized by</div>
                  <div style={{ fontWeight: 600 }}><i className="fas fa-user-shield" style={{ marginRight: 6, color: 'var(--success)' }}></i>{selected.createdBy.fullName || 'Admin'}</div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ color: 'var(--gray-500)', fontSize: '.78rem', marginBottom: 4 }}>Description</div>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '.9rem', lineHeight: 1.6, color: 'var(--gray-700)' }}>{selected.description || 'No description provided.'}</p>
            </div>

            {selected.createdAt && (
              <div style={{ fontSize: '.78rem', color: 'var(--gray-400)', borderTop: '1px solid var(--gray-200)', paddingTop: 10 }}>
                Created {fmtDt(selected.createdAt)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
