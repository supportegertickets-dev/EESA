import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fmt } from '../components/ui';

function usePublicData() {
  const [state, setState] = useState({ loading: true, events: [], projects: [], announcements: [], sponsors: [] });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [events, projects, announcements, sponsors] = await Promise.all([
          fetch('/api/events').then(r => r.json()),
          fetch('/api/projects').then(r => r.json()),
          fetch('/api/announcements').then(r => r.json()),
          fetch('/api/sponsors').then(r => r.json()).catch(() => [])
        ]);
        if (active) setState({ loading: false, events: Array.isArray(events) ? events : [], projects: Array.isArray(projects) ? projects : [], announcements: Array.isArray(announcements) ? announcements : [], sponsors: Array.isArray(sponsors) ? sponsors : [] });
      } catch {
        if (active) setState(p => ({ ...p, loading: false }));
      }
    })();
    return () => { active = false; };
  }, []);
  return state;
}

export default function HomePage() {
  const { loading, events, projects, announcements, sponsors } = usePublicData();
  const [menuOpen, setMenuOpen] = useState(false);
  const up = events.slice(0, 4), fp = projects.slice(0, 4), ln = announcements.slice(0, 4);
  const tiers = useMemo(() => ['platinum','gold','silver','bronze','partner'].map(t => ({ tier: t, items: sponsors.filter(s => (s.tier||'').toLowerCase() === t) })).filter(g => g.items.length > 0), [sponsors]);

  return (
    <div className="react-shell">
      <div className="top-info-bar">
        <div className="container top-bar-content">
          <div className="top-bar-left">
            <span><i className="fas fa-map-marker-alt"></i> Egerton University, Njoro</span>
            <span><i className="fas fa-envelope"></i> eesa@egerton.ac.ke</span>
          </div>
          <div className="top-bar-right"><Link to="/login">Member Login</Link></div>
        </div>
      </div>

      <header className="navbar has-topbar scrolled" id="navbar">
        <div className="container nav-content">
          <Link to="/" className="nav-brand">
            <img src="/images/eesa-logo.svg" alt="EESA" className="nav-logo" />
            <div><span className="brand-title">EESA</span><span className="brand-subtitle">Egerton Engineering Students</span></div>
          </Link>
          <button className="nav-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            <i className={menuOpen ? 'fas fa-times' : 'fas fa-bars'}></i>
          </button>
          <div className={`nav-links${menuOpen ? ' open' : ''}`}>
            <a href="#projects" onClick={() => setMenuOpen(false)}>Projects</a><a href="#news" onClick={() => setMenuOpen(false)}>News</a><a href="#sponsors" onClick={() => setMenuOpen(false)}>Sponsors</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          </div>
          <div className="react-navbar-actions">
            <Link to="/register" className="btn btn-primary">Join EESA</Link>
            <Link to="/login" className="btn btn-outline-light btn-sm">Login</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero" id="home">
        <div className="hero-bg"></div><div className="hero-overlay"></div>
        <div className="container hero-content">
          <div className="hero-badge"><i className="fas fa-shield-alt"></i> Official EESA Student Portal</div>
          <h1 className="hero-title">EESA Digital<br /><span className="text-accent">Experience</span></h1>
          <p className="hero-subtitle">A focused portal for membership, M-Pesa payments, events, announcements, elections, resources, and projects.</p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-accent btn-lg"><i className="fas fa-user-plus"></i> Register</Link>
            <Link to="/login" className="btn btn-outline-light btn-lg"><i className="fas fa-sign-in-alt"></i> Member Login</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><span className="stat-number">{projects.length}</span><span className="stat-label">Projects</span></div>
            <div className="hero-stat"><span className="stat-number">{events.length}</span><span className="stat-label">Events</span></div>
            <div className="hero-stat"><span className="stat-number">{announcements.length}</span><span className="stat-label">Updates</span></div>
            <div className="hero-stat"><span className="stat-number">{sponsors.length}</span><span className="stat-label">Sponsors</span></div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="section" id="projects">
        <div className="container">
          <div className="section-header"><span className="section-tag">Showcase</span><h2>Featured Projects</h2></div>
          <div className="projects-grid react-data-grid">
            {loading ? <div className="react-empty"><i className="fas fa-spinner fa-spin"></i> Loading...</div> : fp.length ? fp.map(p => (
              <div className="project-card" key={p._id}>
                <h3>{p.title}</h3>
                <p>{(p.description || '').slice(0, 160)}</p>
                <div className="project-meta">
                  <span><i className="fas fa-tag"></i> {p.department || p.category || 'General'}</span>
                  <span className={`badge badge-${p.status === 'completed' ? 'success' : p.status === 'in-progress' ? 'info' : 'secondary'}`}>{p.status || 'planning'}</span>
                </div>
              </div>
            )) : <div className="react-empty">No projects yet.</div>}
          </div>
        </div>
      </section>

      {/* News & Events */}
      <section className="section section-alt" id="news">
        <div className="container">
          <div className="section-header"><span className="section-tag">Updates</span><h2>News & Events</h2></div>
          <div className="react-home-grid">
            <div className="react-section-card">
              <h3><i className="fas fa-calendar-alt"></i> Upcoming Events</h3>
              <div className="react-list">
                {up.length ? up.map(e => (
                  <div className="event-mini-card" key={e._id}>
                    <div className="event-mini-icon"><i className="fas fa-calendar-day"></i></div>
                    <div className="event-mini-info"><h4>{e.title}</h4><p>{fmt(e.date)} • {e.location || 'TBA'}</p></div>
                  </div>
                )) : <div className="react-empty">No events.</div>}
              </div>
            </div>
            <div className="react-section-card">
              <h3><i className="fas fa-bullhorn"></i> Announcements</h3>
              <div className="react-list">
                {ln.length ? ln.map(a => (
                  <div className="news-item" key={a._id}>
                    <div className="news-content"><h4>{a.title}</h4><p>{(a.content || '').slice(0, 120)}</p></div>
                  </div>
                )) : <div className="react-empty">No announcements.</div>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsors */}
      <section className="section" id="sponsors">
        <div className="container">
          <div className="section-header"><span className="section-tag">Partners</span><h2>Sponsors & Collaborators</h2></div>
          <div className="react-home-grid">
            {tiers.length ? tiers.map(g => (
              <div className={`sponsors-tier ${g.tier}`} key={g.tier}>
                <h4>{g.tier.charAt(0).toUpperCase() + g.tier.slice(1)} Partners</h4>
                <div className="sponsors-logos">
                  {g.items.map(s => (
                    <div className="sponsor-logo" key={s._id}>{s.logo ? <img src={s.logo} alt={s.name} /> : <i className="fas fa-building"></i>}<span className="sponsor-name">{s.name}</span></div>
                  ))}
                </div>
              </div>
            )) : <div className="react-empty">No sponsors yet.</div>}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="join-cta" id="contact">
        <div className="container">
          <div className="section-header light"><span className="section-tag">Get Started</span><h2>Join the EESA Community</h2><p>Register, pay membership, follow events, and stay updated from one place.</p></div>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-accent btn-lg"><i className="fas fa-user-plus"></i> Create Account</Link>
            <Link to="/login" className="btn btn-outline-light btn-lg"><i className="fas fa-sign-in-alt"></i> Sign In</Link>
          </div>
          <p style={{ marginTop: 12, textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontSize: '.9rem' }}>
            Admin access is available from the login page.
          </p>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-bottom">
          <p>&copy; 2026 EESA — Egerton Engineering Student Association</p>
          <p className="react-footer-note">Egerton University &bull; School of Engineering</p>
        </div>
      </footer>
    </div>
  );
}
