import React, { useState, useEffect, useRef } from 'react';
import { Loading, Empty, Badge, Modal, fmt, fmtDt, useToast } from '../../components/ui';

const CATEGORIES = [
  { value: 'past-papers', label: 'Past Papers', icon: 'fa-file-alt' },
  { value: 'notes', label: 'Lecture Notes', icon: 'fa-sticky-note' },
  { value: 'lab-manuals', label: 'Lab Manuals', icon: 'fa-flask' },
  { value: 'tutorials', label: 'Tutorials', icon: 'fa-chalkboard' },
  { value: 'projects', label: 'Projects', icon: 'fa-project-diagram' },
  { value: 'other', label: 'Other', icon: 'fa-folder' },
];
const DEPARTMENTS = ['Mechanical Engineering', 'Electrical and Electronic Engineering', 'Civil Engineering', 'Agricultural Engineering'];
const catMeta = v => CATEGORIES.find(c => c.value === v) || { label: v || 'Other', icon: 'fa-file' };
const fileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const EMPTY = { title: '', description: '', category: 'notes', department: '', yearOfStudy: '', externalLink: '', isPublic: false };

export default function Resources() {
  const toast = useToast();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filters
  const [filterCat, setFilterCat] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  // Detail modal
  const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat) params.set('category', filterCat);
      if (filterDept) params.set('department', filterDept);
      if (filterStatus) params.set('status', filterStatus);
      if (search) params.set('search', search);
      const res = await fetch(`/api/resources?${params}&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setResources(Array.isArray(data) ? data : []);
    } catch { setResources([]); }
    finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/resources/stats?_ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [filterCat, filterDept, filterStatus, search]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!editId && !fileRef.current?.files[0] && !form.externalLink.trim()) {
      return toast('Attach a file or provide an external link', 'error');
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
      if (fileRef.current?.files[0]) fd.append('file', fileRef.current.files[0]);
      const url = editId ? `/api/resources/${editId}` : '/api/resources';
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(editId ? 'Resource updated' : 'Resource created', 'success');
      setShowForm(false); setEditId(null); setForm(EMPTY);
      if (fileRef.current) fileRef.current.value = '';
      load(); loadStats();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const edit = (r) => {
    setForm({
      title: r.title || '', description: r.description || '', category: r.category || 'notes',
      department: r.department || '', yearOfStudy: r.yearOfStudy || '',
      externalLink: r.externalLink || '', isPublic: r.isPublic || false
    });
    setEditId(r._id);
    setShowForm(true);
    setDetail(null);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this resource permanently?')) return;
    const previous = resources;
    setResources(curr => curr.filter(r => r._id !== id));
    setDetail(null);
    try {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast('Resource deleted', 'success');
      load(); loadStats();
    } catch (err) { setResources(previous); toast(err.message, 'error'); }
  };

  const setApproval = async (id, status) => {
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: status, isPublic: status === 'approved' })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(`Resource ${status}`, 'success');
      load(); loadStats();
      if (detail?._id === id) setDetail(d => ({ ...d, approvalStatus: status, isPublic: status === 'approved' }));
    } catch (err) { toast(err.message, 'error'); }
  };

  const pending = resources.filter(r => r.approvalStatus === 'pending');
  const nonPending = resources.filter(r => r.approvalStatus !== 'pending');

  return (
    <>
      {/* Header + Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}><i className="fas fa-book-open"></i> Resource Management</h3>
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '.88rem' }}>Upload, review, and manage academic resources for members</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(v => !v); }}>
          <i className="fas fa-plus"></i> {showForm ? 'Close Form' : 'Upload Resource'}
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total', val: stats.total, icon: 'fa-layer-group', color: 'var(--primary)' },
            { label: 'Pending', val: stats.pending, icon: 'fa-clock', color: 'var(--warning)' },
            { label: 'Approved', val: stats.approved, icon: 'fa-check-circle', color: 'var(--success)' },
            { label: 'Downloads', val: stats.totalDownloads, icon: 'fa-download', color: 'var(--info, #3b82f6)' },
          ].map(s => (
            <div key={s.label} className="form-card" style={{ padding: 16, textAlign: 'center', marginBottom: 0 }}>
              <i className={`fas ${s.icon}`} style={{ fontSize: '1.4rem', color: s.color, marginBottom: 4 }}></i>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--gray-500)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Edit Form */}
      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12 }}>{editId ? 'Edit Resource' : 'Upload New Resource'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Thermodynamics Past Paper 2024" />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">-- Select --</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Year of Study</label>
              <select value={form.yearOfStudy} onChange={e => set('yearOfStudy', e.target.value)}>
                <option value="">All Years</option>
                {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>External Link (optional)</label>
              <input value={form.externalLink} onChange={e => set('externalLink', e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{editId ? 'Replace File (optional)' : 'Attach File'}</label>
              <input type="file" ref={fileRef} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of the resource..."></textarea>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isPublic} onChange={e => set('isPublic', e.target.checked)} style={{ width: 'auto' }} />
                Make publicly visible (no login required)
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : editId ? 'fa-save' : 'fa-upload'}`}></i> {submitting ? 'Saving...' : editId ? 'Update Resource' : 'Upload Resource'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <select style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', flex: 1, minWidth: 180 }} placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <Loading /> : (
        <>
          {/* Pending Review Section */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12, color: 'var(--warning)' }}>
                <i className="fas fa-clock"></i> Pending Review ({pending.length})
              </h4>
              <div className="react-data-grid">
                {pending.map(r => {
                  const meta = catMeta(r.category);
                  return (
                    <div key={r._id} className="form-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12, border: '2px solid var(--warning)', borderLeft: '4px solid var(--warning)' }}>
                      <div style={{ fontSize: '1.8rem', color: 'var(--primary)', minWidth: 36, textAlign: 'center', paddingTop: 2 }}>
                        <i className={`fas ${meta.icon}`}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                          <div>
                            <h4 style={{ marginBottom: 2, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setDetail(r)}>{r.title}</h4>
                            <span style={{ fontSize: '.8rem', color: 'var(--gray-500)' }}>
                              By {r.submittedByName || r.uploadedByMember?.fullName || 'Unknown'}
                              {r.uploadedByMember?.department && ` — ${r.uploadedByMember.department}`}
                              {' · '}{fmt(r.createdAt)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-success btn-sm" onClick={() => setApproval(r._id, 'approved')}><i className="fas fa-check"></i> Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setApproval(r._id, 'rejected')}><i className="fas fa-times"></i> Reject</button>
                          </div>
                        </div>
                        {r.description && <p style={{ fontSize: '.85rem', color: 'var(--gray-600)', margin: '6px 0 4px' }}>{r.description.slice(0, 200)}</p>}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          <Badge type="primary">{meta.label}</Badge>
                          {r.department && <Badge type="secondary">{r.department}</Badge>}
                          {r.yearOfStudy && <Badge type="info">Year {r.yearOfStudy}</Badge>}
                          {r.fileName && <span style={{ fontSize: '.78rem', color: 'var(--gray-500)' }}><i className="fas fa-paperclip"></i> {r.fileName} {fileSize(r.fileSize) && `(${fileSize(r.fileSize)})`}</span>}
                          {r.externalLink && <span style={{ fontSize: '.78rem', color: 'var(--gray-500)' }}><i className="fas fa-link"></i> External link</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Resources Table */}
          {nonPending.length === 0 && pending.length === 0 ? <Empty text="No resources found." /> : nonPending.length > 0 && (
            <div>
              <h4 style={{ marginBottom: 12 }}><i className="fas fa-folder-open"></i> All Resources ({nonPending.length})</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Department</th>
                      <th>Year</th>
                      <th>Submitted By</th>
                      <th>Status</th>
                      <th>Downloads</th>
                      <th>Public</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonPending.map(r => {
                      const meta = catMeta(r.category);
                      return (
                        <tr key={r._id}>
                          <td style={{ color: 'var(--primary)', fontSize: '1.1rem' }}><i className={`fas ${meta.icon}`}></i></td>
                          <td>
                            <span style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }} onClick={() => setDetail(r)}>{r.title}</span>
                            {r.fileName && <div style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{r.fileName}</div>}
                          </td>
                          <td><Badge type="primary">{meta.label}</Badge></td>
                          <td>{r.department || '--'}</td>
                          <td>{r.yearOfStudy || '--'}</td>
                          <td>
                            <div>{r.submittedByName || r.uploadedByMember?.fullName || r.uploadedBy?.fullName || r.uploadedBy?.username || '--'}</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{r.submittedByRole}</div>
                          </td>
                          <td><Badge type={r.approvalStatus === 'approved' ? 'success' : r.approvalStatus === 'rejected' ? 'danger' : 'warning'}>{r.approvalStatus}</Badge></td>
                          <td><i className="fas fa-download" style={{ color: 'var(--gray-400)', marginRight: 4 }}></i>{r.downloads || 0}</td>
                          <td>{r.isPublic ? <Badge type="success">Yes</Badge> : <Badge type="secondary">No</Badge>}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.createdAt)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {r.approvalStatus === 'rejected' && <button className="btn btn-success btn-sm" title="Approve" onClick={() => setApproval(r._id, 'approved')}><i className="fas fa-check"></i></button>}
                              <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => edit(r)}><i className="fas fa-edit"></i></button>
                              <button className="btn btn-ghost btn-sm" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => del(r._id)}><i className="fas fa-trash"></i></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Resource Details" large>
        {detail && (
          <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '2.5rem', color: 'var(--primary)' }}><i className={`fas ${catMeta(detail.category).icon}`}></i></div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{detail.title}</h3>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <Badge type="primary">{catMeta(detail.category).label}</Badge>
                  {detail.department && <Badge type="secondary">{detail.department}</Badge>}
                  {detail.yearOfStudy && <Badge type="info">Year {detail.yearOfStudy}</Badge>}
                  <Badge type={detail.approvalStatus === 'approved' ? 'success' : detail.approvalStatus === 'rejected' ? 'danger' : 'warning'}>{detail.approvalStatus}</Badge>
                  {detail.isPublic && <Badge type="accent">Public</Badge>}
                </div>
              </div>
            </div>

            {detail.description && (
              <div className="form-card" style={{ marginBottom: 16, background: 'var(--gray-50, #f9fafb)' }}>
                <p style={{ margin: 0, fontSize: '.9rem', lineHeight: 1.6 }}>{detail.description}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: '.88rem' }}>
              <div><strong>Submitted By:</strong> {detail.submittedByName || detail.uploadedByMember?.fullName || detail.uploadedBy?.fullName || '--'}</div>
              <div><strong>Role:</strong> {detail.submittedByRole}</div>
              {detail.uploadedByMember?.regNumber && <div><strong>Reg Number:</strong> {detail.uploadedByMember.regNumber}</div>}
              {detail.uploadedByMember?.department && <div><strong>Department:</strong> {detail.uploadedByMember.department}</div>}
              <div><strong>Downloads:</strong> {detail.downloads || 0}</div>
              <div><strong>Uploaded:</strong> {fmtDt(detail.createdAt)}</div>
              {detail.fileName && <div><strong>File:</strong> {detail.fileName} {fileSize(detail.fileSize) && `(${fileSize(detail.fileSize)})`}</div>}
              {detail.externalLink && <div><strong>External Link:</strong> <a href={detail.externalLink} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{detail.externalLink.slice(0, 50)}...</a></div>}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
              {detail.fileUrl && <a href={detail.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm"><i className="fas fa-download"></i> Download File</a>}
              {detail.externalLink && <a href={detail.externalLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><i className="fas fa-external-link-alt"></i> Open Link</a>}
              {detail.approvalStatus === 'pending' && (
                <>
                  <button className="btn btn-success btn-sm" onClick={() => setApproval(detail._id, 'approved')}><i className="fas fa-check"></i> Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setApproval(detail._id, 'rejected')}><i className="fas fa-times"></i> Reject</button>
                </>
              )}
              {detail.approvalStatus === 'rejected' && <button className="btn btn-success btn-sm" onClick={() => setApproval(detail._id, 'approved')}><i className="fas fa-check"></i> Approve</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => edit(detail)}><i className="fas fa-edit"></i> Edit</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(detail._id)}><i className="fas fa-trash"></i> Delete</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
