import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, Modal, fmtDt, useToast } from '../../components/ui';

const EMPTY = { title: '', description: '', date: '', endDate: '', location: '', category: 'workshop', capacity: '', status: 'upcoming' };

export default function Events() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = () => {
    fetch('/api/events').then(r => r.ok ? r.json() : []).then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    const url = editId ? `/api/events/${editId}` : '/api/events';
    const method = editId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(editId ? 'Event updated' : 'Event created', 'success');
      setShowForm(false); setEditId(null); setForm(EMPTY); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const edit = (ev) => { setForm({ title: ev.title, description: ev.description || '', date: ev.date?.slice(0, 16) || '', endDate: ev.endDate?.slice(0, 16) || '', location: ev.location || '', category: ev.category || 'workshop', capacity: ev.capacity || '', status: ev.status || 'upcoming' }); setEditId(ev._id); setShowForm(true); };

  const del = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    toast('Event deleted', 'success'); load();
  };

  if (loading) return <Loading />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3>Manage Events</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(!showForm); }}><i className="fas fa-plus"></i> New Event</button>
      </div>

      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Title</label><input value={form.title} onChange={e => set('title', e.target.value)} required /></div>
            <div className="form-group"><label>Start Date</label><input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} required /></div>
            <div className="form-group"><label>End Date</label><input type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
            <div className="form-group"><label>Location</label><input value={form.location} onChange={e => set('location', e.target.value)} /></div>
            <div className="form-group"><label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                <option>workshop</option><option>seminar</option><option>social</option><option>competition</option><option>meeting</option><option>other</option>
              </select>
            </div>
            <div className="form-group"><label>Capacity</label><input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option>upcoming</option><option>ongoing</option><option>completed</option><option>cancelled</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Description</label><textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}></textarea></div>
          </div>
          <div className="form-actions"><button className="btn btn-primary" type="submit">{editId ? 'Update' : 'Create'}</button><button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}

      {events.length === 0 ? <Empty text="No events yet." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Title</th><th>Date</th><th>Location</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev._id}>
                  <td>{ev.title}</td>
                  <td>{fmtDt(ev.date)}</td>
                  <td>{ev.location || '--'}</td>
                  <td><Badge type="info">{ev.category}</Badge></td>
                  <td><Badge type={ev.status === 'completed' ? 'success' : ev.status === 'cancelled' ? 'danger' : ev.status === 'ongoing' ? 'warning' : 'default'}>{ev.status}</Badge></td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => edit(ev)}><i className="fas fa-edit"></i></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(ev._id)}><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
