import React, { useState, useEffect } from 'react';
import { Loading, Empty, Badge, Modal, fmt, useToast } from '../../components/ui';

function CandidateAvatar({ candidate, size = 58 }) {
  const src = candidate?.imageUrl || candidate?.member?.profilePhoto;
  const initials = (candidate?.member?.fullName || 'Candidate')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

  if (src) {
    return <img src={src} alt={candidate?.member?.fullName || 'Candidate'} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gray-200)' }} />;
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
  const [selected, setSelected] = useState({});
  const [resultModal, setResultModal] = useState(null);

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

  const selectCandidate = (elId, position, candId) => {
    setSelected(current => ({ ...current, [elId]: { ...(current[elId] || {}), [position]: candId } }));
  };

  const submitVote = async (elId) => {
    const picks = selected[elId];
    if (!picks || Object.keys(picks).length === 0) return toast('Select at least one candidate', 'error');
    if (!window.confirm('Are you sure you want to cast your vote? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/elections/${elId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes: picks })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Vote failed');
      toast('Vote cast successfully!', 'success');
      setSelected(current => ({ ...current, [elId]: {} }));
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const viewResults = async (id) => {
    try {
      const res = await fetch(`/api/elections/${id}/results?_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load results');
      setResultModal(data);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <Loading />;

  const active = elections.filter(e => e.status === 'active' || e.status === 'open');
  const upcoming = elections.filter(e => e.status === 'upcoming');
  const past = elections.filter(e => e.status === 'closed' || e.status === 'completed');

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 4 }}><i className="fas fa-vote-yea" style={{ color: 'var(--primary)' }}></i> Student Elections</h3>
        <p style={{ margin: 0, color: 'var(--gray-500)' }}>Review aspirants professionally, compare manifestos, and cast your vote by position.</p>
      </div>

      <h3 style={{ marginBottom: 16 }}><i className="fas fa-check-circle" style={{ color: 'var(--success)' }}></i> Active Elections</h3>
      {active.length === 0 ? <Empty text="No active elections." /> : active.map(el => (
        <div key={el._id} className="form-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ marginBottom: 4 }}>{el.title}</h4>
              {el.description && <p style={{ fontSize: '.88rem', color: 'var(--gray-600)', margin: 0 }}>{el.description}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge type="success">{el.status}</Badge>
              <Badge>{el.totalVoters || 0} voters</Badge>
            </div>
          </div>

          <p style={{ fontSize: '.82rem', color: 'var(--gray-500)', marginBottom: 12 }}>Ends: {fmt(el.endDate)}</p>

          {(el.positions || []).map(pos => {
            const candidates = (el.candidates || []).filter(candidate => candidate.position === pos);
            return (
              <div key={pos} style={{ marginTop: 16 }}>
                <h5 style={{ color: 'var(--primary)', marginBottom: 8 }}>{pos}</h5>
                {candidates.length === 0 ? <Empty text={`No aspirants yet for ${pos}.`} /> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                    {candidates.map(candidate => {
                      const selectedCandidate = selected[el._id]?.[pos] === candidate._id;
                      return (
                        <label
                          key={candidate._id}
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                            background: selectedCandidate ? '#f9eef1' : 'var(--gray-100)',
                            borderRadius: 'var(--radius-sm)',
                            padding: 12,
                            cursor: el.hasVoted ? 'default' : 'pointer',
                            border: `2px solid ${selectedCandidate ? 'var(--primary)' : 'transparent'}`
                          }}
                        >
                          {!el.hasVoted && (
                            <input
                              type="radio"
                              name={`${el._id}-${pos}`}
                              onChange={() => selectCandidate(el._id, pos, candidate._id)}
                              checked={selectedCandidate}
                            />
                          )}
                          <CandidateAvatar candidate={candidate} />
                          <div style={{ flex: 1 }}>
                            <strong>{candidate.member?.fullName || 'Candidate'}</strong>
                            <div style={{ fontSize: '.78rem', color: 'var(--gray-500)', marginTop: 2 }}>
                              {candidate.member?.department || 'EESA'}{candidate.member?.yearOfStudy ? ` • Year ${candidate.member.yearOfStudy}` : ''}
                            </div>
                            {candidate.manifesto && <p style={{ fontSize: '.82rem', color: 'var(--gray-600)', marginTop: 6 }}>{candidate.manifesto}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {!el.hasVoted && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => submitVote(el._id)}>
              <i className="fas fa-check-double"></i> Cast Vote
            </button>
          )}
          {el.hasVoted && <p style={{ marginTop: 12, color: 'var(--success)', fontWeight: 600 }}><i className="fas fa-check-circle"></i> You have already voted in this election.</p>}
        </div>
      ))}

      <h3 style={{ marginTop: 28, marginBottom: 16 }}><i className="fas fa-hourglass-half" style={{ color: 'var(--warning)' }}></i> Upcoming Elections</h3>
      {upcoming.length === 0 ? <Empty text="No upcoming elections." /> : upcoming.map(el => (
        <div key={el._id} className="form-card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ marginBottom: 4 }}>{el.title}</h4>
              <small style={{ color: 'var(--gray-500)' }}>{fmt(el.startDate)} — {fmt(el.endDate)}</small>
            </div>
            <Badge type="warning">upcoming</Badge>
          </div>
        </div>
      ))}

      <h3 style={{ marginTop: 32, marginBottom: 16 }}><i className="fas fa-history" style={{ color: 'var(--gray-500)' }}></i> Past Elections</h3>
      {past.length === 0 ? <Empty text="No past elections." /> : past.map(el => (
        <div key={el._id} className="form-card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h4>{el.title}</h4>
            <small style={{ color: 'var(--gray-500)' }}>{fmt(el.startDate)} — {fmt(el.endDate)}</small>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => viewResults(el._id)}><i className="fas fa-chart-bar"></i> Results</button>
        </div>
      ))}

      <Modal open={!!resultModal} onClose={() => setResultModal(null)} title="Election Results" large>
        {resultModal && (
          <div>
            <h4 style={{ marginBottom: 8 }}>{resultModal.title}</h4>
            <p style={{ fontSize: '.86rem', color: 'var(--gray-500)', marginTop: 0, marginBottom: 16 }}>Total voters: {resultModal.totalVoters || 0}</p>

            {(resultModal.positions || Object.keys(resultModal.results || {})).map(pos => {
              const entries = (resultModal.results?.[pos]) || (resultModal.candidates || []).filter(candidate => candidate.position === pos);
              const maxVotes = Math.max(...entries.map(entry => entry.votes || 0), 1);

              return (
                <div key={pos} style={{ marginBottom: 20 }}>
                  <h5 style={{ color: 'var(--primary)' }}>{pos}</h5>
                  {entries.map((candidate, index) => (
                    <div key={candidate._id || `${pos}-${index}`} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-200)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ minWidth: 24, fontWeight: 700, color: index === 0 ? 'var(--accent)' : 'var(--gray-600)' }}>{index + 1}.</span>
                        <CandidateAvatar candidate={candidate} size={46} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{candidate.member?.fullName || candidate.name || 'Candidate'}</div>
                          <div style={{ fontSize: '.8rem', color: 'var(--gray-500)' }}>{candidate.votes || 0} votes</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, height: 8, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: candidate.votes ? `${Math.max(((candidate.votes || 0) / maxVotes) * 100, 6)}%` : '0%', height: '100%', background: index === 0 ? 'var(--primary)' : 'var(--accent)' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
}
