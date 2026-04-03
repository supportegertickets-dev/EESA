import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, fmt } from '../../components/ui';

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/announcements').then(r => r.ok ? r.json() : []).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (items.length === 0) return <Empty text="No announcements." />;

  return (
    <div className="react-list" style={{ display: 'grid', gap: 16 }}>
      {items.map(a => (
        <div key={a._id} className="form-card" style={{ borderLeft: `4px solid ${a.priority === 'urgent' ? 'var(--danger)' : a.priority === 'high' ? 'var(--warning)' : 'var(--gray-300)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {a.pinned && <i className="fas fa-thumbtack" style={{ color: 'var(--accent)' }}></i>}
            <h4 style={{ flex: 1 }}>{a.title}</h4>
            {a.priority === 'urgent' && <Badge type="danger">Urgent</Badge>}
            {a.priority === 'high' && <Badge type="warning">High</Badge>}
            {a.target && <Badge type="secondary">{a.target}</Badge>}
          </div>
          <p style={{ fontSize: '.9rem', color: 'var(--gray-700)', whiteSpace: 'pre-wrap' }}>{a.content}</p>
          <small style={{ color: 'var(--gray-500)', marginTop: 8, display: 'block' }}>{fmt(a.createdAt)}</small>
        </div>
      ))}
    </div>
  );
}
