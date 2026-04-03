/* ============================================================
   EESA — Member Portal JavaScript
   ============================================================ */
(function () {
  'use strict';

  /* --- Helpers --- */
  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function $(id) { return document.getElementById(id); }
  function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function fmtDateTime(d) { return new Date(d).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

  function showToast(msg, type) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + (type || 'info') + ' show';
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  let member = null;
  let _searchTimer = null;

  /* --- Auth Check --- */
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/member/me');
      if (!res.ok) { if (!window.__DASHBOARD_MODE) window.location.href = '/'; return; }
      member = await res.json();
      initPortal();
    } catch { if (!window.__DASHBOARD_MODE) window.location.href = '/'; }
  }
  checkAuth();

  /* --- Init Portal --- */
  function initPortal() {
    if (!member) return;
    const un = $('userName');
    const ub = $('userBadge');
    const tg = $('topbarGreeting');
    if (un) un.textContent = member.fullName || 'Member';
    if (ub) { ub.textContent = member.status; ub.className = 'user-badge badge-' + (member.status === 'active' ? 'success' : 'warning'); }
    if (tg) tg.textContent = 'Welcome, ' + (member.fullName || '').split(' ')[0] + '!';
    loadDashboard();
    checkExecStatus();
    loadNotifications();
    setInterval(loadNotifications, 60000); // Poll notifications every minute
  }

  /* --- Sidebar Navigation --- */
  window.showSection = function (section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
    const sec = $('sec-' + section);
    if (sec) sec.classList.add('active');
    const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (nav) nav.classList.add('active');
    const pt = $('pageTitle');
    const titles = { overview: 'Dashboard', membership: 'Membership & Payments', resources: 'Resource Library', elections: 'Elections', attendance: 'Attendance', events: 'Events', announcements: 'Announcements', clubs: 'Clubs & Societies', units: 'My Units & Coursework', 'exec-comms': 'Executive Board', forum: 'Discussion Forum', polls: 'Polls & Surveys', directory: 'Member Directory', profile: 'My Profile' };
    if (pt) pt.textContent = titles[section] || section;
    /* Load data for section */
    const loaders = { overview: loadDashboard, membership: loadMembership, resources: loadResources, elections: loadElections, attendance: loadAttendance, events: loadPortalEvents, announcements: loadPortalAnnouncements, clubs: loadClubs, units: loadUnits, 'exec-comms': loadExecComms, forum: loadForumTopics, polls: loadPolls, directory: loadDirectory, profile: loadProfile };
    if (loaders[section]) loaders[section]();
    /* Close mobile sidebar */
    const sb = $('sidebar');
    if (sb) sb.classList.remove('open');
  };

  window.toggleSidebar = function () {
    const sb = $('sidebar');
    if (sb) sb.classList.toggle('open');
  };

  /* --- Logout --- */
  window.logout = async function () {
    await fetch('/api/auth/member/logout', { method: 'POST' });
    window.location.href = '/';
  };

  /* ===========================================================
     DASHBOARD
     =========================================================== */
  async function loadDashboard() {
    if (!member) return;
    const ds = $('dashStatus');
    const drf = $('dashRegFee');
    const dsem = $('dashSemester');
    const da = $('dashAttendance');

    if (ds) ds.textContent = member.status;
    if (drf) drf.textContent = member.registrationPaid ? 'Paid' : 'Unpaid';
    if (dsem) dsem.textContent = member.currentSemester || 'Unpaid';

    /* Status banner */
    const banner = $('statusBanner');
    const stxt = $('statusText');
    if (banner && stxt) {
      if (member.status === 'active' && member.isVerified) {
        banner.className = 'status-banner status-good';
        stxt.innerHTML = '<strong>Your account is active and verified.</strong> You have full access to all portal features.';
      } else if (member.status === 'pending') {
        banner.className = 'status-banner status-warn';
        stxt.innerHTML = '<strong>Membership pending.</strong> Please pay your registration fee and wait for admin verification.';
      } else {
        banner.className = 'status-banner status-info';
        stxt.innerHTML = `Account status: <strong>${member.status}</strong>. Contact admin if you need assistance.`;
      }
    }

    /* Attendance count */
    try {
      const attRes = await fetch('/api/attendance/mine');
      if (attRes.ok) {
        const att = await attRes.json();
        if (da) da.textContent = att.length;
      }
    } catch { if (da) da.textContent = '0'; }

    /* Recent announcements */
    try {
      const annRes = await fetch('/api/announcements');
      if (annRes.ok) {
        const anns = await annRes.json();
        const feed = $('dashAnnouncements');
        if (feed) {
          if (!anns.length) { feed.innerHTML = '<p class="text-muted">No announcements yet.</p>'; return; }
          feed.innerHTML = anns.slice(0, 3).map(a => `<div class="announcement-item ${a.isPinned ? 'pinned' : ''} ${a.priority === 'urgent' ? 'urgent' : ''}">
            <h4>${a.isPinned ? '<i class="fas fa-thumbtack" style="color:var(--accent)"></i> ' : ''}${esc(a.title)}</h4>
            <p>${esc((a.content || '').slice(0, 150))}</p>
            <div class="ann-meta"><i class="fas fa-clock"></i> ${fmtDate(a.createdAt)}</div>
          </div>`).join('');
        }
      }
    } catch { /* ignore */ }
  }

  /* ===========================================================
     MEMBERSHIP & PAYMENTS
     =========================================================== */
  async function loadMembership() {
    if (!member) return;
    /* Status card fields */
    const fields = { msRegNo: member.regNumber, msDept: member.department, msYear: 'Year ' + member.yearOfStudy, msVerified: member.isVerified ? 'Yes' : 'No', msRegFee: member.registrationPaid ? 'Paid' : 'Not Paid', msSemester: member.currentSemester || 'Not Paid' };
    Object.entries(fields).forEach(([id, val]) => { const el = $(id); if (el) el.textContent = val; });
    const mb = $('memberBadge');
    if (mb) { mb.textContent = member.status; mb.className = 'badge badge-' + (member.status === 'active' ? 'success' : 'warning'); }

    /* Payment history */
    try {
      const res = await fetch('/api/payments/mine');
      if (res.ok) {
        const payments = await res.json();
        const tbody = $('paymentHistory');
        if (!tbody) return;
        if (!payments.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No payments yet</td></tr>'; return; }
        tbody.innerHTML = payments.map(p => `<tr>
          <td>${fmtDate(p.createdAt)}</td>
          <td>${esc(p.type)}</td>
          <td>KSh ${p.amount}</td>
          <td><code>${esc(p.mpesaCode)}</code></td>
          <td><span class="badge badge-${p.status === 'confirmed' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}">${p.status}</span></td>
        </tr>`).join('');
      }
    } catch { /* ignore */ }
  }

  window.submitPayment = async function (e, type) {
    e.preventDefault();
    const form = e.target;
    const code = form.mpesaCode.value.trim();
    if (!code) return;
    try {
      const res = await fetch('/api/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, mpesaCode: code, amount: type === 'registration' ? 100 : 50 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      showToast('Payment submitted! Awaiting admin confirmation.', 'success');
      form.reset();
      loadMembership();
    } catch (err) { showToast(err.message, 'error'); }
  };

  /* ===========================================================
     RESOURCE LIBRARY
     =========================================================== */
  async function loadResources() {
    const grid = $('resourceGrid');
    if (!grid) return;
    const cat = ($('resourceCategoryFilter') || {}).value || '';
    const dept = ($('resourceDeptFilter') || {}).value || '';
    const search = ($('resourceSearch') || {}).value || '';
    let url = '/api/resources?';
    if (cat) url += 'category=' + encodeURIComponent(cat) + '&';
    if (dept) url += 'department=' + encodeURIComponent(dept) + '&';
    if (search) url += 'search=' + encodeURIComponent(search) + '&';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const resources = await res.json();
      if (!resources.length) { grid.innerHTML = '<div class="text-center text-muted" style="grid-column:1/-1;padding:40px;"><i class="fas fa-folder-open fa-2x"></i><p style="margin-top:10px;">No resources found.</p></div>'; return; }
      const icons = { 'past-papers': 'fa-file-alt', 'notes': 'fa-sticky-note', 'lab-manuals': 'fa-flask', 'tutorials': 'fa-play-circle', 'projects': 'fa-project-diagram', 'other': 'fa-file' };
      grid.innerHTML = resources.map(r => `<div class="resource-card">
        <div class="resource-icon"><i class="fas ${icons[r.category] || 'fa-file'}"></i></div>
        <h4>${esc(r.title)}</h4>
        <p>${esc((r.description || '').slice(0, 100))}</p>
        <div class="resource-meta">
          <span><i class="fas fa-tag"></i> ${esc(r.category)}</span>
          <span><i class="fas fa-download"></i> ${r.downloads || 0}</span>
          ${r.department ? `<span><i class="fas fa-building"></i> ${esc(r.department)}</span>` : ''}
        </div>
        <div style="margin-top:12px;">
          ${r.fileUrl ? `<a href="${esc(r.fileUrl)}" class="btn btn-sm btn-primary" onclick="trackDownload('${r._id}')"><i class="fas fa-download"></i> Download</a>` : ''}
          ${r.externalLink ? `<a href="${esc(r.externalLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline"><i class="fas fa-external-link-alt"></i> Open Link</a>` : ''}
        </div>
      </div>`).join('');
    } catch { grid.innerHTML = '<p class="text-muted text-center">Failed to load resources.</p>'; }
  }

  window.trackDownload = async function (id) {
    try { await fetch('/api/resources/' + id + '/download', { method: 'POST' }); } catch { /* ignore */ }
  };

  window.debounceResourceSearch = function () {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(loadResources, 400);
  };

  /* ===========================================================
     ELECTIONS
     =========================================================== */
  async function loadElections() {
    const container = $('electionsContainer');
    if (!container) return;
    try {
      const res = await fetch('/api/elections');
      if (!res.ok) throw new Error('Failed to load');
      const elections = await res.json();
      const active = elections.filter(e => e.status === 'active' || e.status === 'upcoming');
      const closed = elections.filter(e => e.status === 'closed');

      if (!active.length && !closed.length) {
        container.innerHTML = '<div class="text-center text-muted" style="padding:40px;"><i class="fas fa-vote-yea fa-2x"></i><p style="margin-top:10px;">No elections at the moment.</p></div>';
        return;
      }

      let html = '';

      // Active & Upcoming elections
      if (active.length) {
        html += '<h4 style="margin-bottom:14px;color:var(--gray-700);"><i class="fas fa-bolt"></i> Active & Upcoming Elections</h4>';
        for (const el of active) {
          const elRes = await fetch('/api/elections/' + el._id);
          const election = await elRes.json();
          html += renderElectionCard(election);
        }
      }

      // Past elections with results
      if (closed.length) {
        html += '<h4 style="margin:24px 0 14px;color:var(--gray-700);"><i class="fas fa-history"></i> Past Elections</h4>';
        for (const el of closed) {
          html += renderClosedElectionCard(el);
        }
      }

      container.innerHTML = html;
    } catch { container.innerHTML = '<p class="text-muted text-center">Failed to load elections.</p>'; }
  }

  function renderElectionCard(el) {
    const canVote = el.status === 'active' && !el.hasVoted && member && member.isVerified;
    const positions = el.positions || [];
    const candidates = el.candidates || [];
    let html = `<div class="election-card" id="election-${el._id}">
      <div class="election-header">
        <h4>${esc(el.title)}</h4>
        <p>${esc(el.description || '')} &bull; <i class="fas fa-clock"></i> ${fmtDate(el.startDate)} - ${fmtDate(el.endDate)}</p>
        <div style="margin-top:8px;">
          <span class="badge badge-${el.status === 'active' ? 'success' : 'warning'}">${el.status}</span>
          ${el.hasVoted ? '<span class="badge badge-info" style="margin-left:6px;"><i class="fas fa-check"></i> You have voted</span>' : ''}
          <span class="badge badge-secondary" style="margin-left:6px;"><i class="fas fa-users"></i> ${el.totalVoters || 0} voted</span>
        </div>
      </div>
      <div class="election-body">`;

    positions.forEach(pos => {
      const posCandidates = candidates.filter(c => c.position === pos);
      html += `<div class="election-position"><h5>${esc(pos)}</h5>`;
      posCandidates.forEach(c => {
        html += `<div class="candidate-card" ${canVote ? `onclick="selectCandidate('${el._id}','${c._id}','${pos}',this)"` : ''}>
          <div class="candidate-avatar"><i class="fas fa-user"></i></div>
          <div class="candidate-info">
            <h5>${esc(c.member ? c.member.fullName : 'Unknown')}</h5>
            <p>${esc(c.manifesto || 'No manifesto provided')}</p>
          </div>
          ${canVote ? '<input type="radio" name="vote-' + el._id + '-' + pos + '" value="' + c._id + '" style="margin-left:auto;">' : ''}
        </div>`;
      });
      html += '</div>';
    });

    if (canVote) {
      html += `<button class="btn btn-primary" id="voteBtn-${el._id}" onclick="submitVote('${el._id}')"><i class="fas fa-vote-yea"></i> Cast Vote</button>`;
    }
    html += '</div></div>';
    return html;
  }

  function renderClosedElectionCard(el) {
    return `<div class="election-card election-card-closed">
      <div class="election-header" style="background:var(--gray-600);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h4>${esc(el.title)}</h4>
          <button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:white;border:none;" onclick="viewElectionResults('${el._id}')">
            <i class="fas fa-chart-bar"></i> View Results
          </button>
        </div>
        <p>${esc(el.description || '')} &bull; <i class="fas fa-clock"></i> ${fmtDate(el.startDate)} - ${fmtDate(el.endDate)}</p>
        <span class="badge badge-secondary" style="margin-top:6px;">${el.status}</span>
      </div>
    </div>`;
  }

  window.selectCandidate = function (elId, candId, pos, el) {
    const radio = el.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    el.parentElement.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  };

  window.submitVote = async function (elId) {
    const positions = document.querySelectorAll(`#election-${elId} .election-position`);
    const votes = {};
    positions.forEach(pos => {
      const checked = pos.querySelector('input[type="radio"]:checked');
      if (checked) {
        const h5 = pos.querySelector('h5');
        votes[h5.textContent] = checked.value;
      }
    });
    if (!Object.keys(votes).length) { showToast('Please select at least one candidate.', 'error'); return; }
    if (!confirm('Are you sure you want to cast your vote? This cannot be undone.')) return;

    const btn = $('voteBtn-' + elId);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }

    try {
      const res = await fetch('/api/elections/' + elId + '/vote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vote failed');
      showToast('Vote cast successfully!', 'success');
      loadElections();
    } catch (err) {
      showToast(err.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-vote-yea"></i> Cast Vote'; }
    }
  };

  window.viewElectionResults = async function (id) {
    try {
      const res = await fetch('/api/elections/' + id + '/results');
      const el = await res.json();
      if (!res.ok) throw new Error(el.error || 'Cannot view results');
      const positions = el.positions || [];
      const candidates = el.candidates || [];
      let html = `<div class="results-modal-overlay" onclick="if(event.target===this)this.remove()">
        <div class="results-modal">
          <div class="results-modal-header">
            <h3><i class="fas fa-chart-bar"></i> ${esc(el.title)} — Results</h3>
            <button class="btn btn-ghost" onclick="this.closest('.results-modal-overlay').remove()">&times;</button>
          </div>
          <div class="results-modal-body">
            <div style="margin-bottom:16px;font-size:.9rem;color:var(--gray-600);">
              <i class="fas fa-users"></i> Total Voters: <strong>${el.totalVoters || 0}</strong>
            </div>`;
      positions.forEach(pos => {
        const posCands = candidates.filter(c => c.position === pos).sort((a, b) => b.votes - a.votes);
        html += `<div class="results-position">
          <h4>${esc(pos)}</h4>
          ${posCands.map((c, i) => {
            const pct = el.totalVoters ? Math.round((c.votes / el.totalVoters) * 100) : 0;
            return `<div class="results-candidate ${i === 0 && c.votes > 0 ? 'leading' : ''}">
              <div class="results-candidate-info">
                <span class="rank">#${i + 1}</span>
                <strong>${esc(c.member?.fullName || 'Unknown')}</strong>
              </div>
              <div class="results-bar-wrap">
                <div class="results-bar" style="width:${pct}%"></div>
              </div>
              <div class="results-votes">${c.votes} votes (${pct}%)</div>
            </div>`;
          }).join('')}
        </div>`;
      });
      html += '</div></div></div>';
      document.body.insertAdjacentHTML('beforeend', html);
    } catch (er) { showToast(er.message || 'Results not available yet.', 'error'); }
  };

  /* ===========================================================
     ATTENDANCE
     =========================================================== */
  async function loadAttendance() {
    /* Load events for check-in dropdown */
    try {
      const evRes = await fetch('/api/events');
      if (evRes.ok) {
        const events = await evRes.json();
        const sel = $('checkinEventSelect');
        if (sel) {
          sel.innerHTML = '<option value="">Select an event...</option>' +
            events.filter(e => e.status === 'upcoming' || e.status === 'ongoing')
              .map(e => `<option value="${e._id}">${esc(e.title)} — ${fmtDate(e.date)}</option>`).join('');
        }
      }
    } catch { /* ignore */ }

    /* Load attendance history */
    try {
      const res = await fetch('/api/attendance/mine');
      if (res.ok) {
        const records = await res.json();
        const tbody = $('attendanceHistory');
        if (!tbody) return;
        if (!records.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No attendance records yet.</td></tr>'; return; }
        tbody.innerHTML = records.map(r => `<tr>
          <td>${esc(r.event ? r.event.title : 'Unknown')}</td>
          <td>${r.event ? fmtDate(r.event.date) : '--'}</td>
          <td>${r.event ? esc(r.event.location || 'TBA') : '--'}</td>
          <td>${fmtDateTime(r.checkInTime)}</td>
          <td><span class="badge badge-info">${r.method}</span></td>
        </tr>`).join('');
      }
    } catch { /* ignore */ }
  }

  window.selfCheckIn = async function () {
    const sel = $('checkinEventSelect');
    const msg = $('checkinMsg');
    if (!sel || !sel.value) { showToast('Please select an event.', 'error'); return; }
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: sel.value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');
      showToast('Checked in successfully!', 'success');
      if (msg) { msg.textContent = 'Checked in!'; msg.className = 'form-msg success'; }
      loadAttendance();
    } catch (err) {
      showToast(err.message, 'error');
      if (msg) { msg.textContent = err.message; msg.className = 'form-msg error'; }
    }
  };

  /* ===========================================================
     EVENTS
     =========================================================== */
  let allPortalEvents = [];
  async function loadPortalEvents() {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed');
      allPortalEvents = await res.json();
      filterEvents('all');
    } catch { /* ignore */ }
  }

  window.filterEvents = function (filter, btn) {
    if (btn) {
      document.querySelectorAll('.events-filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    const grid = $('portalEventsGrid');
    if (!grid) return;
    const filtered = filter === 'all' ? allPortalEvents : allPortalEvents.filter(e => e.status === filter);
    if (!filtered.length) { grid.innerHTML = '<div class="text-center text-muted" style="grid-column:1/-1;padding:40px;">No events found.</div>'; return; }
    grid.innerHTML = filtered.map(ev => `<div class="event-card">
      <div class="event-card-top"><span class="date">${fmtDate(ev.date)}</span><span class="badge badge-accent">${esc(ev.category || 'event')}</span></div>
      <div class="event-card-body">
        <h3>${esc(ev.title)}</h3>
        <p>${esc((ev.description || '').slice(0, 120))}</p>
        <p><i class="fas fa-map-marker-alt"></i> ${esc(ev.location || 'TBA')}</p>
      </div>
      <div class="event-card-footer">
        <span><i class="fas fa-users"></i> ${(ev.registrations || []).length} registered</span>
        <span class="badge badge-${ev.status === 'upcoming' ? 'success' : ev.status === 'ongoing' ? 'info' : 'secondary'}">${ev.status}</span>
      </div>
    </div>`).join('');
  };

  /* ===========================================================
     ANNOUNCEMENTS
     =========================================================== */
  async function loadPortalAnnouncements() {
    const feed = $('portalAnnouncements');
    if (!feed) return;
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('Failed');
      const anns = await res.json();
      if (!anns.length) { feed.innerHTML = '<p class="text-muted text-center" style="padding:40px;">No announcements yet.</p>'; return; }
      feed.innerHTML = anns.map(a => `<div class="announcement-item ${a.isPinned ? 'pinned' : ''} ${a.priority === 'urgent' ? 'urgent' : ''}">
        <h4>${a.isPinned ? '<i class="fas fa-thumbtack" style="color:var(--accent)"></i> ' : ''}${esc(a.title)}</h4>
        <p>${esc(a.content || '')}</p>
        <div class="ann-meta"><i class="fas fa-clock"></i> ${fmtDate(a.createdAt)} &bull; <span class="badge badge-${a.priority === 'urgent' ? 'danger' : a.priority === 'high' ? 'warning' : 'secondary'}">${a.priority}</span></div>
      </div>`).join('');
    } catch { feed.innerHTML = '<p class="text-muted text-center">Failed to load.</p>'; }
  }

  /* ===========================================================
     CLUBS & SOCIETIES
     =========================================================== */
  let _clubsCache = [];

  async function loadClubs() {
    const grid = $('clubsGrid');
    const detail = $('clubDetailView');
    if (detail) detail.style.display = 'none';
    if (!grid) return;
    grid.style.display = '';
    grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading clubs...</div>';
    try {
      const res = await fetch('/api/clubs');
      if (!res.ok) throw new Error('Failed');
      _clubsCache = await res.json();
      if (!_clubsCache.length) { grid.innerHTML = '<div class="text-center text-muted" style="grid-column:1/-1;padding:40px;"><i class="fas fa-users fa-2x"></i><p style="margin-top:10px;">No clubs available yet.</p></div>'; return; }
      grid.innerHTML = _clubsCache.map(c => `<div class="club-card">
        <div class="club-card-header">
          <h4>${esc(c.name)}</h4>
          <span class="badge badge-accent">${esc(c.category || 'General')}</span>
        </div>
        <p class="club-card-desc">${esc((c.description || '').slice(0, 120))}</p>
        <div class="club-card-meta">
          <span><i class="fas fa-user-tie"></i> ${esc(c.chairperson?.fullName || 'TBA')}</span>
          <span><i class="fas fa-users"></i> ${c.memberCount} members</span>
        </div>
        <div class="club-card-actions">
          ${c.isMember
            ? `<button class="btn btn-sm btn-outline" onclick="viewClubDetail('${c._id}')"><i class="fas fa-eye"></i> View Club</button>
               ${!c.isChairperson ? `<button class="btn btn-sm btn-ghost" onclick="leaveClub('${c._id}')"><i class="fas fa-sign-out-alt"></i> Leave</button>` : ''}`
            : `<button class="btn btn-sm btn-primary" onclick="joinClub('${c._id}')"><i class="fas fa-plus"></i> Join Club</button>`}
        </div>
      </div>`).join('');
    } catch { grid.innerHTML = '<p class="text-muted text-center">Failed to load clubs.</p>'; }
  }

  window.joinClub = async function (id) {
    try {
      const res = await fetch('/api/clubs/' + id + '/join', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Joined club successfully!', 'success');
      loadClubs();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.leaveClub = async function (id) {
    if (!confirm('Leave this club?')) return;
    try {
      const res = await fetch('/api/clubs/' + id + '/leave', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Left club.', 'info');
      loadClubs();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.viewClubDetail = async function (id) {
    const grid = $('clubsGrid');
    const detail = $('clubDetailView');
    const content = $('clubDetailContent');
    if (grid) grid.style.display = 'none';
    if (detail) detail.style.display = '';
    if (!content) return;
    content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    try {
      const res = await fetch('/api/clubs/' + id);
      if (!res.ok) throw new Error('Failed');
      const club = await res.json();
      const isChair = club.chairperson?._id === member?._id;
      let html = `<div class="club-detail-header"><h3>${esc(club.name)}</h3>
        <span class="badge badge-accent">${esc(club.category || 'General')}</span>
        <p style="margin-top:8px;">${esc(club.description || '')}</p>
        <p style="color:var(--gray-500);"><i class="fas fa-user-tie"></i> Chairperson: <strong>${esc(club.chairperson?.fullName || 'TBA')}</strong> &bull; ${club.members?.length || 0} members</p>
      </div>`;

      /* Members list */
      html += `<details class="club-members-section" style="margin:16px 0;">
        <summary style="cursor:pointer;font-weight:600;"><i class="fas fa-users"></i> Members (${club.members?.length || 0})</summary>
        <div class="club-members-list">${(club.members || []).map(m => `<span class="member-chip">${esc(m.fullName)}</span>`).join('')}</div>
      </details>`;

      /* Events */
      html += '<h4 style="margin:20px 0 10px;"><i class="fas fa-calendar"></i> Club Events</h4>';
      if (isChair) {
        html += `<div class="form-card" style="margin-bottom:16px;">
          <form onsubmit="addClubEvent(event,'${club._id}')">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="form-group"><label>Event Title</label><input type="text" id="ceTitle" required></div>
              <div class="form-group"><label>Date</label><input type="datetime-local" id="ceDate" required></div>
            </div>
            <div class="form-group"><label>Location</label><input type="text" id="ceLocation"></div>
            <div class="form-group"><label>Description</label><textarea id="ceDesc" rows="2"></textarea></div>
            <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> Add Event</button>
          </form>
        </div>`;
      }

      const events = club.events || [];
      if (!events.length) {
        html += '<p class="text-muted">No events yet.</p>';
      } else {
        html += events.sort((a, b) => new Date(b.date) - new Date(a.date)).map(ev => `<div class="club-event-item">
          <div class="club-event-date">${fmtDate(ev.date)}</div>
          <div class="club-event-info">
            <strong>${esc(ev.title)}</strong>
            <p>${esc(ev.description || '')}</p>
            ${ev.location ? `<span class="text-muted"><i class="fas fa-map-marker-alt"></i> ${esc(ev.location)}</span>` : ''}
          </div>
          ${isChair ? `<button class="btn btn-sm btn-ghost" onclick="deleteClubEvent('${club._id}','${ev._id}')"><i class="fas fa-trash"></i></button>` : ''}
        </div>`).join('');
      }
      content.innerHTML = html;
    } catch { content.innerHTML = '<p class="text-muted">Failed to load club details.</p>'; }
  };

  window.backToClubs = function () {
    const grid = $('clubsGrid');
    const detail = $('clubDetailView');
    if (grid) grid.style.display = '';
    if (detail) detail.style.display = 'none';
  };

  window.addClubEvent = async function (e, clubId) {
    e.preventDefault();
    try {
      const res = await fetch('/api/clubs/' + clubId + '/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: $('ceTitle').value, date: $('ceDate').value, location: $('ceLocation').value, description: $('ceDesc').value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Event added!', 'success');
      viewClubDetail(clubId);
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.deleteClubEvent = async function (clubId, eventId) {
    if (!confirm('Delete this event?')) return;
    try {
      const res = await fetch('/api/clubs/' + clubId + '/events/' + eventId, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      showToast('Event deleted.', 'info');
      viewClubDetail(clubId);
    } catch (err) { showToast(err.message, 'error'); }
  };

  /* ===========================================================
     MY UNITS & COURSEWORK
     =========================================================== */
  let _allUnits = [];
  let _unitTab = 'available';

  async function loadUnits() {
    const container = $('unitsContainer');
    const detail = $('unitDetailView');
    if (detail) detail.style.display = 'none';
    if (!container) return;
    container.style.display = '';
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading units...</div>';
    try {
      const res = await fetch('/api/units');
      if (!res.ok) throw new Error('Failed');
      _allUnits = await res.json();
      renderUnits();
    } catch { container.innerHTML = '<p class="text-muted text-center">Failed to load units.</p>'; }
  }

  function renderUnits() {
    const container = $('unitsContainer');
    if (!container) return;
    const list = _unitTab === 'enrolled'
      ? _allUnits.filter(u => u.isEnrolled)
      : _allUnits;
    if (!list.length) {
      container.innerHTML = `<div class="text-center text-muted" style="padding:40px;"><i class="fas fa-chalkboard fa-2x"></i><p style="margin-top:10px;">${_unitTab === 'enrolled' ? 'You have not registered for any units yet.' : 'No units available.'}</p></div>`;
      return;
    }
    container.innerHTML = `<div class="units-grid">${list.map(u => `<div class="unit-card">
      <div class="unit-card-header">
        <span class="unit-code">${esc(u.code)}</span>
        ${u.isEnrolled ? '<span class="badge badge-success">Enrolled</span>' : ''}
      </div>
      <h4>${esc(u.name)}</h4>
      <div class="unit-card-meta">
        <span><i class="fas fa-user-tie"></i> ${u.lecturer ? esc((u.lecturer.title || '') + ' ' + u.lecturer.fullName) : 'TBA'}</span>
        <span><i class="fas fa-building"></i> ${esc(u.department || '')}</span>
        <span>Year ${u.yearOfStudy || '?'} &bull; Sem ${u.semester || '?'}</span>
        <span><i class="fas fa-users"></i> ${u.studentCount || 0} students</span>
      </div>
      <div class="unit-card-actions">
        ${u.isEnrolled
          ? `<button class="btn btn-sm btn-outline" onclick="viewUnitDetail('${u._id}')"><i class="fas fa-eye"></i> View</button>
             <button class="btn btn-sm btn-ghost" onclick="unregisterUnit('${u._id}')"><i class="fas fa-times"></i> Drop</button>`
          : `<button class="btn btn-sm btn-primary" onclick="registerUnit('${u._id}')"><i class="fas fa-plus"></i> Register</button>`}
      </div>
    </div>`).join('')}</div>`;
  }

  window.switchUnitTab = function (tab, btn) {
    _unitTab = tab;
    document.querySelectorAll('.units-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderUnits();
  };

  window.registerUnit = async function (id) {
    try {
      const res = await fetch('/api/units/' + id + '/register', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Registered for unit!', 'success');
      loadUnits();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.unregisterUnit = async function (id) {
    if (!confirm('Drop this unit?')) return;
    try {
      const res = await fetch('/api/units/' + id + '/unregister', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Dropped unit.', 'info');
      loadUnits();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.viewUnitDetail = async function (id) {
    const container = $('unitsContainer');
    const detail = $('unitDetailView');
    const content = $('unitDetailContent');
    if (container) container.style.display = 'none';
    document.querySelector('.units-tabs').style.display = 'none';
    if (detail) detail.style.display = '';
    if (!content) return;
    content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    try {
      const [unitRes, attRes, asnRes] = await Promise.all([
        fetch('/api/units/' + id),
        fetch('/api/units/' + id + '/attendance'),
        fetch('/api/units/' + id + '/assignments')
      ]);
      const unit = await unitRes.json();
      const attendance = attRes.ok ? await attRes.json() : [];
      const assignments = asnRes.ok ? await asnRes.json() : [];

      let html = `<div class="unit-detail-header">
        <h3>${esc(unit.code)} — ${esc(unit.name)}</h3>
        <p><i class="fas fa-user-tie"></i> ${unit.lecturer ? esc((unit.lecturer.title || '') + ' ' + unit.lecturer.fullName) : 'TBA'} &bull; ${esc(unit.department || '')} &bull; Year ${unit.yearOfStudy || '?'} Sem ${unit.semester || '?'}</p>
      </div>`;

      /* Attendance Summary */
      html += '<h4 style="margin:20px 0 10px;"><i class="fas fa-clipboard-check"></i> Attendance</h4>';
      if (!attendance.length) {
        html += '<p class="text-muted">No attendance sessions yet.</p>';
      } else {
        const attended = attendance.filter(a => a.wasPresent || a.present).length;
        html += `<p>Attended <strong>${attended}</strong> of <strong>${attendance.length}</strong> sessions (${attendance.length ? Math.round(attended / attendance.length * 100) : 0}%)</p>`;
        html += `<div class="attendance-list">${attendance.map(a => `<div class="att-row ${a.wasPresent || a.present ? 'att-present' : 'att-absent'}">
          <span>${fmtDate(a.date)}</span>
          <span>${esc(a.topic || '')}</span>
          <span class="badge badge-${a.wasPresent || a.present ? 'success' : 'danger'}">${a.wasPresent || a.present ? 'Present' : 'Absent'}</span>
        </div>`).join('')}</div>`;
      }

      /* Assignments */
      html += '<h4 style="margin:20px 0 10px;"><i class="fas fa-tasks"></i> Assignments</h4>';
      if (!assignments.length) {
        html += '<p class="text-muted">No assignments yet.</p>';
      } else {
        html += assignments.map(a => {
          const due = new Date(a.dueDate);
          const overdue = due < new Date() && !a.mySubmission;
          return `<div class="assignment-card ${overdue ? 'overdue' : ''}">
            <div class="assignment-header">
              <strong>${esc(a.title)}</strong>
              <span class="badge badge-${a.mySubmission ? 'success' : overdue ? 'danger' : 'warning'}">${a.mySubmission ? (a.mySubmission.grade ? 'Graded: ' + a.mySubmission.grade : 'Submitted') : overdue ? 'Overdue' : 'Pending'}</span>
            </div>
            <p>${esc(a.description || '')}</p>
            <p class="text-muted">Due: ${fmtDateTime(a.dueDate)}</p>
            ${!a.mySubmission ? `<form onsubmit="submitAssignment(event,'${a._id}','${id}')" style="margin-top:8px;">
              <div class="form-group"><label>Notes / Link</label><input type="text" id="subNotes-${a._id}" placeholder="Your submission notes or link"></div>
              <button type="submit" class="btn btn-sm btn-primary"><i class="fas fa-upload"></i> Submit</button>
            </form>` : ''}
          </div>`;
        }).join('');
      }
      content.innerHTML = html;
    } catch { content.innerHTML = '<p class="text-muted">Failed to load unit details.</p>'; }
  };

  window.backToUnits = function () {
    const container = $('unitsContainer');
    const detail = $('unitDetailView');
    if (container) container.style.display = '';
    document.querySelector('.units-tabs').style.display = '';
    if (detail) detail.style.display = 'none';
  };

  window.submitAssignment = async function (e, assignmentId, unitId) {
    e.preventDefault();
    const notes = $('subNotes-' + assignmentId)?.value || '';
    try {
      const res = await fetch('/api/units/assignments/' + assignmentId + '/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Assignment submitted!', 'success');
      viewUnitDetail(unitId);
    } catch (err) { showToast(err.message, 'error'); }
  };

  /* ===========================================================
     EXECUTIVE COMMUNICATION BOARD
     =========================================================== */
  let _isExec = false;

  async function checkExecStatus() {
    try {
      const res = await fetch('/api/exec-comms/check');
      if (res.ok) {
        const data = await res.json();
        _isExec = data.isExec;
        const nav = $('navExecComms');
        if (nav && _isExec) nav.style.display = '';
      }
    } catch { /* not exec */ }
  }

  async function loadExecComms() {
    const container = $('execMessagesContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    try {
      const res = await fetch('/api/exec-comms');
      if (!res.ok) throw new Error('Failed');
      const messages = await res.json();
      if (!messages.length) { container.innerHTML = '<div class="text-center text-muted" style="padding:40px;"><i class="fas fa-comments fa-2x"></i><p style="margin-top:10px;">No discussions yet. Start a new one!</p></div>'; return; }
      container.innerHTML = messages.map(m => {
        const isMine = m.sender?._id === member?._id;
        return `<div class="exec-msg-card ${m.pinned ? 'pinned' : ''}">
          <div class="exec-msg-header">
            ${m.pinned ? '<i class="fas fa-thumbtack" style="color:var(--accent);margin-right:6px;"></i>' : ''}
            <strong>${esc(m.subject)}</strong>
            <span class="text-muted" style="margin-left:auto;font-size:.85rem;">${esc(m.sender?.fullName || 'Unknown')} &bull; ${fmtDateTime(m.createdAt)}</span>
          </div>
          <div class="exec-msg-body"><p>${esc(m.body)}</p></div>
          <div class="exec-msg-actions">
            <button class="btn btn-sm btn-ghost" onclick="toggleReplies('${m._id}')"><i class="fas fa-reply"></i> Replies (${(m.replies || []).length})</button>
            <button class="btn btn-sm btn-ghost" onclick="pinMessage('${m._id}')"><i class="fas fa-thumbtack"></i> ${m.pinned ? 'Unpin' : 'Pin'}</button>
            ${isMine ? `<button class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="deleteExecMessage('${m._id}')"><i class="fas fa-trash"></i></button>` : ''}
          </div>
          <div class="exec-replies" id="replies-${m._id}" style="display:none;">
            ${(m.replies || []).map(r => `<div class="exec-reply">
              <strong>${esc(r.sender?.fullName || 'Unknown')}</strong> <span class="text-muted">${fmtDateTime(r.createdAt)}</span>
              <p>${esc(r.body)}</p>
            </div>`).join('')}
            <form onsubmit="replyExecMessage(event,'${m._id}')" class="exec-reply-form">
              <input type="text" id="reply-${m._id}" placeholder="Write a reply..." required>
              <button type="submit" class="btn btn-sm btn-primary"><i class="fas fa-paper-plane"></i></button>
            </form>
          </div>
        </div>`;
      }).join('');
    } catch { container.innerHTML = '<p class="text-muted text-center">Failed to load messages.</p>'; }
  }

  window.showNewMessage = function () {
    const f = $('execMsgForm');
    if (f) f.style.display = f.style.display === 'none' ? '' : 'none';
  };

  window.postExecMessage = async function (e) {
    e.preventDefault();
    const subject = $('execMsgSubject').value.trim();
    const body = $('execMsgBody').value.trim();
    if (!subject || !body) return;
    try {
      const res = await fetch('/api/exec-comms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Message posted!', 'success');
      $('execMsgSubject').value = '';
      $('execMsgBody').value = '';
      $('execMsgForm').style.display = 'none';
      loadExecComms();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.toggleReplies = function (id) {
    const el = $('replies-' + id);
    if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
  };

  window.replyExecMessage = async function (e, msgId) {
    e.preventDefault();
    const input = $('reply-' + msgId);
    const body = input?.value?.trim();
    if (!body) return;
    try {
      const res = await fetch('/api/exec-comms/' + msgId + '/replies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Reply posted!', 'success');
      loadExecComms();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.pinMessage = async function (id) {
    try {
      const res = await fetch('/api/exec-comms/' + id + '/pin', { method: 'PATCH' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      loadExecComms();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.deleteExecMessage = async function (id) {
    if (!confirm('Delete this message?')) return;
    try {
      const res = await fetch('/api/exec-comms/' + id, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      showToast('Message deleted.', 'info');
      loadExecComms();
    } catch (err) { showToast(err.message, 'error'); }
  };

  /* ===========================================================
     PROFILE
     =========================================================== */
  function loadProfile() {
    if (!member) return;
    const pd = $('profileDetails');
    if (!pd) return;
    const fields = [
      ['Full Name', member.fullName],
      ['Reg Number', member.regNumber],
      ['Email', member.email],
      ['Phone', member.phone || 'Not set'],
      ['Department', member.department],
      ['Year of Study', 'Year ' + member.yearOfStudy],
      ['Gender', member.gender || 'Not set'],
      ['Status', member.status],
      ['Verified', member.isVerified ? 'Yes' : 'No'],
      ['Registration Fee', member.registrationPaid ? 'Paid' : 'Not Paid'],
      ['Current Semester', member.currentSemester || 'Not Paid'],
      ['Joined', fmtDate(member.createdAt)]
    ];
    pd.innerHTML = fields.map(([l, v]) => `<div class="profile-field"><span class="label">${l}</span><span class="value">${esc(String(v))}</span></div>`).join('');
  }

  window.changePassword = async function (e) {
    e.preventDefault();
    const msg = $('passwordMsg');
    const cur = $('currentPassword').value;
    const np = $('newPassword').value;
    const cp = $('confirmPassword').value;
    if (msg) { msg.textContent = ''; msg.className = 'form-msg'; }
    if (np !== cp) { if (msg) { msg.textContent = 'Passwords do not match.'; msg.className = 'form-msg error'; } return; }
    try {
      const res = await fetch('/api/members/me/password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: cur, newPassword: np })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Password updated!', 'success');
      if (msg) { msg.textContent = 'Password updated successfully.'; msg.className = 'form-msg success'; }
      e.target.reset();
    } catch (err) {
      showToast(err.message, 'error');
      if (msg) { msg.textContent = err.message; msg.className = 'form-msg error'; }
    }
  };

  /* ===========================================================
     NOTIFICATIONS
     =========================================================== */
  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const badge = $('notifBadge');
      if (badge) {
        if (data.unreadCount > 0) {
          badge.style.display = '';
          badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
        } else {
          badge.style.display = 'none';
        }
      }
      const list = $('notifList');
      if (list && data.notifications.length) {
        list.innerHTML = data.notifications.slice(0, 20).map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}" onclick="readNotification('${n._id}', '${n.link || ''}')">
            <div class="notif-icon"><i class="fas fa-${getNotifIcon(n.type)}"></i></div>
            <div class="notif-body">
              <strong>${esc(n.title)}</strong>
              <p>${esc(n.message)}</p>
              <small>${fmtDateTime(n.createdAt)}</small>
            </div>
          </div>
        `).join('');
      } else if (list) {
        list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
      }
    } catch { /* silent */ }
  }

  function getNotifIcon(type) {
    const icons = { event: 'calendar-alt', announcement: 'bullhorn', payment: 'credit-card', election: 'vote-yea', assignment: 'file-alt', attendance: 'clipboard-check', club: 'users', forum: 'comments', poll: 'chart-bar', system: 'bell' };
    return icons[type] || 'bell';
  }

  window.toggleNotifications = function () {
    const dd = $('notifDropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  };

  window.readNotification = async function (id, link) {
    try {
      await fetch('/api/notifications/' + id + '/read', { method: 'PUT' });
      loadNotifications();
      if (link) {
        // Handle internal links like "forum", "polls", etc.
        const section = link.replace('#', '').replace('/', '');
        if (section) showSection(section);
      }
      const dd = $('notifDropdown');
      if (dd) dd.style.display = 'none';
    } catch { /* silent */ }
  };

  window.markAllNotificationsRead = async function () {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      loadNotifications();
      showToast('All notifications marked as read', 'success');
    } catch { /* silent */ }
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    const dd = $('notifDropdown');
    const bell = document.querySelector('.notification-bell');
    if (dd && dd.style.display !== 'none' && !dd.contains(e.target) && !bell?.contains(e.target)) {
      dd.style.display = 'none';
    }
  });

  /* ===========================================================
     FORUM
     =========================================================== */
  let _forumSearchTimer = null;
  window.debounceForumSearch = function () {
    clearTimeout(_forumSearchTimer);
    _forumSearchTimer = setTimeout(loadForumTopics, 400);
  };

  async function loadForumTopics() {
    const container = $('forumTopicsContainer');
    const detailView = $('topicDetailView');
    if (detailView) detailView.style.display = 'none';
    if (container) container.style.display = '';

    const category = $('forumCategoryFilter')?.value || '';
    const search = $('forumSearch')?.value || '';
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      const res = await fetch('/api/forum?' + params);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      if (!data.topics?.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>No topics yet. Be the first to start a discussion!</p></div>';
        return;
      }
      container.innerHTML = data.topics.map(t => `
        <div class="forum-topic-card" onclick="viewForumTopic('${t._id}')">
          <div class="topic-meta">
            ${t.isPinned ? '<span class="badge badge-accent"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
            <span class="badge badge-outline">${esc(t.category)}</span>
          </div>
          <h4 class="topic-title">${esc(t.title)}</h4>
          <p class="topic-excerpt">${esc(t.body?.substring(0, 120))}${t.body?.length > 120 ? '...' : ''}</p>
          <div class="topic-footer">
            <span><i class="fas fa-user"></i> ${esc(t.author?.fullName || 'Unknown')}</span>
            <span><i class="fas fa-eye"></i> ${t.views || 0}</span>
            <span><i class="fas fa-heart"></i> ${t.likeCount || 0}</span>
            <span><i class="fas fa-clock"></i> ${fmtDateTime(t.createdAt)}</span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<div class="text-center text-muted">Failed to load topics</div>';
    }
  }

  window.viewForumTopic = async function (id) {
    const container = $('forumTopicsContainer');
    const detailView = $('topicDetailView');
    const content = $('topicDetailContent');
    if (container) container.style.display = 'none';
    if (detailView) detailView.style.display = '';
    if ($('newTopicForm')) $('newTopicForm').style.display = 'none';

    try {
      const res = await fetch('/api/forum/' + id);
      const t = await res.json();
      if (!res.ok) throw new Error(t.error || 'Failed');
      content.innerHTML = `
        <div class="topic-detail">
          <div class="topic-header">
            <div class="topic-meta">
              <span class="badge badge-outline">${esc(t.category)}</span>
              ${t.isPinned ? '<span class="badge badge-accent"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
              ${t.isLocked ? '<span class="badge badge-error"><i class="fas fa-lock"></i> Locked</span>' : ''}
            </div>
            <h3>${esc(t.title)}</h3>
            <div class="topic-author">
              <i class="fas fa-user-circle"></i>
              <span>${esc(t.author?.fullName || 'Unknown')}</span>
              <span class="text-muted">• ${fmtDateTime(t.createdAt)}</span>
              <span class="text-muted">• ${t.views} views</span>
            </div>
          </div>
          <div class="topic-body">${esc(t.body).replace(/\n/g, '<br>')}</div>
          ${t.tags?.length ? `<div class="topic-tags">${t.tags.map(tg => `<span class="tag">${esc(tg)}</span>`).join('')}</div>` : ''}
          <div class="topic-actions">
            <button class="btn btn-sm ${t.hasLiked ? 'btn-accent' : 'btn-ghost'}" onclick="likeForumTopic('${t._id}')">
              <i class="fas fa-heart"></i> ${t.likeCount || 0}
            </button>
          </div>
          <hr>
          <h4><i class="fas fa-comments"></i> Replies (${t.replies?.length || 0})</h4>
          <div class="replies-list">
            ${(t.replies || []).map(r => `
              <div class="reply-card">
                <div class="reply-author">
                  <i class="fas fa-user-circle"></i>
                  <strong>${esc(r.author?.fullName || 'Unknown')}</strong>
                  <span class="text-muted">${fmtDateTime(r.createdAt)}</span>
                </div>
                <div class="reply-body">${esc(r.body).replace(/\n/g, '<br>')}</div>
                <button class="btn btn-sm btn-ghost" onclick="likeForumReply('${t._id}','${r._id}',this)">
                  <i class="fas fa-heart"></i> ${r.likeCount || 0}
                </button>
              </div>
            `).join('')}
          </div>
          ${!t.isLocked ? `
          <div class="reply-form">
            <form onsubmit="replyToTopic(event, '${t._id}')">
              <div class="form-group">
                <textarea id="replyBody-${t._id}" rows="3" placeholder="Write a reply..." required></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-paper-plane"></i> Reply</button>
            </form>
          </div>` : '<p class="text-muted"><i class="fas fa-lock"></i> This topic is locked.</p>'}
        </div>
      `;
    } catch (err) { content.innerHTML = '<p class="text-center text-muted">Failed to load topic</p>'; }
  };

  window.backToForum = function () {
    $('topicDetailView').style.display = 'none';
    $('forumTopicsContainer').style.display = '';
  };

  window.showNewTopicForm = function () {
    $('newTopicForm').style.display = $('newTopicForm').style.display === 'none' ? '' : 'none';
  };

  window.createForumTopic = async function (e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: $('topicTitle').value,
          body: $('topicBody').value,
          category: $('topicCategory').value,
          tags: $('topicTags').value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Topic created!', 'success');
      $('newTopicForm').style.display = 'none';
      $('topicTitle').value = '';
      $('topicBody').value = '';
      $('topicTags').value = '';
      loadForumTopics();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.replyToTopic = async function (e, topicId) {
    e.preventDefault();
    const bodyEl = $('replyBody-' + topicId);
    if (!bodyEl?.value?.trim()) return;
    try {
      const res = await fetch('/api/forum/' + topicId + '/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyEl.value.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Reply posted!', 'success');
      viewForumTopic(topicId);
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.likeForumTopic = async function (id) {
    try {
      const res = await fetch('/api/forum/' + id + '/like', { method: 'POST' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      viewForumTopic(id);
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.likeForumReply = async function (topicId, replyId, btn) {
    try {
      const res = await fetch('/api/forum/' + topicId + '/replies/' + replyId + '/like', { method: 'POST' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      viewForumTopic(topicId);
    } catch (err) { showToast(err.message, 'error'); }
  };

  /* ===========================================================
     POLLS
     =========================================================== */
  async function loadPolls() {
    const container = $('pollsContainer');
    try {
      const res = await fetch('/api/polls');
      const polls = await res.json();
      if (!res.ok) throw new Error(polls.error || 'Failed');

      if (!polls.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No polls available at the moment.</p></div>';
        return;
      }
      container.innerHTML = polls.map(p => `
        <div class="poll-card">
          <div class="poll-header">
            <h4>${esc(p.title)}</h4>
            <span class="badge badge-${p.status === 'active' ? 'success' : 'info'}">${p.status}</span>
          </div>
          ${p.description ? `<p class="poll-desc">${esc(p.description)}</p>` : ''}
          <div class="poll-options">
            ${p.options.map(o => {
              if (p.hasVoted || p.status === 'closed') {
                const pct = p.totalVotes > 0 ? Math.round((o.voteCount / p.totalVotes) * 100) : 0;
                return `<div class="poll-option voted">
                  <div class="poll-bar" style="width: ${pct}%"></div>
                  <span class="poll-option-text">${esc(o.text)}</span>
                  <span class="poll-option-pct">${pct}% (${o.voteCount})</span>
                </div>`;
              } else {
                return `<div class="poll-option clickable" onclick="votePoll('${p._id}', '${o._id}')">
                  <i class="far fa-circle"></i> ${esc(o.text)}
                </div>`;
              }
            }).join('')}
          </div>
          <div class="poll-footer">
            <span>${p.voterCount || 0} votes</span>
            ${p.endsAt ? `<span>Ends: ${fmtDateTime(p.endsAt)}</span>` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<div class="text-center text-muted">Failed to load polls</div>';
    }
  }

  window.votePoll = async function (pollId, optionId) {
    try {
      const res = await fetch('/api/polls/' + pollId + '/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds: [optionId] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Vote recorded!', 'success');
      loadPolls();
    } catch (err) { showToast(err.message, 'error'); }
  };

  /* ===========================================================
     MEMBER DIRECTORY
     =========================================================== */
  let _dirSearchTimer = null;
  window.debounceDirectorySearch = function () {
    clearTimeout(_dirSearchTimer);
    _dirSearchTimer = setTimeout(loadDirectory, 400);
  };

  async function loadDirectory() {
    const grid = $('directoryGrid');
    const params = new URLSearchParams();
    const search = $('directorySearch')?.value || '';
    const dept = $('directoryDept')?.value || '';
    const year = $('directoryYear')?.value || '';
    if (search) params.append('search', search);
    if (dept) params.append('department', dept);
    if (year) params.append('year', year);

    try {
      const res = await fetch('/api/upload/directory?' + params);
      const members = await res.json();
      if (!res.ok) throw new Error(members.error || 'Failed');

      if (!members.length) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No members found.</p></div>';
        return;
      }
      grid.innerHTML = members.map(m => `
        <div class="directory-card">
          <div class="dir-avatar">
            ${m.profilePhoto ? `<img src="${m.profilePhoto}" alt="${esc(m.fullName)}">` : '<i class="fas fa-user-circle"></i>'}
          </div>
          <h4>${esc(m.fullName)}</h4>
          <p class="dir-reg">${esc(m.regNumber)}</p>
          <p class="dir-dept">${esc(m.department)}</p>
          <p class="dir-year">Year ${m.yearOfStudy}</p>
          ${m.execPosition ? `<span class="badge badge-accent">${esc(m.execPosition)}</span>` : ''}
        </div>
      `).join('');
    } catch (err) {
      grid.innerHTML = '<div class="text-center text-muted">Failed to load directory</div>';
    }
  }

  /* ===========================================================
     DARK MODE
     =========================================================== */
  window.toggleDarkMode = function () {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('eesa-dark-mode', isDark ? '1' : '0');
    const icon = $('darkModeIcon');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  };
  // Init dark mode from localStorage
  if (localStorage.getItem('eesa-dark-mode') === '1') {
    document.body.classList.add('dark-mode');
    const icon = $('darkModeIcon');
    if (icon) icon.className = 'fas fa-sun';
  }

  /* ===========================================================
     PROFILE PHOTO UPLOAD
     =========================================================== */
  window.uploadProfilePhoto = async function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('photo', file);
      try {
        const res = await fetch('/api/upload/profile-photo', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        showToast('Profile photo updated!', 'success');
        member.profilePhoto = data.url;
        loadProfile();
      } catch (err) { showToast(err.message, 'error'); }
    };
    input.click();
  };

})();
