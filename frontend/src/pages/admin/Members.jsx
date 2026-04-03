import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, Modal, fmtDt, useToast } from '../../components/ui';

export default function Members() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const load = () => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (dept) p.set('department', dept);
    if (status) p.set('status', status);
    fetch(`/api/members?${p}`).then(r => r.ok ? r.json() : []).then(d => { setMembers(Array.isArray(d) ? d : d.members || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { setLoading(true); load(); }, [search, dept, status]);

  const verify = async (id) => {
    try {
      const res = await fetch(`/api/members/${id}/verify`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed');
      toast('Member verified', 'success'); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const changeStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/members/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error('Failed');
      toast('Status updated', 'success'); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const deleteMember = async (id) => {
    if (!window.confirm('Delete this member permanently?')) return;
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast('Member deleted', 'success'); setSelected(null); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  if (loading) return <Loading />;

  return (
    <>
      <h3 style={{ marginBottom: 16 }}>Manage Members</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Search name/reg no..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', minWidth: 200 }} />
        <select value={dept} onChange={e => setDept(e.target.value)} style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }}>
          <option value="">All Departments</option>
          <option>Computer Science</option><option>Mathematics</option><option>Physics</option>
          <option>Engineering</option><option>Biological Sciences</option><option>Chemistry</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }}>
          <option value="">All Statuses</option><option>active</option><option>pending</option><option>suspended</option>
        </select>
      </div>

      <div style={{ marginBottom: 10, fontSize: '.9rem', color: 'var(--gray-500)' }}>{members.length} members found</div>

      {members.length === 0 ? <Empty text="No members found." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Reg No</th><th>Department</th><th>Year</th><th>Status</th><th>Verified</th><th>Actions</th></tr></thead>
            <tbody>
              {members.map(m => (
                <tr key={m._id}>
                  <td>{m.fullName}</td>
                  <td>{m.regNumber || m.registrationNumber}</td>
                  <td>{m.department}</td>
                  <td>{m.yearOfStudy}</td>
                  <td><Badge type={m.status === 'active' ? 'success' : m.status === 'suspended' ? 'danger' : 'warning'}>{m.status}</Badge></td>
                  <td>{m.isVerified ? <i className="fas fa-check-circle" style={{ color: 'var(--success)' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--danger)' }}></i>}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {!m.isVerified && <button className="btn btn-success btn-sm" onClick={() => verify(m._id)} title="Verify"><i className="fas fa-check"></i></button>}
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(m)} title="View"><i className="fas fa-eye"></i></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteMember(m._id)} title="Delete"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={selected.fullName} onClose={() => setSelected(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
            {[['Reg No', selected.regNumber || selected.registrationNumber], ['Email', selected.email], ['Phone', selected.phone], ['Department', selected.department], ['Year', selected.yearOfStudy], ['Gender', selected.gender], ['Status', selected.status], ['Verified', selected.isVerified ? 'Yes' : 'No'], ['Reg Fee', selected.registrationPaid ? 'Paid' : 'Unpaid'], ['Semester', selected.currentSemester || 'Unpaid'], ['Registered', fmtDt(selected.createdAt)]].map(([l, v]) => (
              <div key={l}><small style={{ color: 'var(--gray-500)' }}>{l}</small><div>{v || '--'}</div></div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            {!selected.isVerified && <button className="btn btn-success btn-sm" onClick={() => { verify(selected._id); setSelected(null); }}>Verify</button>}
            {selected.status !== 'suspended' && <button className="btn btn-warning btn-sm" onClick={() => { changeStatus(selected._id, 'suspended'); setSelected(null); }}>Suspend</button>}
            {selected.status === 'suspended' && <button className="btn btn-success btn-sm" onClick={() => { changeStatus(selected._id, 'active'); setSelected(null); }}>Activate</button>}
            <button className="btn btn-danger btn-sm" onClick={() => deleteMember(selected._id)}>Delete</button>
          </div>
        </Modal>
      )}
    </>
  );
}
