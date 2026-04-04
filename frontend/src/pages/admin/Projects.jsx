import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, fmtDt, useToast } from '../../components/ui';

const EMPTY = { title: '', description: '', status: 'planning', category: '', members: '', startDate: '', endDate: '' };

export default function Projects() {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects?_ts=${Date.now()}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    const url = editId ? `/api/projects/${editId}` : '/api/projects';
    try {
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(editId ? 'Updated' : 'Created', 'success');
      setShowForm(false); setEditId(null); setForm(EMPTY); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const edit = (p) => { setForm({ title: p.title, description: p.description || '', status: p.status || 'planning', category: p.category || '', members: p.members || '', startDate: p.startDate?.slice(0, 10) || '', endDate: p.endDate?.slice(0, 10) || '' }); setEditId(p._id); setShowForm(true); };

  const del = async (id) => {
    if (!window.confirm('Delete this project?')) return;

    const previous = projects;
    setProjects(current => current.filter(project => project._id !== id));

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete project');
      toast('Deleted', 'success');
      load();
    } catch (err) {
      setProjects(previous);
      toast(err.message, 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3>Manage Projects</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(!showForm); }}><i className="fas fa-plus"></i> New Project</button>
      </div>

      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Title</label><input value={form.title} onChange={e => set('title', e.target.value)} required /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option>planning</option><option>in-progress</option><option>completed</option><option>on-hold</option>
              </select>
            </div>
            <div className="form-group"><label>Category</label><input value={form.category} onChange={e => set('category', e.target.value)} /></div>
            <div className="form-group"><label>Start Date</label><input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Description</label><textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}></textarea></div>
          </div>
          <div className="form-actions"><button className="btn btn-primary" type="submit">{editId ? 'Update' : 'Create'}</button><button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}

      {projects.length === 0 ? <Empty text="No projects." /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {projects.map(p => (
            <div key={p._id} className="form-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h4>{p.title}</h4>
                <Badge type={p.status === 'completed' ? 'success' : p.status === 'in-progress' ? 'warning' : p.status === 'on-hold' ? 'danger' : 'default'}>{p.status}</Badge>
              </div>
              <p style={{ fontSize: '.9rem', marginBottom: 10 }}>{p.description ? p.description.slice(0, 150) + (p.description.length > 150 ? '...' : '') : '--'}</p>
              {p.category && <Badge type="info">{p.category}</Badge>}
              <div style={{ marginTop: 8 }}><small style={{ color: 'var(--gray-500)' }}>{p.startDate ? fmtDt(p.startDate) : ''} {p.endDate ? `— ${fmtDt(p.endDate)}` : ''}</small></div>
              <div style={{ marginTop: 10, display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => edit(p)}><i className="fas fa-edit"></i></button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(p._id)}><i className="fas fa-trash"></i></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
