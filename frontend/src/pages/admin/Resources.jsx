import React, { useState, useEffect, useRef } from 'react';
import { Loading, Empty, Badge, fmtDt, useToast } from '../../components/ui';

const EMPTY = { title: '', description: '', category: 'notes', department: '', fileUrl: '' };

export default function Resources() {
  const toast = useToast();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const fileRef = useRef();

  const load = () => {
    fetch('/api/resources').then(r => r.ok ? r.json() : []).then(d => { setResources(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (fileRef.current?.files[0]) fd.append('file', fileRef.current.files[0]);
    const url = editId ? `/api/resources/${editId}` : '/api/resources';
    try {
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(editId ? 'Resource updated' : 'Resource created', 'success');
      setShowForm(false); setEditId(null); setForm(EMPTY); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const edit = (r) => { setForm({ title: r.title, description: r.description || '', category: r.category || 'notes', department: r.department || '', fileUrl: r.fileUrl || '' }); setEditId(r._id); setShowForm(true); };

  const del = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    await fetch(`/api/resources/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load();
  };

  const setApproval = async (id, approvalStatus) => {
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus, isPublic: approvalStatus === 'approved' })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update status');
      toast(`Resource ${approvalStatus}`, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3>Manage Resources</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(!showForm); }}><i className="fas fa-plus"></i> Upload Resource</button>
      </div>

      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Title</label><input value={form.title} onChange={e => set('title', e.target.value)} required /></div>
            <div className="form-group"><label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                <option>notes</option><option>past-paper</option><option>tutorial</option><option>textbook</option><option>other</option>
              </select>
            </div>
            <div className="form-group"><label>Department</label><input value={form.department} onChange={e => set('department', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>File</label><input type="file" ref={fileRef} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Description</label><textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}></textarea></div>
          </div>
          <div className="form-actions"><button className="btn btn-primary" type="submit">{editId ? 'Update' : 'Upload'}</button><button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}

      {resources.length === 0 ? <Empty text="No resources yet." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Title</th><th>Category</th><th>Department</th><th>Submitted By</th><th>Status</th><th>Downloads</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>{resources.map(r => (
              <tr key={r._id}>
                <td>{r.title}</td>
                <td><Badge type="info">{r.category}</Badge></td>
                <td>{r.department || '--'}</td>
                <td>{r.submittedByName || r.uploadedByMember?.fullName || r.uploadedBy?.fullName || r.uploadedBy?.username || '--'}</td>
                <td><Badge type={r.approvalStatus === 'approved' ? 'success' : r.approvalStatus === 'rejected' ? 'danger' : 'warning'}>{r.approvalStatus || 'approved'}</Badge></td>
                <td>{r.downloads || 0}</td>
                <td>{fmtDt(r.createdAt)}</td>
                <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {r.approvalStatus === 'pending' && (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => setApproval(r._id, 'approved')} title="Approve"><i className="fas fa-check"></i></button>
                      <button className="btn btn-danger btn-sm" onClick={() => setApproval(r._id, 'rejected')} title="Reject"><i className="fas fa-times"></i></button>
                    </>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => edit(r)}><i className="fas fa-edit"></i></button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(r._id)}><i className="fas fa-trash"></i></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
