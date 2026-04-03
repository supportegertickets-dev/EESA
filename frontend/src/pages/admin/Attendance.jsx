import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, fmtDt, useToast } from '../../components/ui';

export default function AdminAttendance() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [records, setRecords] = useState([]);
  const [members, setMembers] = useState([]);
  const [bulkIds, setBulkIds] = useState([]);

  useEffect(() => {
    fetch('/api/events').then(r => r.ok ? r.json() : []).then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const loadRecords = (eventId) => {
    setSelectedEvent(eventId);
    if (!eventId) { setRecords([]); return; }
    fetch(`/api/attendance/event/${eventId}`).then(r => r.ok ? r.json() : []).then(d => setRecords(Array.isArray(d) ? d : [])).catch(() => {});
  };

  const loadMembers = () => {
    if (members.length > 0) return;
    fetch('/api/members').then(r => r.ok ? r.json() : []).then(d => setMembers(Array.isArray(d) ? d : d.members || [])).catch(() => {});
  };

  const markSingle = async (memberId) => {
    if (!selectedEvent) { toast('Select an event first', 'error'); return; }
    try {
      const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: selectedEvent, memberId, method: 'manual' }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast('Attendance marked', 'success'); loadRecords(selectedEvent);
    } catch (err) { toast(err.message, 'error'); }
  };

  const markBulk = async () => {
    if (!selectedEvent || bulkIds.length === 0) { toast('Select event and members', 'error'); return; }
    try {
      const res = await fetch('/api/attendance/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: selectedEvent, memberIds: bulkIds }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(`Marked ${bulkIds.length} members`, 'success'); setBulkIds([]); loadRecords(selectedEvent);
    } catch (err) { toast(err.message, 'error'); }
  };

  const deleteRecord = async (id) => {
    await fetch(`/api/attendance/${id}`, { method: 'DELETE' }).catch(() => {});
    toast('Record deleted', 'success'); loadRecords(selectedEvent);
  };

  const toggleBulk = (id) => setBulkIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (loading) return <Loading />;

  const attendedIds = new Set(records.map(r => r.member?._id || r.member));

  return (
    <>
      <h3 style={{ marginBottom: 16 }}>Attendance Management</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={selectedEvent} onChange={e => loadRecords(e.target.value)} style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', minWidth: 250 }}>
          <option value="">Select Event...</option>
          {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title} — {fmtDt(ev.date)}</option>)}
        </select>
      </div>

      {selectedEvent && (
        <>
          <div className="form-card" style={{ marginBottom: 16 }}>
            <h4>Attendance Records ({records.length})</h4>
            {records.length === 0 ? <p style={{ color: 'var(--gray-500)', marginTop: 8 }}>No records yet.</p> : (
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table className="data-table">
                  <thead><tr><th>Member</th><th>Reg No</th><th>Check-in Time</th><th>Method</th><th></th></tr></thead>
                  <tbody>{records.map(r => (
                    <tr key={r._id}>
                      <td>{r.member?.fullName || '--'}</td>
                      <td>{r.member?.regNumber || r.member?.registrationNumber || '--'}</td>
                      <td>{fmtDt(r.checkinTime || r.createdAt)}</td>
                      <td><Badge type="info">{r.method || 'manual'}</Badge></td>
                      <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteRecord(r._id)}><i className="fas fa-trash"></i></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Bulk Mark Attendance</h4>
              <button className="btn btn-ghost btn-sm" onClick={loadMembers}><i className="fas fa-sync"></i> Load Members</button>
            </div>
            {members.length > 0 && (
              <>
                <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 10, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)' }}>
                  {members.filter(m => !attendedIds.has(m._id)).map(m => (
                    <label key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={bulkIds.includes(m._id)} onChange={() => toggleBulk(m._id)} />
                      <span>{m.fullName}</span><small style={{ color: 'var(--gray-500)' }}>{m.regNumber || m.registrationNumber}</small>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={markBulk} disabled={bulkIds.length === 0}><i className="fas fa-check-double"></i> Mark Selected ({bulkIds.length})</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setBulkIds(members.filter(m => !attendedIds.has(m._id)).map(m => m._id))}>Select All</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setBulkIds([])}>Deselect All</button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
