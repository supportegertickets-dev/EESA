import React, { useState, useEffect } from 'react';
import { Loading, Empty, fmtDt, useToast } from '../../components/ui';

const CATEGORIES = ['events', 'projects', 'campus', 'competitions', 'general'];
const EMPTY = { title: '', description: '', category: 'general' };

export default function AdminGallery() {
  const toast = useToast();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState(null);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('category', filter);
    params.set('_ts', Date.now().toString());
    const q = `?${params.toString()}`;

    try {
      const res = await fetch(`/api/gallery${q}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : { photos: [] };
      setPhotos(data.photos || []);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        const res = await fetch(`/api/gallery/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success('Photo updated');
      } else {
        if (!files || files.length === 0) { toast.error('Select at least one image'); setSubmitting(false); return; }
        const fd = new FormData();
        fd.append('title', form.title);
        fd.append('description', form.description);
        fd.append('category', form.category);
        for (const f of files) fd.append('images', f);
        const res = await fetch('/api/gallery', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success('Photo(s) uploaded');
      }
      setShowForm(false); setForm(EMPTY); setEditId(null); setFiles(null); load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (p) => { setEditId(p._id); setForm({ title: p.title, description: p.description || '', category: p.category }); setShowForm(true); };

  const remove = async (id) => {
    if (!window.confirm('Delete this photo?')) return;

    const previousPhotos = photos;
    setPhotos(prev => prev.filter(photo => photo._id !== id));
    if (lightbox?._id === id) setLightbox(null);

    try {
      const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete photo');
      toast.success('Photo deleted');
      load();
    } catch (err) {
      setPhotos(previousPhotos);
      toast.error(err.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <h3><i className="fas fa-images"></i> Gallery</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--gray-300)' }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY); setFiles(null); }}>
            <i className="fas fa-plus"></i> Upload Photos
          </button>
        </div>
      </div>

      {/* Upload / Edit form */}
      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12 }}>{editId ? 'Edit Photo' : 'Upload Photos'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} required maxLength={150} placeholder="Photo title" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} maxLength={500} rows={2} placeholder="Optional description" />
            </div>
            {!editId && (
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Images * (max 10)</label>
                <input type="file" accept="image/*" multiple onChange={e => setFiles(e.target.files)} />
              </div>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-check"></i> {editId ? 'Update' : 'Upload'}</>}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Gallery grid */}
      {photos.length === 0 ? <Empty text="No photos yet" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {photos.map(p => (
            <div key={p._id} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--gray-200)', background: 'var(--white)' }}>
              <img
                src={p.imageUrl}
                alt={p.title}
                style={{ width: '100%', height: 160, objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setLightbox(p)}
                loading="lazy"
              />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{p.category} &middot; {fmtDt(p.createdAt)}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)} style={{ fontSize: '.75rem', padding: '2px 8px' }}><i className="fas fa-edit"></i></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(p._id)} style={{ fontSize: '.75rem', padding: '2px 8px', color: 'var(--danger)' }}><i className="fas fa-trash"></i></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img src={lightbox.imageUrl} alt={lightbox.title} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }} />
            <div style={{ color: '#fff', textAlign: 'center', marginTop: 10, fontWeight: 600 }}>{lightbox.title}</div>
            <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: -12, right: -12, background: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1rem' }}><i className="fas fa-times"></i></button>
          </div>
        </div>
      )}
    </div>
  );
}
