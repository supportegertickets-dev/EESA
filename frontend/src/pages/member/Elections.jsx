import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, Modal, fmt, useToast } from '../../components/ui';

export default function Elections() {
  const toast = useToast();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({}); // { electionId: { position: candidateId } }
  const [resultModal, setResultModal] = useState(null);

  const load = () => {
    fetch('/api/elections').then(r => r.ok ? r.json() : []).then(d => { setElections(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const selectCandidate = (elId, position, candId) => {
    setSelected(s => ({ ...s, [elId]: { ...(s[elId] || {}), [position]: candId } }));
  };

  const submitVote = async (elId) => {
    const picks = selected[elId];
    if (!picks || Object.keys(picks).length === 0) return toast('Select at least one candidate', 'error');
    if (!window.confirm('Are you sure you want to cast your vote? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/elections/${elId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ votes: picks }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vote failed');
      toast('Vote cast successfully!', 'success');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const viewResults = async (id) => {
    try {
      const res = await fetch(`/api/elections/${id}/results`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load results');
      setResultModal(data);
    } catch (err) { toast(err.message, 'error'); }
  };

  if (loading) return <Loading />;

  const active = elections.filter(e => e.status === 'active' || e.status === 'open');
  const past = elections.filter(e => e.status === 'closed' || e.status === 'completed');

  return (
    <>
      {/* Active elections */}
      <h3 style={{ marginBottom: 16 }}><i className="fas fa-check-circle" style={{ color: 'var(--success)' }}></i> Active Elections</h3>
      {active.length === 0 ? <Empty text="No active elections." /> : active.map(el => (
        <div key={el._id} className="form-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4>{el.title}</h4>
            <Badge type="success">{el.status}</Badge>
          </div>
          {el.description && <p style={{ fontSize: '.88rem', color: 'var(--gray-600)', marginBottom: 12 }}>{el.description}</p>}
          <p style={{ fontSize: '.82rem', color: 'var(--gray-500)' }}>Ends: {fmt(el.endDate)}</p>

          {(el.positions || []).map(pos => (
            <div key={pos} style={{ marginTop: 16 }}>
              <h5 style={{ color: 'var(--primary)', marginBottom: 8 }}>{pos}</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {(el.candidates || []).filter(c => c.position === pos).map(c => (
                  <label key={c._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: selected[el._id]?.[pos] === c._id ? '#e8d4db' : 'var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: 12, cursor: el.hasVoted ? 'default' : 'pointer', border: '2px solid ' + (selected[el._id]?.[pos] === c._id ? 'var(--primary)' : 'transparent') }}>
                    {!el.hasVoted && <input type="radio" name={`${el._id}-${pos}`} onChange={() => selectCandidate(el._id, pos, c._id)} checked={selected[el._id]?.[pos] === c._id} />}
                    <div>
                      <strong>{c.member?.fullName || c.name || 'Candidate'}</strong>
                      {c.manifesto && <p style={{ fontSize: '.82rem', color: 'var(--gray-600)', marginTop: 4 }}>{c.manifesto.slice(0, 100)}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {!el.hasVoted && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => submitVote(el._id)}>
              <i className="fas fa-check-double"></i> Cast Vote
            </button>
          )}
          {el.hasVoted && <p style={{ marginTop: 12, color: 'var(--success)', fontWeight: 600 }}><i className="fas fa-check-circle"></i> You have already voted</p>}
        </div>
      ))}

      {/* Past elections */}
      <h3 style={{ marginTop: 32, marginBottom: 16 }}><i className="fas fa-history" style={{ color: 'var(--gray-500)' }}></i> Past Elections</h3>
      {past.length === 0 ? <Empty text="No past elections." /> : past.map(el => (
        <div key={el._id} className="form-card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4>{el.title}</h4>
            <small style={{ color: 'var(--gray-500)' }}>{fmt(el.startDate)} — {fmt(el.endDate)}</small>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => viewResults(el._id)}><i className="fas fa-chart-bar"></i> Results</button>
        </div>
      ))}

      {/* Results modal */}
      <Modal open={!!resultModal} onClose={() => setResultModal(null)} title="Election Results" large>
        {resultModal && (
          <div>
            <h4 style={{ marginBottom: 16 }}>{resultModal.title}</h4>
            {(resultModal.positions || Object.keys(resultModal.results || {})).map(pos => (
              <div key={pos} style={{ marginBottom: 20 }}>
                <h5 style={{ color: 'var(--primary)' }}>{pos}</h5>
                {((resultModal.results?.[pos]) || (resultModal.candidates || []).filter(c => c.position === pos)).map((c, i) => (
                  <div key={c._id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--gray-200)' }}>
                    <span style={{ minWidth: 24, fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--gray-600)' }}>{i + 1}.</span>
                    <span style={{ flex: 1 }}>{c.member?.fullName || c.name || 'Candidate'}</span>
                    <span style={{ fontWeight: 600 }}>{c.votes || 0} votes</span>
                  </div>
                ))}
              </div>
            ))}
            <p style={{ fontSize: '.85rem', color: 'var(--gray-500)', marginTop: 12 }}>Total voters: {resultModal.totalVoters || '--'}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
