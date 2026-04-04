import React, { useState, useEffect, useRef } from 'react';
import { Loading, Empty, Badge, Modal, fmt, fmtDt, useToast } from '../../components/ui';

const CATEGORIES = [
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

const EMPTY = { title: '', description: '', date: '', endDate: '', location: '', category: 'general', maxParticipants: '', status: 'upcoming' };

export default function Events() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const imageRef = useRef();

  // Detail modal
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterCat) params.set('category', filterCat);
      if (search) params.set('search', search);
      params.set('_ts', Date.now());
      const res = await fetch(`/api/events?${params}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/events/stats?_ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [filterStatus, filterCat, search]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openDetail = async (ev) => {
    setDetail(ev);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/events/${ev._id}?_ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) setDetail(await res.json());
    } catch {}
    setDetailLoading(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
      if (imageRef.current?.files[0]) fd.append('image', imageRef.current.files[0]);
      const url = editId ? `/api/events/${editId}` : '/api/events';
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(editId ? 'Event updated' : 'Event created', 'success');
      setShowForm(false); setEditId(null); setForm(EMPTY);
      if (imageRef.current) imageRef.current.value = '';
      load(); loadStats();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const edit = (ev) => {
    setForm({
      title: ev.title || '', description: ev.description || '',
      date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : '',
      endDate: ev.endDate ? new Date(ev.endDate).toISOString().slice(0, 16) : '',
      location: ev.location || '', category: ev.category || 'general',
      maxParticipants: ev.maxParticipants || '', status: ev.status || 'upcoming'
    });
    setEditId(ev._id);
    setShowForm(true);
    setDetail(null);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this event permanently? This will also remove all attendance records.')) return;
    const previous = events;
    setEvents(curr => curr.filter(ev => ev._id !== id));
    setDetail(null);
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast('Event deleted', 'success');
      load(); loadStats();
    } catch (err) { setEvents(previous); toast(err.message, 'error'); }
  };

  const regCount = ev => ev.registrationCount ?? (Array.isArray(ev.registrations) ? ev.registrations.length : 0);

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}><i className="fas fa-calendar-alt"></i> Event Management</h3>
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '.88rem' }}>Create, manage, and track events and registrations</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(v => !v); }}>
          <i className="fas fa-plus"></i> {showForm ? 'Close Form' : 'New Event'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total', val: stats.total, icon: 'fa-layer-group', color: 'var(--primary)' },
            { label: 'Upcoming', val: stats.upcoming, icon: 'fa-calendar-plus', color: 'var(--info, #3b82f6)' },
            { label: 'Ongoing', val: stats.ongoing, icon: 'fa-play-circle', color: 'var(--warning)' },
            { label: 'Completed', val: stats.completed, icon: 'fa-check-circle', color: 'var(--success)' },
            { label: 'Registrations', val: stats.totalRegistrations, icon: 'fa-users', color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} className="form-card" style={{ padding: 14, textAlign: 'center', marginBottom: 0 }}>
              <i className={`fas ${s.icon}`} style={{ fontSize: '1.3rem', color: s.color, marginBottom: 4 }}></i>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '.76rem', color: 'var(--gray-500)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12 }}>{editId ? 'Edit Event' : 'Create New Event'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Annual Engineering Workshop 2026" />
            </div>
            <div className="form-group">
              <label>Start Date & Time *</label>
              <input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>End Date & Time</label>
              <input type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Engineering Hall, Room 101" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Max Participants</label>
              <input type="number" min="0" value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} placeholder="Leave empty for unlimited" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{editId ? 'Replace Banner Image (optional)' : 'Event Banner Image'}</label>
              <input type="file" accept="image/*" ref={imageRef} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Event details, agenda, requirements..."></textarea>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : editId ? 'fa-save' : 'fa-calendar-plus'}`}></i> {submitting ? 'Saving...' : editId ? 'Update Event' : 'Create Event'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <select style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', flex: 1, minWidth: 180 }} placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Events Table */}
      {loading ? <Loading /> : events.length === 0 ? <Empty text="No events found." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Event</th>
                <th>Date</th>
                <th>Location</th>
                <th>Category</th>
                <th>Registrations</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => {
                const meta = catMeta(ev.category);
                const count = regCount(ev);
                return (
                  <tr key={ev._id}>
                    <td>
                      {ev.imageUrl
                        ? <img src={ev.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                        : <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'var(--gray-100)', display: 'grid', placeItems: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}><i className={`fas ${meta.icon}`}></i></div>
                      }
                    </td>
                    <td>
                      <span style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }} onClick={() => openDetail(ev)}>{ev.title}</span>
                      {ev.createdBy?.fullName && <div style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>by {ev.createdBy.fullName}</div>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div>{fmt(ev.date)}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{fmtDt(ev.date).split(',').pop()}</div>
                    </td>
                    <td>{ev.location || <span style={{ color: 'var(--gray-400)' }}>TBA</span>}</td>
                    <td><Badge type="info">{meta.label}</Badge></td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                      {ev.maxParticipants ? <span style={{ color: 'var(--gray-500)', fontSize: '.82rem' }}> / {ev.maxParticipants}</span> : ''}
                    </td>
                    <td><Badge type={statusColor(ev.status)}>{ev.status}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" title="View" onClick={() => openDetail(ev)}><i className="fas fa-eye"></i></button>
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => edit(ev)}><i className="fas fa-edit"></i></button>
                        <button className="btn btn-ghost btn-sm" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => del(ev._id)}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="" large>
        {detail && (
          <div>
            {/* Banner */}
            {detail.imageUrl && (
              <div style={{ marginBottom: 16, borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 220 }}>
                <img src={detail.imageUrl} alt={detail.title} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>{detail.title}</h3>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <Badge type={statusColor(detail.status)}>{detail.status}</Badge>
                  <Badge type="info">{catMeta(detail.category).label}</Badge>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => edit(detail)}><i className="fas fa-edit"></i> Edit</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(detail._id)}><i className="fas fa-trash"></i> Delete</button>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: '.9rem' }}>
              <div className="form-card" style={{ padding: 12, marginBottom: 0, background: 'var(--gray-50, #f9fafb)' }}>
                <div style={{ color: 'var(--gray-500)', fontSize: '.76rem', marginBottom: 2 }}>Start Date</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-calendar-alt" style={{ marginRight: 6, color: 'var(--primary)' }}></i>{detail.date ? new Date(detail.date).toLocaleString('en-KE', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBA'}</div>
              </div>
              <div className="form-card" style={{ padding: 12, marginBottom: 0, background: 'var(--gray-50, #f9fafb)' }}>
                <div style={{ color: 'var(--gray-500)', fontSize: '.76rem', marginBottom: 2 }}>End Date</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-calendar-check" style={{ marginRight: 6, color: 'var(--success)' }}></i>{detail.endDate ? new Date(detail.endDate).toLocaleString('en-KE', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}</div>
              </div>
              <div className="form-card" style={{ padding: 12, marginBottom: 0, background: 'var(--gray-50, #f9fafb)' }}>
                <div style={{ color: 'var(--gray-500)', fontSize: '.76rem', marginBottom: 2 }}>Location</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-map-marker-alt" style={{ marginRight: 6, color: 'var(--danger)' }}></i>{detail.location || 'TBA'}</div>
              </div>
              <div className="form-card" style={{ padding: 12, marginBottom: 0, background: 'var(--gray-50, #f9fafb)' }}>
                <div style={{ color: 'var(--gray-500)', fontSize: '.76rem', marginBottom: 2 }}>Registrations</div>
                <div style={{ fontWeight: 600 }}><i className="fas fa-users" style={{ marginRight: 6, color: '#8b5cf6' }}></i>{regCount(detail)}{detail.maxParticipants ? ` / ${detail.maxParticipants}` : ''}</div>
              </div>
            </div>

            {/* Description */}
            {detail.description && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 6, fontSize: '.88rem', color: 'var(--gray-500)' }}>Description</h4>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '.9rem', lineHeight: 1.65, color: 'var(--gray-700)', margin: 0 }}>{detail.description}</p>
              </div>
            )}

            {/* Registered Members */}
            {detailLoading ? <Loading text="Loading registrations..." /> : (
              Array.isArray(detail.registrations) && detail.registrations.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: 10, fontSize: '.88rem', color: 'var(--gray-500)' }}>
                    <i className="fas fa-user-check"></i> Registered Members ({detail.registrations.length})
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>#</th><th>Name</th><th>Reg Number</th><th>Department</th><th>Year</th><th>Registered</th></tr></thead>
                      <tbody>
                        {detail.registrations.map((r, i) => (
                          <tr key={r.member?._id || i}>
                            <td>{i + 1}</td>
                            <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {r.member?.profilePhoto
                                ? <img src={r.member.profilePhoto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gray-200)', display: 'grid', placeItems: 'center', fontSize: '.7rem', fontWeight: 700, color: 'var(--primary)' }}>{(r.member?.fullName || '?')[0]}</div>
                              }
                              {r.member?.fullName || 'Unknown'}
                            </td>
                            <td>{r.member?.regNumber || '--'}</td>
                            <td>{r.member?.department || '--'}</td>
                            <td>{r.member?.yearOfStudy || '--'}</td>
                            <td>{fmtDt(r.registeredAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}

            {detail.createdBy?.fullName && (
              <div style={{ fontSize: '.78rem', color: 'var(--gray-400)', borderTop: '1px solid var(--gray-200)', paddingTop: 10, marginTop: 14 }}>
                Created by {detail.createdBy.fullName} · {fmtDt(detail.createdAt)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
