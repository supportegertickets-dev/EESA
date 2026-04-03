import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loading, Badge, fmt, useToast } from '../../components/ui';

export default function Membership() {
  const { user, checkSession } = useAuth();
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regCode, setRegCode] = useState('');
  const [renCode, setRenCode] = useState('');
  const [stkPhone, setStkPhone] = useState('');
  const [stkType, setStkType] = useState('registration');
  const [stkSubmitting, setStkSubmitting] = useState(false);
  const [stkPayment, setStkPayment] = useState(null);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/mine');
      const data = res.ok ? await res.json() : [];
      setPayments(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    setStkType(user?.registrationPaid ? 'renewal' : 'registration');
  }, [user?.registrationPaid]);

  const startStkPush = async (e) => {
    e.preventDefault();
    if (!stkPhone.trim()) return toast('Enter your Safaricom phone number', 'error');
    setStkSubmitting(true);
    try {
      const res = await fetch('/api/payments/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: stkType, phone: stkPhone.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'M-Pesa request failed');
      setStkPayment({ _id: data.payment?._id, type: stkType, status: 'stk_pushed' });
      toast(data.message || 'STK push sent. Check your phone.', 'success');
      setTimeout(() => loadPayments(), 1200);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setStkSubmitting(false);
    }
  };

  const checkStkStatus = async () => {
    if (!stkPayment?._id) return;
    try {
      const res = await fetch(`/api/payments/mpesa/status/${stkPayment._id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not check payment status');
      if (data.status === 'confirmed') {
        toast('Payment confirmed successfully.', 'success');
        setStkPayment(null);
        await loadPayments();
        await checkSession();
      } else if (data.status === 'failed' || data.status === 'rejected') {
        toast(data.resultDesc || 'Payment was not completed. You can use the manual option below.', 'error');
      } else {
        toast('Still waiting for M-Pesa confirmation. Complete the prompt on your phone or use manual confirmation below.', 'info');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const submitPayment = async (e, type) => {
    e.preventDefault();
    const code = type === 'registration' ? regCode : renCode;
    if (!code.trim()) return toast('Enter M-Pesa code', 'error');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, mpesaCode: code.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast('Payment submitted! Awaiting admin confirmation.', 'success');
      if (type === 'registration') setRegCode(''); else setRenCode('');
      setPayments(p => [data.payment || data, ...p]);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (!user) return <Loading />;

  return (
    <>
      <div className="form-card">
        <h4><i className="fas fa-id-card"></i> Membership Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '.9rem' }}>
          <div><strong>Reg #:</strong> {user.regNumber || user.registrationNumber || '--'}</div>
          <div><strong>Department:</strong> {user.department || '--'}</div>
          <div><strong>Year:</strong> {user.yearOfStudy || '--'}</div>
          <div><strong>Status:</strong> <Badge type={user.status === 'active' ? 'success' : 'warning'}>{user.status}</Badge></div>
          <div><strong>Verified:</strong> {user.isVerified ? <Badge type="success">Yes</Badge> : <Badge type="warning">No</Badge>}</div>
          <div><strong>Reg Fee:</strong> {user.registrationPaid ? <Badge type="success">Paid</Badge> : <Badge type="danger">Unpaid</Badge>}</div>
          <div><strong>Semester:</strong> {user.currentSemester || 'Unpaid'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 20 }}>
        <div className="form-card">
          <h4><i className="fas fa-mobile-alt"></i> Pay Directly with M-Pesa</h4>
          <p style={{ fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: 12 }}>
            Enter your Safaricom number and you will receive an M-Pesa prompt on your phone. If that does not work, use the manual confirmation forms beside it.
          </p>
          <form onSubmit={startStkPush}>
            <div className="form-group">
              <label>Payment Type</label>
              <select value={stkType} onChange={e => setStkType(e.target.value)}>
                {!user.registrationPaid && <option value="registration">Registration Fee — KSh 100</option>}
                <option value="renewal">Semester Renewal — KSh 50</option>
              </select>
            </div>
            <div className="form-group">
              <label>Safaricom Phone Number</label>
              <input value={stkPhone} onChange={e => setStkPhone(e.target.value)} placeholder="0712345678" required />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="submit" disabled={stkSubmitting}>
                <i className="fas fa-bolt"></i> {stkSubmitting ? 'Sending prompt...' : 'Pay via M-Pesa'}
              </button>
              {stkPayment?._id && (
                <button className="btn btn-outline" type="button" onClick={checkStkStatus}>
                  <i className="fas fa-sync-alt"></i> Check Status
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="form-card">
          <h4><i className="fas fa-receipt"></i> Manual Payment Confirmation</h4>
          <p style={{ fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: 12 }}>
            Already paid through M-Pesa? Enter the transaction code here and the admin will confirm it manually.
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            {!user.registrationPaid && (
              <form onSubmit={e => submitPayment(e, 'registration')}>
                <div className="form-group"><label>Registration Fee Code</label><input value={regCode} onChange={e => setRegCode(e.target.value)} placeholder="e.g. SJ12ABC456" required /></div>
                <button className="btn btn-secondary btn-block"><i className="fas fa-paper-plane"></i> Submit Registration Payment</button>
              </form>
            )}
            <form onSubmit={e => submitPayment(e, 'renewal')}>
              <div className="form-group"><label>Semester Renewal Code</label><input value={renCode} onChange={e => setRenCode(e.target.value)} placeholder="e.g. SJ12ABC456" required /></div>
              <button className="btn btn-secondary btn-block"><i className="fas fa-paper-plane"></i> Submit Renewal Payment</button>
            </form>
          </div>
        </div>
      </div>

      <div className="form-card" style={{ marginTop: 20 }}>
        <h4><i className="fas fa-history"></i> Payment History</h4>
        {loading ? <Loading /> : payments.length === 0 ? <p style={{ color: 'var(--gray-500)' }}>No payments yet.</p> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Reference</th><th>Status</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p._id}>
                    <td>{fmt(p.createdAt)}</td>
                    <td><Badge type="primary">{p.type}</Badge></td>
                    <td>KSh {p.amount}</td>
                    <td><code>{p.mpesaCode || p.mpesaReceiptNumber || p.phoneNumber || '--'}</code></td>
                    <td><Badge type={p.status === 'confirmed' ? 'success' : p.status === 'rejected' || p.status === 'failed' ? 'danger' : p.status === 'stk_pushed' ? 'info' : 'warning'}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
