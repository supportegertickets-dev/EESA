import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, Modal, fmtDt, useToast } from '../../components/ui';

const EMPTY = { title: '', description: '', startDate: '', endDate: '', positions: '', status: 'upcoming' };
const EMPTY_CANDIDATE = { memberId: '', position: '', manifesto: '', image: null };

function CandidateAvatar({ candidate, size = 64 }) {
  const src = candidate?.imageUrl || candidate?.member?.profilePhoto;
  const initials = (candidate?.member?.fullName || 'Aspirant')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

  if (src) {
    return <img src={src} alt={candidate?.member?.fullName || 'Aspirant'} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gray-200)' }} />;
  }

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--gray-200)', color: 'var(--primary)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
      {initials}
    </div>
  );
}

export default function Elections() {
  const toast = useToast();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingCandidate, setSubmittingCandidate] = useState(false);
  const [candidateEditId, setCandidateEditId] = useState(null);
  const [candForm, setCandForm] = useState(EMPTY_CANDIDATE);
  const [members, setMembers] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/elections?_ts=${Date.now()}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setElections(Array.isArray(data) ? data : []);
    } catch {
      setElections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await fetch(`/api/members?_ts=${Date.now()}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setMembers(Array.isArray(data) ? data : data.members || []);
    } catch {
      setMembers([]);
    }
  };

  const refreshDetail = async (id) => {
    try {
      const res = await fetch(`/api/elections/${id}?_ts=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to refresh election');
      const data = await res.json();
      setDetail(data);
      return data;
    } catch {
      return null;
    }
  };

  const resetCandidateForm = () => {
    setCandForm(EMPTY_CANDIDATE);
    setCandidateEditId(null);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, positions: form.positions.split(',').map(s => s.trim()).filter(Boolean) };
    const url = editId ? `/api/elections/${editId}` : '/api/elections';

    try {
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(editId ? 'Election updated successfully' : 'Election created successfully', 'success');
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const edit = (el) => {
    setForm({
      title: el.title,
      description: el.description || '',
      startDate: el.startDate?.slice(0, 16) || '',
      endDate: el.endDate?.slice(0, 16) || '',
      positions: (el.positions || []).join(', '),
      status: el.status || 'upcoming'
    });
    setEditId(el._id);
    setShowForm(true);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this election?')) return;

    const previous = elections;
    setElections(current => current.filter(election => election._id !== id));
    if (detail?._id === id) setDetail(null);

    try {
      const res = await fetch(`/api/elections/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete election');
      toast('Election deleted', 'success');
      load();
    } catch (err) {
      setElections(previous);
      toast(err.message, 'error');
    }
  };

  const openDetail = async (el) => {
    setDetail(el);
    resetCandidateForm();
    setLoadingDetail(true);

    if (members.length === 0) {
      loadMembers();
    }

    try {
      await refreshDetail(el._id);
    } finally {
      setLoadingDetail(false);
    }
  };

  const saveCandidate = async (e) => {
    e.preventDefault();
    if (!detail) return;

    const fd = new FormData();
    fd.append('memberId', candForm.memberId);
    fd.append('position', candForm.position);
    fd.append('manifesto', candForm.manifesto);
    if (candForm.image) fd.append('image', candForm.image);

    setSubmittingCandidate(true);
    try {
      const res = await fetch(
        candidateEditId ? `/api/elections/${detail._id}/candidates/${candidateEditId}` : `/api/elections/${detail._id}/candidates`,
        { method: candidateEditId ? 'PUT' : 'POST', body: fd }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save aspirant');

      toast(candidateEditId ? 'Aspirant updated' : 'Aspirant added', 'success');
      resetCandidateForm();
      setDetail(data);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmittingCandidate(false);
    }
  };

  const editCandidate = (candidate) => {
    setCandidateEditId(candidate._id);
    setCandForm({
      memberId: candidate.member?._id || '',
      position: candidate.position || '',
      manifesto: candidate.manifesto || '',
      image: null
    });
  };

  const removeCandidate = async (candId) => {
    if (!detail || !window.confirm('Remove this aspirant from the election?')) return;

    try {
      const res = await fetch(`/api/elections/${detail._id}/candidates/${candId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove candidate');
      await Promise.all([refreshDetail(detail._id), load()]);
      toast('Aspirant removed', 'success');
      if (candidateEditId === candId) resetCandidateForm();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Election Management</h3>
          <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '.9rem' }}>Create polished elections, add aspirants, and upload their campaign photos.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(!showForm); }}>
          <i className="fas fa-plus"></i> New Election
        </button>
      </div>

      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Title</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Positions (comma-separated)</label>
              <input value={form.positions} onChange={e => set('positions', e.target.value)} placeholder="President, Vice President, Secretary" required />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="upcoming">upcoming</option>
                <option value="active">active</option>
                <option value="closed">closed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Give members a clear summary of the election." />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">{editId ? 'Update Election' : 'Create Election'}</button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {elections.length === 0 ? <Empty text="No elections." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Dates</th>
                <th>Positions</th>
                <th>Status</th>
                <th>Aspirants</th>
                <th>Voters</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {elections.map(el => (
                <tr key={el._id}>
                  <td>{el.title}</td>
                  <td>{fmtDt(el.startDate)} – {fmtDt(el.endDate)}</td>
                  <td>{(el.positions || []).join(', ')}</td>
                  <td><Badge type={el.status === 'active' ? 'success' : el.status === 'closed' ? 'default' : 'warning'}>{el.status}</Badge></td>
                  <td>{(el.candidates || []).length}</td>
                  <td>{el.totalVoters || 0}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openDetail(el)} title="Manage aspirants"><i className="fas fa-users"></i></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => edit(el)} title="Edit election"><i className="fas fa-edit"></i></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(el._id)} title="Delete election"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <Modal open={!!detail} title={`Election Setup — ${detail.title}`} onClose={() => { setDetail(null); resetCandidateForm(); }} large>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, color: 'var(--gray-500)' }}>{detail.description || 'Add aspirants, upload their images, and prepare members for a clean voting experience.'}</p>
              <small style={{ color: 'var(--gray-500)' }}>{fmtDt(detail.startDate)} – {fmtDt(detail.endDate)}</small>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge type={detail.status === 'active' ? 'success' : detail.status === 'closed' ? 'default' : 'warning'}>{detail.status}</Badge>
              <Badge>{(detail.candidates || []).length} aspirants</Badge>
              <Badge>{detail.totalVoters || 0} voters</Badge>
            </div>
          </div>

          {loadingDetail ? <Loading text="Refreshing election details..." /> : (
            <>
              {(detail.candidates || []).length === 0 ? <Empty text="No aspirants added yet." /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 18 }}>
                  {(detail.candidates || []).map(candidate => (
                    <div key={candidate._id} style={{ border: '1px solid var(--gray-200)', borderRadius: 12, padding: 12, background: 'var(--white)' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <CandidateAvatar candidate={candidate} />
                        <div style={{ flex: 1 }}>
                          <strong>{candidate.member?.fullName || 'Aspirant'}</strong>
                          <div style={{ fontSize: '.8rem', color: 'var(--gray-500)', marginTop: 2 }}>{candidate.position}</div>
                          <div style={{ fontSize: '.78rem', color: 'var(--gray-500)', marginTop: 4 }}>
                            {candidate.member?.department || 'EESA'}{candidate.member?.regNumber ? ` • ${candidate.member.regNumber}` : ''}
                          </div>
                        </div>
                      </div>

                      <p style={{ margin: '10px 0 8px', fontSize: '.86rem', color: 'var(--gray-700)' }}>{candidate.manifesto || 'No manifesto added yet.'}</p>

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => editCandidate(candidate)}>
                          <i className="fas fa-pen"></i> Edit
                        </button>
                        <button className="btn btn-ghost btn-sm" type="button" style={{ color: 'var(--danger)' }} onClick={() => removeCandidate(candidate._id)}>
                          <i className="fas fa-trash"></i> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={saveCandidate} style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <h5 style={{ marginBottom: 4 }}>{candidateEditId ? 'Edit Aspirant' : 'Add Aspirant'}</h5>
                    <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--gray-500)' }}>Upload a professional campaign photo and manifesto for each position.</p>
                  </div>
                  {candidateEditId && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={resetCandidateForm}>Cancel Edit</button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label>Member</label>
                    <select value={candForm.memberId} onChange={e => setCandForm(current => ({ ...current, memberId: e.target.value }))} required>
                      <option value="">Select Member</option>
                      {members.map(member => (
                        <option key={member._id} value={member._id}>
                          {member.fullName} ({member.regNumber || member.registrationNumber || 'No Reg'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Position</label>
                    <select value={candForm.position} onChange={e => setCandForm(current => ({ ...current, position: e.target.value }))} required>
                      <option value="">Position</option>
                      {(detail.positions || []).map(position => <option key={position} value={position}>{position}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Manifesto</label>
                    <textarea rows={3} placeholder="Why should members vote for this aspirant?" value={candForm.manifesto} onChange={e => setCandForm(current => ({ ...current, manifesto: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Aspirant Image</label>
                    <input type="file" accept="image/*" onChange={e => setCandForm(current => ({ ...current, image: e.target.files?.[0] || null }))} />
                    <small style={{ color: 'var(--gray-500)' }}>If no image is uploaded, the member profile photo will still be shown when available.</small>
                  </div>
                </div>

                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} type="submit" disabled={submittingCandidate}>
                  {submittingCandidate ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-image"></i> {candidateEditId ? 'Update Aspirant' : 'Add Aspirant'}</>}
                </button>
              </form>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
