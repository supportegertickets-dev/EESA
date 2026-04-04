import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, Modal, fmtDt, useToast } from '../../components/ui';

const EMPTY = { title: '', description: '', startDate: '', endDate: '', positions: '', status: 'upcoming' };

export default function Elections() {
  const toast = useToast();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [candForm, setCandForm] = useState({ memberId: '', position: '', manifesto: '' });
  const [members, setMembers] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/elections?_ts=${Date.now()}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setElections(Array.isArray(data) ? data : []);
    } catch {
      setElections([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, positions: form.positions.split(',').map(s => s.trim()).filter(Boolean) };
    const url = editId ? `/api/elections/${editId}` : '/api/elections';
    try {
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(editId ? 'Election updated' : 'Election created', 'success');
      setShowForm(false); setEditId(null); setForm(EMPTY); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const edit = (el) => { setForm({ title: el.title, description: el.description || '', startDate: el.startDate?.slice(0, 16) || '', endDate: el.endDate?.slice(0, 16) || '', positions: (el.positions || []).join(', '), status: el.status || 'upcoming' }); setEditId(el._id); setShowForm(true); };

  const del = async (id) => {
    if (!window.confirm('Delete this election?')) return;

    const previous = elections;
    setElections(current => current.filter(election => election._id !== id));
    if (detail?._id === id) setDetail(null);

    try {
      const res = await fetch(`/api/elections/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete election');
      toast('Deleted', 'success');
      load();
    } catch (err) {
      setElections(previous);
      toast(err.message, 'error');
    }
  };

  const openDetail = (el) => {
    setDetail(el);
    if (members.length === 0) fetch('/api/members').then(r => r.ok ? r.json() : []).then(d => setMembers(Array.isArray(d) ? d : d.members || [])).catch(() => {});
  };

  const addCandidate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/elections/${detail._id}/candidates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(candForm) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast('Candidate added', 'success');
      setCandForm({ memberId: '', position: '', manifesto: '' });
      const updated = await fetch(`/api/elections/${detail._id}`).then(r => r.json());
      setDetail(updated); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const removeCandidate = async (candId) => {
    try {
      const res = await fetch(`/api/elections/${detail._id}/candidates/${candId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove candidate');
      const updated = await fetch(`/api/elections/${detail._id}?_ts=${Date.now()}`, { cache: 'no-store' }).then(r => r.json());
      setDetail(updated);
      load();
      toast('Candidate removed', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3>Election Management</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(!showForm); }}><i className="fas fa-plus"></i> New Election</button>
      </div>

      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Title</label><input value={form.title} onChange={e => set('title', e.target.value)} required /></div>
            <div className="form-group"><label>Start Date</label><input type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} required /></div>
            <div className="form-group"><label>End Date</label><input type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} required /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Positions (comma-separated)</label><input value={form.positions} onChange={e => set('positions', e.target.value)} placeholder="President, Vice President, Secretary" required /></div>
            <div className="form-group"><label>Status</label><select value={form.status} onChange={e => set('status', e.target.value)}><option>upcoming</option><option>active</option><option>closed</option></select></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Description</label><textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}></textarea></div>
          </div>
          <div className="form-actions"><button className="btn btn-primary" type="submit">{editId ? 'Update' : 'Create'}</button><button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}

      {elections.length === 0 ? <Empty text="No elections." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Title</th><th>Dates</th><th>Positions</th><th>Status</th><th>Candidates</th><th>Actions</th></tr></thead>
            <tbody>{elections.map(el => (
              <tr key={el._id}>
                <td>{el.title}</td>
                <td>{fmtDt(el.startDate)} – {fmtDt(el.endDate)}</td>
                <td>{(el.positions || []).join(', ')}</td>
                <td><Badge type={el.status === 'active' ? 'success' : el.status === 'closed' ? 'default' : 'warning'}>{el.status}</Badge></td>
                <td>{(el.candidates || []).length}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openDetail(el)}><i className="fas fa-users"></i></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => edit(el)}><i className="fas fa-edit"></i></button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(el._id)}><i className="fas fa-trash"></i></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {detail && (
        <Modal open={!!detail} title={`Candidates — ${detail.title}`} onClose={() => setDetail(null)}>
          {(detail.candidates || []).length === 0 ? <p>No candidates added yet.</p> : (
            <div style={{ marginBottom: 16 }}>
              {(detail.candidates || []).map(c => (
                <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--gray-200)' }}>
                  <div style={{ flex: 1 }}>
                    <strong>{c.member?.fullName || c.memberId || '--'}</strong><br />
                    <small>Position: {c.position} • {c.manifesto || 'No manifesto'}</small>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeCandidate(c._id)}><i className="fas fa-times"></i></button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addCandidate} style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 12 }}>
            <h5>Add Candidate</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <select value={candForm.memberId} onChange={e => setCandForm({ ...candForm, memberId: e.target.value })} required>
                <option value="">Select Member</option>
                {members.map(m => <option key={m._id} value={m._id}>{m.fullName} ({m.regNumber || m.registrationNumber})</option>)}
              </select>
              <select value={candForm.position} onChange={e => setCandForm({ ...candForm, position: e.target.value })} required>
                <option value="">Position</option>
                {(detail.positions || []).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <textarea placeholder="Manifesto (optional)" value={candForm.manifesto} onChange={e => setCandForm({ ...candForm, manifesto: e.target.value })} rows={2} style={{ width: '100%', marginTop: 8, padding: 8, border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }}></textarea>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} type="submit">Add Candidate</button>
          </form>
        </Modal>
      )}
    </>
  );
}
