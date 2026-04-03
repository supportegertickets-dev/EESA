import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, fmt, fmtDt, useToast } from '../../components/ui';

export default function Payments() {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const load = () => {
    const p = new URLSearchParams();
    if (filter) p.set('status', filter);
    fetch(`/api/payments?${p}`).then(r => r.ok ? r.json() : []).then(d => { setPayments(Array.isArray(d) ? d : d.payments || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { setLoading(true); load(); }, [filter]);

  const confirm = async (id) => {
    try {
      const res = await fetch(`/api/payments/${id}/confirm`, { method: 'PUT' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast('Payment confirmed', 'success'); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const reject = async (id) => {
    const notes = prompt('Rejection reason (optional):');
    try {
      const res = await fetch(`/api/payments/${id}/reject`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: notes || '' }) });
      if (!res.ok) throw new Error('Failed');
      toast('Payment rejected', 'success'); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  if (loading) return <Loading />;

  return (
    <>
      <h3 style={{ marginBottom: 16 }}>Payment Management</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['pending', 'stk_pushed', 'confirmed', 'rejected', 'failed', ''].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>{f || 'All'}</button>
        ))}
      </div>

      {payments.length === 0 ? <Empty text="No payments found." /> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Member</th><th>Type</th><th>Amount</th><th>M-Pesa Code</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id}>
                  <td>{p.member?.fullName || p.memberName || '--'}<br /><small style={{ color: 'var(--gray-500)' }}>{p.member?.regNumber || p.member?.registrationNumber || ''}</small></td>
                  <td><Badge type="info">{p.type || p.paymentType}</Badge></td>
                  <td>KSh {Number(p.amount || 0).toLocaleString('en-KE')}</td>
                  <td><code>{p.mpesaCode || p.mpesaReceiptNumber || p.phoneNumber || p.transactionCode || '--'}</code></td>
                  <td><Badge type={p.status === 'confirmed' ? 'success' : p.status === 'rejected' || p.status === 'failed' ? 'danger' : p.status === 'stk_pushed' ? 'info' : 'warning'}>{p.status}</Badge></td>
                  <td>{fmtDt(p.createdAt)}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {(p.status === 'pending' || p.status === 'stk_pushed') && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => confirm(p._id)} title="Confirm"><i className="fas fa-check"></i></button>
                        <button className="btn btn-danger btn-sm" onClick={() => reject(p._id)} title="Reject"><i className="fas fa-times"></i></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
