/* ================================================================
   EESA — Unified Dashboard Orchestrator
   Handles multi-role login and dynamically loads role-specific UI
   from existing portal/admin/lecturer pages.
   ================================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; };
  const fmtDate = d => new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });

  function showToast(msg, type) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + (type || 'info') + ' show';
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  let currentRole = null;
  let currentUser = null;

  /* ── Role Configuration ──────────────────────────────────── */
  const ROLES = {
    member: {
      loginUrl: '/api/auth/member/login',
      checkUrl: '/api/auth/member/me',
      logoutUrl: '/api/auth/member/logout',
      pageUrl: '/legacy/portal',
      jsUrl: '/js/portal.js',
      brand: 'EESA Member Portal',
      icon: 'fas fa-user-circle',
      getPayload: () => ({ email: $('mLoginEmail').value, password: $('mLoginPass').value }),
      getUser: data => {
        const m = data.member || data;
        return { name: m.fullName, badge: m.status, badgeClass: m.status === 'active' ? 'success' : 'warning' };
      },
      skipSections: [],
      showNotifs: true
    },
    admin: {
      loginUrl: '/api/auth/admin/login',
      checkUrl: '/api/auth/admin/me',
      logoutUrl: '/api/auth/admin/logout',
      pageUrl: '/legacy/admin',
      jsUrl: '/js/admin.js',
      brand: 'EESA Admin Panel',
      icon: 'fas fa-user-shield',
      getPayload: () => ({ username: $('aLoginUser').value, password: $('aLoginPass').value }),
      getUser: data => {
        const a = data.admin || data;
        return { name: a.fullName || a.username || 'Admin', badge: a.role || 'admin', badgeClass: 'admin' };
      },
      skipSections: [],
      showNotifs: false
    },
    lecturer: {
      loginUrl: '/api/auth/lecturer/login',
      checkUrl: '/api/auth/lecturer/me',
      logoutUrl: '/api/auth/lecturer/logout',
      pageUrl: '/legacy/lecturer',
      jsUrl: '/js/lecturer.js',
      brand: 'Lecturer Portal',
      icon: 'fas fa-chalkboard-teacher',
      getPayload: () => ({ email: $('lLoginEmail').value, password: $('lLoginPass').value }),
      getUser: data => {
        const l = data.lecturer || data;
        return { name: (l.title || '') + ' ' + (l.fullName || ''), badge: 'Active', badgeClass: 'success' };
      },
      skipSections: ['sec-login'],
      showNotifs: false
    },
    sponsor: {
      loginUrl: '/api/sponsors/auth/login',
      checkUrl: '/api/sponsors/auth/me',
      logoutUrl: '/api/sponsors/auth/logout',
      pageUrl: null,
      jsUrl: null,
      brand: 'Sponsor Portal',
      icon: 'fas fa-handshake',
      getPayload: () => ({ email: $('sLoginEmail').value, password: $('sLoginPass').value }),
      getUser: data => {
        const s = data.sponsor || data;
        return { name: s.name || 'Sponsor', badge: s.tier || 'partner', badgeClass: 'accent' };
      },
      skipSections: [],
      showNotifs: false
    }
  };

  /* ── Login Tab Switching ─────────────────────────────────── */
  window.switchLoginTab = function (role) {
    document.querySelectorAll('.login-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.role === role);
    });
    document.querySelectorAll('.login-role-form').forEach(f => f.classList.remove('active'));
    const form = $('form-' + role);
    if (form) form.classList.add('active');
    $('loginError').textContent = '';
  };

  /* ── Handle Login ────────────────────────────────────────── */
  window.handleLogin = async function (e, role) {
    e.preventDefault();
    const config = ROLES[role];
    if (!config) return;
    $('loginError').textContent = '';
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...'; }
    try {
      const res = await fetch(config.loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.getPayload())
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
      currentRole = role;
      currentUser = data;
      await loadRoleUI(role);
    } catch (err) {
      $('loginError').textContent = err.message;
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'; }
    }
  };

  /* ── Load Role UI ────────────────────────────────────────── */
  async function loadRoleUI(role) {
    const config = ROLES[role];
    const user = config.getUser(currentUser);

    // Update shell elements
    $('brandTitle').textContent = config.brand;
    const un = $('userName'); if (un) un.textContent = (user.name || '').trim();
    const ub = $('userBadge'); if (ub) { ub.textContent = user.badge; ub.className = 'user-badge badge-' + user.badgeClass; }
    const ua = $('userAvatarIcon'); if (ua) ua.className = config.icon;
    const tg = $('topbarGreeting'); if (tg) tg.textContent = 'Welcome, ' + ((user.name || '').trim().split(' ')[0] || '') + '!';

    // Show/hide notification bell
    const nb = $('notifBellWrap'); if (nb) nb.style.display = config.showNotifs ? '' : 'none';

    // Hide login, show dashboard shell
    $('loginScreen').style.display = 'none';
    $('dashboardShell').style.display = '';

    // Sponsor is handled entirely inline (no existing page)
    if (role === 'sponsor') {
      loadSponsorUI();
      return;
    }

    // Fetch the role's existing HTML page and extract nav + sections
    if (config.pageUrl) {
      try {
        const res = await fetch(config.pageUrl);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Extract sidebar nav items
        const srcNav = doc.querySelector('.sidebar-nav');
        if (srcNav) {
          $('sidebarNav').innerHTML = srcNav.innerHTML;
        }

        // Extract content sections (skip login sections, etc.)
        const container = $('sectionContainer');
        container.innerHTML = '';
        const skipSet = new Set(config.skipSections);
        let firstSection = true;
        doc.querySelectorAll('.content-section').forEach(sec => {
          if (skipSet.has(sec.id)) return;
          const imported = document.importNode(sec, true);
          // Make the first non-skipped section active
          if (firstSection) {
            imported.classList.add('active');
            firstSection = false;
          }
          container.appendChild(imported);
        });

        // For admin.js compatibility: ensure adminDashboard wrapper exists
        if (role === 'admin' && !$('adminDashboard')) {
          const w = document.createElement('div');
          w.id = 'adminDashboard';
          w.style.display = 'flex';
          document.body.appendChild(w);
        }
      } catch (err) {
        console.error('Failed to load role UI:', err);
        showToast('Failed to load portal content', 'error');
        return;
      }
    }

    // Load the role's JS file dynamically
    if (config.jsUrl) {
      window.__DASHBOARD_MODE = true;
      await loadScript(config.jsUrl);
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => { showToast('Failed to load script', 'error'); reject(); };
      document.body.appendChild(script);
    });
  }

  /* ────────────────────────────────────────────────────────────
     SPONSOR DASHBOARD (inline — no existing page)
     ──────────────────────────────────────────────────────────── */
  function loadSponsorUI() {
    // Build sidebar
    $('sidebarNav').innerHTML = `
      <a href="#" class="nav-item active" data-section="sp-dashboard" onclick="showSponsorSection('sp-dashboard')">
        <i class="fas fa-tachometer-alt"></i><span>Dashboard</span>
      </a>
      <a href="#" class="nav-item" data-section="sp-events" onclick="showSponsorSection('sp-events')">
        <i class="fas fa-calendar-alt"></i><span>Sponsored Events</span>
      </a>
      <a href="#" class="nav-item" data-section="sp-metrics" onclick="showSponsorSection('sp-metrics')">
        <i class="fas fa-chart-line"></i><span>ROI & Metrics</span>
      </a>
    `;

    // Build sections
    const container = $('sectionContainer');
    container.innerHTML = `
      <!-- Sponsor Dashboard Overview -->
      <section class="content-section active" id="sec-sp-dashboard">
        <div class="section-intro">
          <h3><i class="fas fa-handshake"></i> Sponsor Dashboard</h3>
          <p>Track your sponsorship impact, event reach, and ROI metrics.</p>
        </div>
        <div class="stats-row" id="sponsorStatsRow">
          <div class="stat-box">
            <div class="stat-box-icon bg-primary"><i class="fas fa-users"></i></div>
            <div><div class="stat-box-val" id="spTotalMembers">0</div><div class="stat-box-label">Total Members Reached</div></div>
          </div>
          <div class="stat-box">
            <div class="stat-box-icon bg-accent"><i class="fas fa-calendar"></i></div>
            <div><div class="stat-box-val" id="spEvents">0</div><div class="stat-box-label">Sponsored Events</div></div>
          </div>
          <div class="stat-box">
            <div class="stat-box-icon bg-success"><i class="fas fa-eye"></i></div>
            <div><div class="stat-box-val" id="spImpressions">0</div><div class="stat-box-label">Logo Impressions</div></div>
          </div>
          <div class="stat-box">
            <div class="stat-box-icon bg-info"><i class="fas fa-chart-line"></i></div>
            <div><div class="stat-box-val" id="spROI">—</div><div class="stat-box-label">ROI Score</div></div>
          </div>
        </div>
        <div class="portal-card" id="sponsorInfoCard">
          <h4><i class="fas fa-info-circle"></i> Sponsorship Details</h4>
          <div id="sponsorDetails" class="profile-details">
            <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
          </div>
        </div>
      </section>

      <!-- Sponsored Events -->
      <section class="content-section" id="sec-sp-events">
        <div class="section-intro"><h3><i class="fas fa-calendar-alt"></i> Sponsored Events</h3><p>Events associated with your sponsorship.</p></div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Event</th><th>Date</th><th>Location</th><th>Attendees</th><th>Status</th></tr></thead>
            <tbody id="sponsorEventsTable">
              <tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ROI & Metrics -->
      <section class="content-section" id="sec-sp-metrics">
        <div class="section-intro"><h3><i class="fas fa-chart-line"></i> ROI & Metrics</h3><p>Detailed breakdown of your sponsorship impact.</p></div>
        <div class="dashboard-panels" id="sponsorMetricsPanel">
          <div class="portal-card">
            <h4><i class="fas fa-bullseye"></i> Estimated Reach</h4>
            <p id="spReachInfo" class="text-muted">Loading...</p>
          </div>
          <div class="portal-card">
            <h4><i class="fas fa-coins"></i> Value Summary</h4>
            <div id="spValueInfo" class="text-muted">Loading...</div>
          </div>
        </div>
      </section>
    `;

    $('pageTitle').textContent = 'Sponsor Dashboard';
    loadSponsorData();
  }

  async function loadSponsorData() {
    try {
      const res = await fetch('/api/sponsors/dashboard');
      if (!res.ok) throw new Error('Failed to fetch sponsor data');
      const data = await res.json();

      // Stats row
      const m = data.metrics || {};
      const sp = $('spTotalMembers'); if (sp) sp.textContent = m.totalMembers || 0;
      const se = $('spEvents'); if (se) se.textContent = m.sponsoredEvents || 0;
      const si = $('spImpressions'); if (si) si.textContent = m.impressions || 0;
      const sr = $('spROI'); if (sr) sr.textContent = (m.roi || 0) + '%';

      // Sponsor details
      const s = data.sponsor || {};
      const det = $('sponsorDetails');
      if (det) {
        det.innerHTML = `
          <div class="ms-details">
            <div class="ms-item"><label>Company</label><span>${esc(s.name)}</span></div>
            <div class="ms-item"><label>Tier</label><span class="badge badge-accent">${esc(s.tier || '-')}</span></div>
            <div class="ms-item"><label>Contact</label><span>${esc(s.contactPerson || '-')}</span></div>
            <div class="ms-item"><label>Email</label><span>${esc(s.email || '-')}</span></div>
            <div class="ms-item"><label>Amount</label><span>KSh ${(s.amount || 0).toLocaleString()}</span></div>
            <div class="ms-item"><label>Since</label><span>${s.startDate ? fmtDate(s.startDate) : '-'}</span></div>
            ${s.website ? `<div class="ms-item"><label>Website</label><span><a href="${esc(s.website)}" target="_blank" rel="noopener">${esc(s.website)}</a></span></div>` : ''}
          </div>
        `;
      }

      // Events table
      const tbody = $('sponsorEventsTable');
      if (tbody) {
        const evts = data.events || [];
        if (evts.length) {
          tbody.innerHTML = evts.map(e => `<tr>
            <td>${esc(e.title)}</td>
            <td>${fmtDate(e.date)}</td>
            <td>${esc(e.location || '-')}</td>
            <td>${e.attendees || 0}</td>
            <td><span class="badge badge-${e.status === 'completed' ? 'success' : 'info'}">${esc(e.status || 'upcoming')}</span></td>
          </tr>`).join('');
        } else {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No sponsored events yet</td></tr>';
        }
      }

      // Metrics
      const ri = $('spReachInfo');
      if (ri) ri.innerHTML = `Your <strong>${esc(s.tier || 'partner')}</strong> tier sponsorship reaches an estimated <strong>${(m.estimatedReach || 0).toLocaleString()}</strong> people through events and platform visibility.`;

      const vi = $('spValueInfo');
      if (vi) vi.innerHTML = `
        <div class="ms-details">
          <div class="ms-item"><label>Sponsored Events</label><span>${m.sponsoredEvents || 0}</span></div>
          <div class="ms-item"><label>Total Attendees</label><span>${m.totalAttendees || 0}</span></div>
          <div class="ms-item"><label>Platform Impressions</label><span>${m.impressions || 0}</span></div>
          <div class="ms-item"><label>Investment</label><span>KSh ${(s.amount || 0).toLocaleString()}</span></div>
          <div class="ms-item"><label>ROI Score</label><span class="badge badge-success">${m.roi || 0}%</span></div>
        </div>
      `;
    } catch (err) {
      console.error('Sponsor data error:', err);
      showToast('Failed to load sponsor data', 'error');
    }
  }

  window.showSponsorSection = function (section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
    const sec = $('sec-' + section);
    if (sec) sec.classList.add('active');
    const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (nav) nav.classList.add('active');
    const titles = { 'sp-dashboard': 'Sponsor Dashboard', 'sp-events': 'Sponsored Events', 'sp-metrics': 'ROI & Metrics' };
    $('pageTitle').textContent = titles[section] || 'Dashboard';
  };

  /* ── Logout ──────────────────────────────────────────────── */
  window.handleLogout = async function () {
    if (!currentRole) { window.location.href = '/'; return; }
    const config = ROLES[currentRole];
    try { await fetch(config.logoutUrl, { method: 'POST' }); } catch { /* ignore */ }
    // Refresh to clean state
    window.location.href = '/dashboard';
  };

  /* ── Sidebar Toggle ──────────────────────────────────────── */
  window.toggleSidebar = function () {
    const sb = $('sidebar');
    if (sb) sb.classList.toggle('open');
  };

  /* ── Dark Mode ───────────────────────────────────────────── */
  window.toggleDarkMode = function () {
    document.body.classList.toggle('dark-mode');
    const icon = $('darkModeIcon');
    if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('eesa-dark-mode', document.body.classList.contains('dark-mode'));
  };

  // Restore dark mode preference
  if (localStorage.getItem('eesa-dark-mode') === 'true') {
    document.body.classList.add('dark-mode');
    const icon = $('darkModeIcon');
    if (icon) icon.className = 'fas fa-sun';
  }

  /* ── Notification helpers (overridden by portal.js if member) ── */
  window.toggleNotifications = function () {
    const dd = $('notifDropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  };
  window.markAllNotificationsRead = async function () {
    try { await fetch('/api/notifications/read-all', { method: 'PUT' }); } catch { /* ignore */ }
    const badge = $('notifBadge');
    if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
  };

  /* ── Auto-detect existing session on page load ───────────── */
  async function autoDetectSession() {
    const order = ['member', 'admin', 'lecturer', 'sponsor'];
    for (const role of order) {
      const config = ROLES[role];
      try {
        const res = await fetch(config.checkUrl);
        if (res.ok) {
          currentRole = role;
          currentUser = await res.json();
          await loadRoleUI(role);
          return;
        }
      } catch { /* next */ }
    }
    // No active session — show login screen
    $('loginScreen').style.display = '';
    $('dashboardShell').style.display = 'none';
  }

  autoDetectSession();

})();
