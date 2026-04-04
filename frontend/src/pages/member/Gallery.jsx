import React, { useState, useEffect } from 'react';
import { Loading, Empty, fmtDt } from '../../components/ui';

const CATEGORIES = ['events', 'projects', 'campus', 'competitions', 'general'];

export default function MemberGallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <Loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <h3><i className="fas fa-images"></i> EESA Gallery</h3>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--gray-300)' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {photos.length === 0 ? <Empty text="No photos in the gallery yet" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {photos.map(p => (
            <div key={p._id} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--gray-200)', background: 'var(--white)', cursor: 'pointer' }} onClick={() => setLightbox(p)}>
              <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} loading="lazy" />
              <div style={{ padding: '8px 12px' }}>
                <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                {p.description && <div style={{ fontSize: '.8rem', color: 'var(--gray-500)', marginBottom: 2 }}>{p.description}</div>}
                <div style={{ fontSize: '.73rem', color: 'var(--gray-400)' }}>{p.category} &middot; {fmtDt(p.createdAt)}</div>
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
            <div style={{ color: '#fff', textAlign: 'center', marginTop: 10 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{lightbox.title}</div>
              {lightbox.description && <div style={{ fontSize: '.9rem', opacity: .8, marginTop: 4 }}>{lightbox.description}</div>}
            </div>
            <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: -12, right: -12, background: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1rem' }}><i className="fas fa-times"></i></button>
          </div>
        </div>
      )}
    </div>
  );
}
