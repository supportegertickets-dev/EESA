import React, { useState, useEffect } from 'react';
import { Loading } from '../../components/ui';

export default function LecturerDashboard() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/units').then(r => r.ok ? r.json() : []).then(d => { setUnits(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const totalStudents = units.reduce((a, u) => a + (u.students || []).length, 0);

  return (
    <>
      <h3 style={{ marginBottom: 16 }}>Lecturer Dashboard</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { icon: 'fas fa-book', label: 'My Units', value: units.length, color: 'var(--primary)' },
          { icon: 'fas fa-user-graduate', label: 'Total Students', value: totalStudents, color: 'var(--success)' },
        ].map(c => (
          <div key={c.label} className="form-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.color + '18', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}><i className={c.icon}></i></div>
            <div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{c.value}</div><small style={{ color: 'var(--gray-500)' }}>{c.label}</small></div>
          </div>
        ))}
      </div>

      {units.length > 0 && (
        <div className="form-card">
          <h4 style={{ marginBottom: 10 }}>My Units</h4>
          {units.map(u => (
            <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-200)' }}>
              <div><strong>{u.code}</strong> — {u.name}<br /><small style={{ color: 'var(--gray-500)' }}>{u.department} &bull; Year {u.yearOfStudy} &bull; Sem {u.semester}</small></div>
              <div style={{ textAlign: 'right' }}><strong>{(u.students || []).length}</strong><br /><small style={{ color: 'var(--gray-500)' }}>students</small></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
