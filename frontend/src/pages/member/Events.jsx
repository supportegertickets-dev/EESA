import React, { useState, useEffect, useCallback } from 'react';
import { Loading, Empty, Badge, StatusBadge, Modal, fmt, fmtDt, useToast } from '../../components/ui';

const CATEGORIES = [
  { value: '', label: 'All Events', icon: 'fa-layer-group' },
  { value: 'workshop', label: 'Workshop', icon: 'fa-tools' },
  { value: 'seminar', label: 'Seminar', icon: 'fa-chalkboard-teacher' },
  { value: 'social', label: 'Social', icon: 'fa-glass-cheers' },
  { value: 'competition', label: 'Competition', icon: 'fa-trophy' },
  { value: 'meeting', label: 'Meeting', icon: 'fa-handshake' },
  { value: 'general', label: 'General', icon: 'fa-calendar' },
  { value: 'other', label: 'Other', icon: 'fa-ellipsis-h' },
];
const catMeta = v => CATEGORIES.find(c => c.value === v) || { label: v || 'General', icon: 'fa-calendar' };
const statusColor = s => ({ upcoming: 'accent', ongoing: 'warning', completed: 'success', cancelled: 'danger' }[s] || 'secondary');

export default function Events() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (catFilter) params.set('category', catFilter);
      if (search) params.set('search', search);
      params.set('_ts', Date.now());
      const res = await fetch(`/api/events?${params}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [filter, catFilter, search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openDetail = async (ev) => {
    setDetailLoading(true);
    setSelected(ev);
    try {
      const res = await fetch(`/api/events/${ev._id}?_ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) setSelected(await res.json());
    } catch {}
    setDetailLoading(false);
  };

  const regCount = ev => ev.registrationCount ?? (Array.isArray(ev.registrations) ? ev.registrations.length : 0);
  const isFull = ev => ev.maxParticipants && regCount(ev) >= ev.maxParticipants;

  const register = async () => {
    if (!selected) return;
    setRegLoading(true);
    try {
      const res = await fetch(`/api/events/${selected._id}/register`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      toast('Successfully registered!', 'success');
      // Refresh detail + list
      await openDetail(selected);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setRegLoading(false); }
  };

  const unregister = async () => {
    if (!selected || !window.confirm('Unregister from this event?')) return;
    setRegLoading(true);
    try {
      const res = await fetch(`/api/events/${selected._id}/register`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to unregister');
      toast('Unregistered successfully', 'success');
      await openDetail(selected);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setRegLoading(false); }
  };

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 4 }}><i className="fas fa-calendar-alt"></i> Events</h3>
        <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '.88rem' }}>Browse upcoming events and register to participate</p>
      </div>

      {/* Status Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {['all', 'upcoming', 'ongoing', 'completed'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Category pills + Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 200 }}>
          {CATEGORIES.map(c => (
            <button key={c.value} className={`btn ${catFilter === c.value ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              style={{ fontSize: '.78rem' }} onClick={() => setCatFilter(c.value)}>
              <i className={`fas ${c.icon}`} style={{ marginRight: 4 }}></i>{c.label}
            </button>
          ))}
        </div>
        <input style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', minWidth: 180 }}
          placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Events Grid */}
      {loading ? <Loading /> : events.length === 0 ? <Empty text="No events found." /> : (
        <div className="react-data-grid">
          {events.map(ev => {
            const meta = catMeta(ev.category);
            const count = regCount(ev);
            const full = isFull(ev);
            return (
              <div key={ev._id} className="form-card" style={{ cursor: 'pointer', marginBottom: 0, overflow: 'hidden', padding: 0 }} onClick={() => openDetail(ev)}>
                {/* Card Banner */}
                {ev.imageUrl ? (
                  <div style={{ height: 140, overflow: 'hidden' }}>
                    <img src={ev.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ height: 80, background: 'linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`fas ${meta.icon}`} style={{ fontSize: '2rem', color: 'rgba(255,255,255,.7)' }}></i>
                  </div>
                )}

                <div style={{ padding: '12px 16px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Badge type="accent">{fmt(ev.date)}</Badge>
                      <Badge type="info"><i className={`fas ${meta.icon}`} style={{ marginRight: 3, fontSize: '.7em' }}></i>{meta.label}</Badge>
                    </div>
                    <StatusBadge status={ev.status} />
                  </div>

                  <h4 style={{ marginBottom: 4, color: 'var(--gray-800)' }}>{ev.title}</h4>
                  {ev.description && <p style={{ fontSize: '.85rem', color: 'var(--gray-500)', marginBottom: 8, lineHeight: 1.4 }}>{ev.description.slice(0, 120)}{ev.description.length > 120 ? '...' : ''}</p>}

                  <div style={{ fontSize: '.82rem', color: 'var(--gray-500)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    {ev.location && <span><i className="fas fa-map-marker-alt" style={{ marginRight: 3 }}></i>{ev.location}</span>}
                    <span><i className="fas fa-users" style={{ marginRight: 3 }}></i>{count}{ev.maxParticipants ? ` / ${ev.maxParticipants}` : ''}</span>
                  </div>

                  {/* Capacity Bar */}
                  {ev.maxParticipants > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--gray-200)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (count / ev.maxParticipants) * 100)}%`, borderRadius: 2, background: full ? 'var(--danger)' : 'var(--primary)', transition: 'width .3s' }}></div>
                      </div>
                      {full && <div style={{ fontSize: '.72rem', color: 'var(--danger)', marginTop: 2, fontWeight: 600 }}>Full</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="" large>
        {selected && (
          <div>
            {/* Banner */}
            {selected.imageUrl && (
              <div style={{ marginBottom: 16, borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 220 }}>
                <img src={selected.imageUrl} alt={selected.title} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>{selected.title}</h3>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <StatusBadge status={selected.status} />
                  <Badge type="info"><i className={`fas ${catMeta(selected.category).icon}`} style={{ marginRight: 3, fontSize: '.7em' }}></i>{catMeta(selected.category).label}</Badge>
                </div>
              </div>

              {/* Register / Unregister Button */}
              {selected.status === 'upcoming' || selected.status === 'ongoing' ? (
                detailLoading ? null : selected.isRegistered ? (
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); unregister(); }} disabled={regLoading}
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                    <i className={`fas ${regLoading ? 'fa-spinner fa-spin' : 'fa-user-minus'}`}></i> Unregister
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); register(); }} disabled={regLoading || isFull(selected)}>
                    <i className={`fas ${regLoading ? 'fa-spinner fa-spin' : 'fa-user-plus'}`}></i> {isFull(selected) ? 'Event Full' : 'Register'}
                  </button>
                )
              ) : null}
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: '.9rem' }}>
              <div className="form-card" style={{ padding: 12, marginBottom: 0, background: 'var(--gray-50, #f9fafb)' }}>
                <div style={{ color: 'var(--gray-500)', fontSize: '.76rem', marginBottom: 2 }}>Start Date</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-calendar-alt" style={{ marginRight: 6, color: 'var(--primary)' }}></i>{selected.date ? new Date(selected.date).toLocaleString('en-KE', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBA'}</div>
              </div>
              <div className="form-card" style={{ padding: 12, marginBottom: 0, background: 'var(--gray-50, #f9fafb)' }}>
                <div style={{ color: 'var(--gray-500)', fontSize: '.76rem', marginBottom: 2 }}>End Date</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-calendar-check" style={{ marginRight: 6, color: 'var(--success)' }}></i>{selected.endDate ? new Date(selected.endDate).toLocaleString('en-KE', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}</div>
              </div>
              <div className="form-card" style={{ padding: 12, marginBottom: 0, background: 'var(--gray-50, #f9fafb)' }}>
                <div style={{ color: 'var(--gray-500)', fontSize: '.76rem', marginBottom: 2 }}>Location</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-map-marker-alt" style={{ marginRight: 6, color: 'var(--danger)' }}></i>{selected.location || 'TBA'}</div>
              </div>
              <div className="form-card" style={{ padding: 12, marginBottom: 0, background: 'var(--gray-50, #f9fafb)' }}>
                <div style={{ color: 'var(--gray-500)', fontSize: '.76rem', marginBottom: 2 }}>Registrations</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-users" style={{ marginRight: 6, color: '#8b5cf6' }}></i>{regCount(selected)}{selected.maxParticipants ? ` / ${selected.maxParticipants}` : ''}</div>
                {selected.maxParticipants > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--gray-200)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (regCount(selected) / selected.maxParticipants) * 100)}%`, borderRadius: 2, background: isFull(selected) ? 'var(--danger)' : 'var(--primary)', transition: 'width .3s' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {selected.description && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 6, fontSize: '.88rem', color: 'var(--gray-500)' }}>About This Event</h4>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '.9rem', lineHeight: 1.65, color: 'var(--gray-700)', margin: 0 }}>{selected.description}</p>
              </div>
            )}

            {selected.createdBy && (
              <div style={{ fontSize: '.78rem', color: 'var(--gray-400)', borderTop: '1px solid var(--gray-200)', paddingTop: 10, marginTop: 14 }}>
                Organized by {selected.createdBy.fullName || 'Admin'} · {fmtDt(selected.createdAt)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
