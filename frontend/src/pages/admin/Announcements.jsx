import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, fmtDt, useToast } from '../../components/ui';

const EMPTY = { title: '', content: '', priority: 'normal', target: 'all', pinned: false };

export default function Announcements() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements?_ts=${Date.now()}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    const url = editId ? `/api/announcements/${editId}` : '/api/announcements';
    try {
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(editId ? 'Updated' : 'Created', 'success');
      setShowForm(false); setEditId(null); setForm(EMPTY); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const edit = (a) => { setForm({ title: a.title, content: a.content || '', priority: a.priority || 'normal', target: a.target || 'all', pinned: a.pinned || false }); setEditId(a._id); setShowForm(true); };

  const del = async (id) => {
    if (!window.confirm('Delete?')) return;

    const previous = items;
    setItems(current => current.filter(item => item._id !== id));

    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete announcement');
      toast('Deleted', 'success');
      load();
    } catch (err) {
      setItems(previous);
      toast(err.message, 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3>Manage Announcements</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(!showForm); }}><i className="fas fa-plus"></i> New</button>
      </div>

      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={e => set('title', e.target.value)} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group"><label>Priority</label><select value={form.priority} onChange={e => set('priority', e.target.value)}><option>low</option><option>normal</option><option>high</option><option>urgent</option></select></div>
            <div className="form-group"><label>Target</label><select value={form.target} onChange={e => set('target', e.target.value)}><option>all</option><option>members</option><option>executives</option></select></div>
            <div className="form-group"><label>&nbsp;</label><label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} /> Pin to top</label></div>
          </div>
          <div className="form-group"><label>Content</label><textarea rows={4} value={form.content} onChange={e => set('content', e.target.value)} required></textarea></div>
          <div className="form-actions"><button className="btn btn-primary" type="submit">{editId ? 'Update' : 'Create'}</button><button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}

      {items.length === 0 ? <Empty text="No announcements." /> : items.map(a => (
        <div key={a._id} className="form-card" style={{ marginBottom: 12, borderLeft: a.pinned ? '4px solid var(--accent)' : a.priority === 'urgent' ? '4px solid var(--danger)' : a.priority === 'high' ? '4px solid var(--warning)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {a.pinned && <i className="fas fa-thumbtack" style={{ color: 'var(--accent)' }}></i>}
            <h4 style={{ flex: 1 }}>{a.title}</h4>
            <Badge type={a.priority === 'urgent' ? 'danger' : a.priority === 'high' ? 'warning' : 'default'}>{a.priority}</Badge>
            <button className="btn btn-ghost btn-sm" onClick={() => edit(a)}><i className="fas fa-edit"></i></button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(a._id)}><i className="fas fa-trash"></i></button>
          </div>
          <p style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{a.content}</p>
          <small style={{ color: 'var(--gray-500)' }}>{fmtDt(a.createdAt)} &bull; Target: {a.target || 'all'}</small>
        </div>
      ))}
    </>
  );
}
