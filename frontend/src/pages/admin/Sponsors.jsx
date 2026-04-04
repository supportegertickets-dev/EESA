import React, { useState, useEffect, useRef } from 'react';
import { Loading, Empty, Badge, fmt, fmtDt, useToast } from '../../components/ui';

const EMPTY = { name: '', description: '', tier: 'silver', email: '', password: '', contactPerson: '', phone: '', website: '', amount: '', startDate: '', endDate: '' };

export default function Sponsors() {
  const toast = useToast();
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const logoRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sponsors/all?_ts=${Date.now()}`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      setSponsors(Array.isArray(data) ? data : []);
    } catch {
      setSponsors([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (logoRef.current?.files[0]) fd.append('logo', logoRef.current.files[0]);
    const url = editId ? `/api/sponsors/${editId}` : '/api/sponsors';
    try {
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast(editId ? 'Updated' : 'Sponsor created', 'success');
      setShowForm(false); setEditId(null); setForm(EMPTY); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const edit = (s) => { setForm({ name: s.name, description: s.description || '', tier: s.tier || 'silver', email: s.email || '', password: '', contactPerson: s.contactPerson || '', phone: s.phone || '', website: s.website || '', amount: s.amount || '', startDate: s.startDate?.slice(0, 10) || '', endDate: s.endDate?.slice(0, 10) || '' }); setEditId(s._id); setShowForm(true); };

  const del = async (id) => {
    if (!window.confirm('Delete this sponsor?')) return;

    const previous = sponsors;
    setSponsors(current => current.filter(sponsor => sponsor._id !== id));

    try {
      const res = await fetch(`/api/sponsors/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete sponsor');
      toast('Deleted', 'success');
      load();
    } catch (err) {
      setSponsors(previous);
      toast(err.message, 'error');
    }
  };

  if (loading) return <Loading />;

  const tierColors = { platinum: '#8e44ad', gold: 'var(--accent)', silver: 'var(--gray-500)', bronze: '#cd6133', partner: 'var(--info)' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3>Manage Sponsors</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(!showForm); }}><i className="fas fa-plus"></i> Add Sponsor</button>
      </div>

      {showForm && (
        <form className="form-card" onSubmit={save} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label>Name</label><input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
            <div className="form-group"><label>Tier</label>
              <select value={form.tier} onChange={e => set('tier', e.target.value)}>
                <option>platinum</option><option>gold</option><option>silver</option><option>bronze</option><option>partner</option>
              </select>
            </div>
            <div className="form-group"><label>Email (login)</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
            <div className="form-group"><label>Password{editId ? ' (leave blank to keep)' : ''}</label><input type="password" value={form.password} onChange={e => set('password', e.target.value)} {...(!editId ? { required: true } : {})} /></div>
            <div className="form-group"><label>Contact Person</label><input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="form-group"><label>Website</label><input value={form.website} onChange={e => set('website', e.target.value)} /></div>
            <div className="form-group"><label>Amount (KSh)</label><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} /></div>
            <div className="form-group"><label>Start Date</label><input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
            <div className="form-group"><label>Logo</label><input type="file" accept="image/*" ref={logoRef} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Description</label><textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}></textarea></div>
          </div>
          <div className="form-actions"><button className="btn btn-primary" type="submit">{editId ? 'Update' : 'Create'}</button><button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}

      {sponsors.length === 0 ? <Empty text="No sponsors." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Logo</th><th>Name</th><th>Tier</th><th>Contact</th><th>Amount</th><th>Period</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>{sponsors.map(s => (
              <tr key={s._id}>
                <td>{s.logo ? <img src={s.logo} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} /> : <i className="fas fa-building" style={{ fontSize: 24, color: 'var(--gray-400)' }}></i>}</td>
                <td><strong>{s.name}</strong><br /><small>{s.email}</small></td>
                <td><Badge type="default" style={{ background: tierColors[s.tier] + '20', color: tierColors[s.tier] }}>{s.tier}</Badge></td>
                <td>{s.contactPerson || '--'}<br /><small>{s.phone}</small></td>
                <td>KSh {Number(s.amount || 0).toLocaleString('en-KE')}</td>
                <td><small>{s.startDate ? fmtDt(s.startDate) : '--'}<br />{s.endDate ? fmtDt(s.endDate) : '--'}</small></td>
                <td>{s.isActive !== false ? <i className="fas fa-check-circle" style={{ color: 'var(--success)' }}></i> : <i className="fas fa-times-circle" style={{ color: 'var(--danger)' }}></i>}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => edit(s)}><i className="fas fa-edit"></i></button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(s._id)}><i className="fas fa-trash"></i></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
