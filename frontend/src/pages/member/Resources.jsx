import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loading, Empty, Badge, Modal, fmt, useToast } from '../../components/ui';

const CATEGORIES = [
  { value: 'past-papers', label: 'Past Papers', icon: 'fa-file-alt', color: '#ef4444' },
  { value: 'notes', label: 'Lecture Notes', icon: 'fa-sticky-note', color: '#f59e0b' },
  { value: 'lab-manuals', label: 'Lab Manuals', icon: 'fa-flask', color: '#8b5cf6' },
  { value: 'tutorials', label: 'Tutorials', icon: 'fa-chalkboard', color: '#3b82f6' },
  { value: 'projects', label: 'Projects', icon: 'fa-project-diagram', color: '#10b981' },
  { value: 'other', label: 'Other', icon: 'fa-folder', color: '#6b7280' },
];
const DEPARTMENTS = ['Mechanical Engineering', 'Electrical and Electronic Engineering', 'Civil Engineering', 'Agricultural Engineering'];
const catMeta = v => CATEGORIES.find(c => c.value === v) || { label: v || 'Other', icon: 'fa-file', color: '#6b7280' };
const fileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const EMPTY_FORM = { title: '', description: '', category: 'notes', department: '', yearOfStudy: '', externalLink: '' };

export default function Resources() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (department) params.set('department', department);
    if (year) params.set('year', year);
    if (search) params.set('search', search);
    params.set('_ts', Date.now());
    fetch(`/api/resources?${params}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setResources(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category, department, year, search]);

  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [load]);

  const track = async (id) => {
    await fetch(`/api/resources/${id}/download`, { method: 'POST' }).catch(() => {});
  };

  const submitResource = async (e) => {
    e.preventDefault();
    if (!fileRef.current?.files[0] && !form.externalLink.trim()) {
      return toast('Please attach a file or provide an external link', 'error');
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (fileRef.current?.files[0]) fd.append('file', fileRef.current.files[0]);
      const res = await fetch('/api/resources/submit', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit resource');
      toast(data.message || 'Resource submitted for review!', 'success');
      setForm(EMPTY_FORM);
      if (fileRef.current) fileRef.current.value = '';
      setShowForm(false);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // Separate approved from user's own pending/rejected
  const approved = resources.filter(r => r.approvalStatus === 'approved');
  const mySubmissions = resources.filter(r => r.approvalStatus !== 'approved');

  return (
    <>
      {/* Header */}
      <div className="form-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h4 style={{ marginBottom: 4 }}><i className="fas fa-book-open"></i> Resource Library</h4>
            <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '.88rem' }}>
              Browse approved academic resources or submit your own for admin review.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i> {showForm ? 'Close Form' : 'Submit Resource'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submitResource} style={{ marginTop: 16, borderTop: '1px solid var(--gray-200)', paddingTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. MEE 301 Past Paper 2024" />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="">-- Select --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Year of Study</label>
                <select value={form.yearOfStudy} onChange={e => setForm(f => ({ ...f, yearOfStudy: e.target.value }))}>
                  <option value="">All Years</option>
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>External Link (optional)</label>
                <input value={form.externalLink} onChange={e => setForm(f => ({ ...f, externalLink: e.target.value }))} placeholder="https://drive.google.com/..." />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Attach File (optional — max 10MB)</label>
                <input type="file" ref={fileRef} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the resource..."></textarea>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i> {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </form>
        )}
      </div>

      {/* Category Quick Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${!category ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setCategory('')}
          style={{ borderRadius: 20, padding: '6px 14px' }}
        >All</button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            className={`btn btn-sm ${category === c.value ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setCategory(category === c.value ? '' : c.value)}
            style={{ borderRadius: 20, padding: '6px 14px' }}
          ><i className={`fas ${c.icon}`} style={{ marginRight: 4 }}></i> {c.label}</button>
        ))}
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <select style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }} value={department} onChange={e => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }} value={year} onChange={e => setYear(e.target.value)}>
          <option value="">All Years</option>
          {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <input style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', flex: 1, minWidth: 180 }} placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <Loading /> : (
        <>
          {/* My Submissions (pending/rejected) */}
          {mySubmissions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12, color: 'var(--warning)' }}>
                <i className="fas fa-user-clock"></i> My Submissions
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {mySubmissions.map(r => {
                  const meta = catMeta(r.category);
                  return (
                    <div key={r._id} className="form-card" style={{ marginBottom: 0, borderTop: `3px solid ${r.approvalStatus === 'pending' ? 'var(--warning)' : 'var(--danger)'}`, cursor: 'pointer' }} onClick={() => setDetail(r)}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '1.5rem', color: meta.color, minWidth: 32, textAlign: 'center' }}>
                          <i className={`fas ${meta.icon}`}></i>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ marginBottom: 2, fontSize: '.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</h4>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            <Badge type={r.approvalStatus === 'pending' ? 'warning' : 'danger'}>{r.approvalStatus}</Badge>
                            <Badge type="primary">{meta.label}</Badge>
                          </div>
                          <div style={{ fontSize: '.78rem', color: 'var(--gray-500)', marginTop: 6 }}>{fmt(r.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Approved Resources */}
          {approved.length === 0 && mySubmissions.length === 0 ? <Empty text="No resources found. Try a different filter or submit one!" /> : approved.length > 0 && (
            <div>
              <h4 style={{ marginBottom: 14 }}><i className="fas fa-folder-open"></i> Available Resources ({approved.length})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {approved.map(r => {
                  const meta = catMeta(r.category);
                  return (
                    <div key={r._id} className="form-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', borderTop: `3px solid ${meta.color}` }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                        <div style={{ fontSize: '1.8rem', color: meta.color, minWidth: 36, textAlign: 'center', paddingTop: 2 }}>
                          <i className={`fas ${meta.icon}`}></i>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ marginBottom: 2, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setDetail(r)}>
                            {r.title}
                          </h4>
                          {r.description && <p style={{ fontSize: '.84rem', color: 'var(--gray-600)', margin: '4px 0 8px', lineHeight: 1.4 }}>{r.description.slice(0, 120)}{r.description.length > 120 ? '...' : ''}</p>}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            <Badge type="primary">{meta.label}</Badge>
                            {r.department && <Badge type="secondary">{r.department.replace(' Engineering', '')}</Badge>}
                            {r.yearOfStudy && <Badge type="info">Yr {r.yearOfStudy}</Badge>}
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: '.78rem', color: 'var(--gray-500)' }}>
                            <span><i className="fas fa-download"></i> {r.downloads || 0}</span>
                            {r.fileName && <span><i className="fas fa-paperclip"></i> {fileSize(r.fileSize) || r.fileName}</span>}
                            <span><i className="fas fa-calendar"></i> {fmt(r.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: '.78rem', color: 'var(--gray-500)', marginTop: 4 }}>
                            By {r.submittedByName || r.uploadedByMember?.fullName || r.uploadedBy?.fullName || 'EESA'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--gray-200)' }}>
                        {r.fileUrl && (
                          <a href={r.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ flex: 1, textAlign: 'center' }} onClick={() => track(r._id)}>
                            <i className="fas fa-download"></i> Download
                          </a>
                        )}
                        {r.externalLink && (
                          <a href={r.externalLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flex: 1, textAlign: 'center' }} onClick={() => track(r._id)}>
                            <i className="fas fa-external-link-alt"></i> Open Link
                          </a>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetail(r)} title="Details"><i className="fas fa-info-circle"></i></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Resource Details" large>
        {detail && (() => {
          const meta = catMeta(detail.category);
          return (
            <div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: '2.5rem', color: meta.color }}><i className={`fas ${meta.icon}`}></i></div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{detail.title}</h3>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <Badge type="primary">{meta.label}</Badge>
                    {detail.department && <Badge type="secondary">{detail.department}</Badge>}
                    {detail.yearOfStudy && <Badge type="info">Year {detail.yearOfStudy}</Badge>}
                    <Badge type={detail.approvalStatus === 'approved' ? 'success' : detail.approvalStatus === 'rejected' ? 'danger' : 'warning'}>{detail.approvalStatus}</Badge>
                  </div>
                </div>
              </div>

              {detail.description && (
                <div className="form-card" style={{ marginBottom: 16, background: 'var(--gray-50, #f9fafb)' }}>
                  <p style={{ margin: 0, fontSize: '.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{detail.description}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: '.88rem' }}>
                <div><strong>Shared by:</strong> {detail.submittedByName || detail.uploadedByMember?.fullName || detail.uploadedBy?.fullName || 'EESA'}</div>
                <div><strong>Role:</strong> <Badge type={detail.submittedByRole === 'Admin' ? 'accent' : 'secondary'}>{detail.submittedByRole}</Badge></div>
                <div><strong>Downloads:</strong> {detail.downloads || 0}</div>
                <div><strong>Uploaded:</strong> {fmt(detail.createdAt)}</div>
                {detail.fileName && <div style={{ gridColumn: '1 / -1' }}><strong>File:</strong> <i className="fas fa-paperclip"></i> {detail.fileName} {fileSize(detail.fileSize) && `(${fileSize(detail.fileSize)})`}</div>}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                {detail.fileUrl && (
                  <a href={detail.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" onClick={() => track(detail._id)}>
                    <i className="fas fa-download"></i> Download File
                  </a>
                )}
                {detail.externalLink && (
                  <a href={detail.externalLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" onClick={() => track(detail._id)}>
                    <i className="fas fa-external-link-alt"></i> Open Link
                  </a>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
