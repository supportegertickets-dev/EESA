import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, fmtDt, useToast } from '../../components/ui';

export default function LecturerAttendance() {
  const toast = useToast();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [topic, setTopic] = useState('');
  const [presentIds, setPresentIds] = useState([]);

  useEffect(() => {
    fetch('/api/units').then(r => r.ok ? r.json() : []).then(d => { setUnits(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const selectUnit = (unitId) => {
    setSelectedUnit(unitId);
    if (!unitId) { setSessions([]); setStudents([]); return; }
    fetch(`/api/units/${unitId}/attendance`).then(r => r.ok ? r.json() : []).then(d => setSessions(Array.isArray(d) ? d : [])).catch(() => {});
    const unit = units.find(u => u._id === unitId);
    setStudents(unit?.students || []);
  };

  const togglePresent = (id) => setPresentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const recordSession = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/units/${selectedUnit}/attendance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, topic, presentStudentIds: presentIds }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast('Attendance recorded', 'success');
      setShowForm(false); setTopic(''); setPresentIds([]);
      selectUnit(selectedUnit);
    } catch (err) { toast(err.message, 'error'); }
  };

  if (loading) return <Loading />;

  return (
    <>
      <h3 style={{ marginBottom: 16 }}>Unit Attendance</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={selectedUnit} onChange={e => selectUnit(e.target.value)} style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', minWidth: 250 }}>
          <option value="">Select Unit...</option>
          {units.map(u => <option key={u._id} value={u._id}>{u.code} — {u.name}</option>)}
        </select>
        {selectedUnit && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}><i className="fas fa-plus"></i> New Session</button>}
      </div>

      {showForm && selectedUnit && (
        <form className="form-card" onSubmit={recordSession} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="form-group"><label>Topic</label><input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Lesson topic" /></div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontWeight: 600 }}>Mark Present Students ({presentIds.length}/{students.length})</label>
            <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPresentIds(students.map(s => s._id || s))}>All Present</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPresentIds([])}>Clear</button>
            </div>
            <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)' }}>
              {students.map(s => {
                const id = s._id || s;
                const name = s.fullName || s.regNumber || s.registrationNumber || id;
                return (
                  <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={presentIds.includes(id)} onChange={() => togglePresent(id)} />
                    <span>{name}</span>{(s.regNumber || s.registrationNumber) && <small style={{ color: 'var(--gray-500)' }}>{s.regNumber || s.registrationNumber}</small>}
                  </label>
                );
              })}
              {students.length === 0 && <p style={{ padding: 10, color: 'var(--gray-500)' }}>No students enrolled.</p>}
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 12 }}><button className="btn btn-primary" type="submit">Record Attendance</button><button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}

      {selectedUnit && sessions.length > 0 && (
        <div className="form-card">
          <h4 style={{ marginBottom: 10 }}>Attendance History ({sessions.length} sessions)</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Topic</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead>
              <tbody>{sessions.map((s, i) => {
                const present = s.presentStudentIds?.length || s.presentStudents?.length || 0;
                const total = students.length || 1;
                return (
                  <tr key={i}>
                    <td>{fmtDt(s.date)}</td>
                    <td>{s.topic || '--'}</td>
                    <td>{present}</td>
                    <td>{total - present}</td>
                    <td><Badge type={present / total >= 0.7 ? 'success' : present / total >= 0.5 ? 'warning' : 'danger'}>{Math.round((present / total) * 100)}%</Badge></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}
      {selectedUnit && sessions.length === 0 && <Empty text="No attendance sessions recorded for this unit." />}
    </>
  );
}
