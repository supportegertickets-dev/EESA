import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loading, Empty, Badge, useToast } from '../../components/ui';

const CATEGORY_OPTIONS = [
  { value: 'past-papers', label: 'Past Papers', icon: 'fa-file-alt' },
  { value: 'notes', label: 'Lecture Notes', icon: 'fa-sticky-note' },
  { value: 'lab-manuals', label: 'Lab Manuals', icon: 'fa-flask' },
  { value: 'tutorials', label: 'Tutorials', icon: 'fa-chalkboard' },
  { value: 'projects', label: 'Projects', icon: 'fa-project-diagram' },
  { value: 'other', label: 'Other', icon: 'fa-folder' },
];

export default function Resources() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'notes',
    department: '',
    yearOfStudy: '',
    externalLink: ''
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (department) params.set('department', department);
    if (search) params.set('search', search);
    fetch(`/api/resources?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setResources(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category, department, search]);

  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [load]);

  const track = async (id) => {
    await fetch(`/api/resources/${id}/download`, { method: 'POST' }).catch(() => {});
  };

  const submitResource = async (e) => {
    e.preventDefault();
    if (!fileRef.current?.files[0] && !form.externalLink.trim()) {
      return toast('Attach a file or provide an external link', 'error');
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (fileRef.current?.files[0]) fd.append('file', fileRef.current.files[0]);
      const res = await fetch('/api/resources/submit', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit resource');
      toast(data.message || 'Resource submitted for review', 'success');
      setForm({ title: '', description: '', category: 'notes', department: '', yearOfStudy: '', externalLink: '' });
      if (fileRef.current) fileRef.current.value = '';
      setShowForm(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryMeta = (value) => CATEGORY_OPTIONS.find(c => c.value === value) || { label: value || 'Other', icon: 'fa-file' };

  return (
    <>
      <div className="form-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h4 style={{ marginBottom: 6 }}><i className="fas fa-book"></i> Resource Library</h4>
            <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '.9rem' }}>
              Members can now upload notes, tutorials, lab manuals, and project resources. New submissions are reviewed by admin before approval.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
            <i className="fas fa-plus"></i> {showForm ? 'Close Form' : 'Add Resource'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submitResource} style={{ marginTop: 16 }}>
            <div className="form-row">
              <div className="form-group">
                <label>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Mechanical" />
              </div>
              <div className="form-group">
                <label>Year of Study</label>
                <select value={form.yearOfStudy} onChange={e => setForm(f => ({ ...f, yearOfStudy: e.target.value }))}>
                  <option value="">All years</option>
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}></textarea>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>External Link (optional)</label>
                <input value={form.externalLink} onChange={e => setForm(f => ({ ...f, externalLink: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>Attach File (optional)</label>
                <input type="file" ref={fileRef} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              <i className="fas fa-upload"></i> {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </form>
        )}
      </div>

      <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <select className="form-group" style={{ margin: 0, padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }} value={department} onChange={e => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {['Mechanical Engineering', 'Electrical and Electronic Engineering', 'Civil Engineering', 'Agricultural Engineering'].map(d => <option key={d}>{d}</option>)}
        </select>
        <input style={{ padding: '8px 12px', border: '2px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', flex: 1, minWidth: 200 }} placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <Loading /> : resources.length === 0 ? <Empty text="No resources found." /> : (
        <div className="react-data-grid">
          {resources.map(r => {
            const meta = getCategoryMeta(r.category);
            return (
              <div key={r._id} className="form-card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: '2rem', color: 'var(--primary)', minWidth: 40, textAlign: 'center' }}>
                  <i className={`fas ${meta.icon}`}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: 4 }}>{r.title}</h4>
                  <p style={{ fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: 8 }}>{(r.description || '').slice(0, 160)}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge type="primary">{meta.label}</Badge>
                    {r.department && <Badge type="secondary">{r.department}</Badge>}
                    {r.approvalStatus && <Badge type={r.approvalStatus === 'approved' ? 'success' : r.approvalStatus === 'rejected' ? 'danger' : 'warning'}>{r.approvalStatus}</Badge>}
                    <span style={{ fontSize: '.8rem', color: 'var(--gray-500)' }}><i className="fas fa-download"></i> {r.downloads || 0}</span>
                  </div>
                  <p style={{ marginTop: 8, marginBottom: 0, fontSize: '.8rem', color: 'var(--gray-500)' }}>
                    Shared by {r.submittedByName || r.uploadedByMember?.fullName || r.uploadedBy?.fullName || r.uploadedBy?.username || 'EESA'}
                  </p>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {r.fileUrl && <a href={r.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" onClick={() => track(r._id)}><i className="fas fa-download"></i> Download</a>}
                    {r.externalLink && <a href={r.externalLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><i className="fas fa-external-link-alt"></i> Open Link</a>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
