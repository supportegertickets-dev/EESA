/* ============================================================
   EESA — Admin Dashboard JavaScript
   ============================================================ */
(function () {
  'use strict';

  const API = '/api';
  let _searchTimer = null;

  /* --- Helpers --- */
  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function $(id) { return document.getElementById(id); }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'; }
  function fmtDateTime(d) { return d ? new Date(d).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'; }

  function showToast(msg, type) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + (type || 'info') + ' show';
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  function debounce(fn, ms) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }

  /* --- Auth Check --- */
  checkAuth();
  async function checkAuth() {
    try {
      const res = await fetch(API + '/auth/admin/me');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const admin = data.admin || data;
      const n = $('adminName');
      const g = $('adminGreeting');
      if (n) n.textContent = admin.fullName || admin.username || 'Admin';
      if (g) g.textContent = 'Welcome, ' + (admin.fullName || admin.username || 'Admin');
      const ls = $('loginScreen'); if (ls) ls.style.display = 'none';
      const ad = $('adminDashboard'); if (ad) ad.style.display = 'flex';
      loadDashboard();
    } catch {
      const ls2 = $('loginScreen'); if (ls2) ls2.style.display = 'flex';
      const ad2 = $('adminDashboard'); if (ad2) ad2.style.display = 'none';
    }
  }

  /* --- Login / Logout --- */
  window.adminLogin = async function (e) {
    e.preventDefault();
    const err = $('adminLoginError');
    if (err) { err.textContent = ''; err.style.display = 'none'; }
    try {
      const res = await fetch(API + '/auth/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: $('adminUsername').value, password: $('adminPassword').value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      checkAuth();
    } catch (er) {
      if (err) { err.textContent = er.message; err.style.display = 'block'; }
    }
  };

  window.adminLogout = async function () {
    await fetch(API + '/auth/admin/logout', { method: 'POST' });
    location.reload();
  };

  /* --- Sidebar Navigation --- */
  window.showAdminSection = function (section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
    const sec = $('sec-' + section);
    if (sec) sec.classList.add('active');
    const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (nav) nav.classList.add('active');
    const pt = $('pageTitle');
    const titles = { dashboard: 'Dashboard', members: 'Members', payments: 'Payments', events: 'Events', attendance: 'Attendance', elections: 'Elections', resources: 'Resources', announcements: 'Announcements', projects: 'Projects', sponsors: 'Sponsors', clubs: 'Clubs Management', 'forum-admin': 'Forum Moderation', 'polls-admin': 'Polls Management', 'notifications-admin': 'Notifications' };
    if (pt) pt.textContent = titles[section] || section;
    const loaders = { dashboard: loadDashboard, members: loadMembers, payments: loadPayments, events: loadEvents, attendance: loadAttendanceSection, elections: loadElections, resources: loadResources, announcements: loadAnnouncements, projects: loadProjects, sponsors: loadSponsors, clubs: loadAdminClubs, 'forum-admin': loadAdminForum, 'polls-admin': loadAdminPolls, 'notifications-admin': function(){} };
    if (loaders[section]) loaders[section]();
    const sb = $('sidebar');
    if (sb) sb.classList.remove('open');
  };

  window.toggleSidebar = function () {
    const sb = $('sidebar');
    if (sb) sb.classList.toggle('open');
  };

  window.debounceSearch = function (fn) {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(fn, 400);
  };

  /* ===========================================================
     DASHBOARD
     =========================================================== */
  async function loadDashboard() {
    try {
      const [stats, pendPay, recentMem] = await Promise.all([
        fetch(API + '/admin/stats').then(r => r.json()),
        fetch(API + '/payments?status=pending').then(r => r.json()),
        fetch(API + '/members?limit=5').then(r => r.json())
      ]);
      /* Stat boxes */
      const map = {
        sTotalMembers: stats.totalMembers, sActiveMembers: stats.activeMembers, sPendingMembers: stats.pendingMembers,
        sTotalRevenue: (stats.totalRevenue || 0).toLocaleString(), sUpcomingEvents: stats.totalEvents,
        sTotalProjects: stats.totalProjects, sPendingPayments: pendPay.length, sTotalSponsors: stats.totalSponsors || 0
      };
      Object.entries(map).forEach(([id, val]) => { const el = $(id); if (el) el.textContent = val; });

      /* Recent members */
      const rmBody = $('dashRecentMembers');
      if (rmBody) {
        const mems = Array.isArray(recentMem) ? recentMem.slice(0, 5) : [];
        rmBody.innerHTML = mems.map(m => `<tr>
          <td>${esc(m.fullName)}</td><td>${esc(m.regNumber)}</td><td>${esc(m.department)}</td>
          <td><span class="badge badge-${m.status === 'active' ? 'success' : 'warning'}">${m.status}</span></td>
        </tr>`).join('') || '<tr><td colspan="4" class="text-center text-muted">No members yet</td></tr>';
      }

      /* Recent pending payments */
      const rpBody = $('dashRecentPayments');
      if (rpBody) {
        rpBody.innerHTML = pendPay.slice(0, 5).map(p => `<tr>
          <td>${esc(p.member?.fullName || '--')}</td>
          <td><span class="badge badge-${p.type === 'registration' ? 'primary' : 'info'}">${p.type || '--'}</span></td>
          <td>KSh ${p.amount}</td>
          <td>
            <button class="btn btn-sm btn-success" onclick="confirmPayment('${p._id}')"><i class="fas fa-check"></i></button>
            <button class="btn btn-sm btn-danger" onclick="rejectPayment('${p._id}')"><i class="fas fa-times"></i></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="4" class="text-center text-muted">No pending payments</td></tr>';
      }
    } catch (e) { console.error('Dashboard load error:', e); }
  }

  /* ===========================================================
     MEMBERS
     =========================================================== */
  window.loadMembers = async function () {
    const search = ($('memberSearch') || {}).value || '';
    const status = ($('memberStatusFilter') || {}).value || '';
    const dept = ($('memberDeptFilter') || {}).value || '';
    let url = API + '/members?';
    if (search) url += 'search=' + encodeURIComponent(search) + '&';
    if (status) url += 'status=' + encodeURIComponent(status) + '&';
    if (dept) url += 'department=' + encodeURIComponent(dept) + '&';
    try {
      const members = await fetch(url).then(r => r.json());
      const tbody = $('membersTable');
      if (!tbody) return;
      tbody.innerHTML = members.map(m => `<tr>
        <td>${esc(m.fullName)}</td>
        <td>${esc(m.regNumber)}</td>
        <td>${esc(m.email)}</td>
        <td>${esc(m.department)}</td>
        <td>${m.yearOfStudy}</td>
        <td><span class="badge badge-${m.status === 'active' ? 'success' : m.status === 'pending' ? 'warning' : 'danger'}">${m.status}</span></td>
        <td>${m.isVerified ? '<i class="fas fa-check-circle" style="color:var(--success)"></i>' : '<i class="fas fa-times-circle" style="color:var(--danger)"></i>'}</td>
        <td class="actions">
          ${!m.isVerified && m.registrationPaid ? `<button class="btn btn-sm btn-success" onclick="verifyMember('${m._id}')" title="Verify"><i class="fas fa-user-check"></i></button>` : ''}
          ${m.status !== 'suspended' ? `<button class="btn btn-sm btn-danger" onclick="changeMemberStatus('${m._id}','suspended')" title="Suspend"><i class="fas fa-ban"></i></button>` : `<button class="btn btn-sm btn-success" onclick="changeMemberStatus('${m._id}','active')" title="Activate"><i class="fas fa-check"></i></button>`}
        </td>
      </tr>`).join('') || '<tr><td colspan="8" class="text-center text-muted">No members found</td></tr>';
    } catch (e) { console.error(e); }
  };

  window.verifyMember = async function (id) {
    if (!confirm('Verify this member?')) return;
    try {
      const res = await fetch(API + '/members/' + id + '/verify', { method: 'PUT' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Member verified!', 'success'); loadMembers();
    } catch (e) { showToast(e.message, 'error'); }
  };

  window.changeMemberStatus = async function (id, status) {
    if (!confirm(`Set status to "${status}"?`)) return;
    try {
      const res = await fetch(API + '/members/' + id + '/status', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Status updated', 'success'); loadMembers();
    } catch (e) { showToast(e.message, 'error'); }
  };

  /* ===========================================================
     PAYMENTS
     =========================================================== */
  window.loadPayments = async function () {
    const status = ($('paymentStatusFilter') || {}).value || '';
    const type = ($('paymentTypeFilter') || {}).value || '';
    let url = API + '/payments?';
    if (status) url += 'status=' + status + '&';
    if (type) url += 'type=' + type + '&';
    try {
      const payments = await fetch(url).then(r => r.json());
      const tbody = $('paymentsTable');
      if (!tbody) return;
      tbody.innerHTML = payments.map(p => `<tr>
        <td>${esc(p.member?.fullName || '--')}</td>
        <td>${esc(p.member?.regNumber || '--')}</td>
        <td><span class="badge badge-${p.type === 'registration' ? 'primary' : 'info'}">${p.type}</span></td>
        <td>KSh ${p.amount}</td>
        <td><code>${esc(p.mpesaCode)}</code></td>
        <td><span class="badge badge-${p.status === 'confirmed' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}">${p.status}</span></td>
        <td>${fmtDate(p.createdAt)}</td>
        <td class="actions">${p.status === 'pending' ? `
          <button class="btn btn-sm btn-success" onclick="confirmPayment('${p._id}')"><i class="fas fa-check"></i></button>
          <button class="btn btn-sm btn-danger" onclick="rejectPayment('${p._id}')"><i class="fas fa-times"></i></button>` : '--'}
        </td>
      </tr>`).join('') || '<tr><td colspan="8" class="text-center text-muted">No payments found</td></tr>';
    } catch (e) { console.error(e); }
  };

  window.confirmPayment = async function (id) {
    if (!confirm('Confirm this payment?')) return;
    try {
      const res = await fetch(API + '/payments/' + id + '/confirm', { method: 'PUT' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Payment confirmed!', 'success');
      loadDashboard(); loadPayments();
    } catch (e) { showToast(e.message, 'error'); }
  };

  window.rejectPayment = async function (id) {
    if (!confirm('Reject this payment?')) return;
    try {
      const res = await fetch(API + '/payments/' + id + '/reject', { method: 'PUT' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Payment rejected', 'info');
      loadDashboard(); loadPayments();
    } catch (e) { showToast(e.message, 'error'); }
  };

  /* ===========================================================
     EVENTS
     =========================================================== */
  async function loadEvents() {
    try {
      const events = await fetch(API + '/events').then(r => r.json());
      const tbody = $('eventsTable');
      if (!tbody) return;
      tbody.innerHTML = events.map(ev => `<tr>
        <td>${esc(ev.title)}</td>
        <td>${fmtDateTime(ev.date)}</td>
        <td>${esc(ev.location || 'TBA')}</td>
        <td><span class="badge badge-accent">${ev.category || 'event'}</span></td>
        <td>${(ev.registrations || []).length}${ev.maxParticipants ? ' / ' + ev.maxParticipants : ''}</td>
        <td><span class="badge badge-${ev.status === 'upcoming' ? 'success' : ev.status === 'completed' ? 'secondary' : ev.status === 'cancelled' ? 'danger' : 'info'}">${ev.status}</span></td>
        <td class="actions">
          <button class="btn btn-sm btn-outline" onclick="editEvent('${ev._id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteEvent('${ev._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('') || '<tr><td colspan="7" class="text-center text-muted">No events</td></tr>';
    } catch (e) { console.error(e); }
  }

  window.showEventForm = function () { $('eventFormCard').style.display = 'block'; $('eventFormTitle').textContent = 'Create Event'; $('eventId').value = ''; };
  window.hideEventForm = function () { $('eventFormCard').style.display = 'none'; };

  window.saveEvent = async function (e) {
    e.preventDefault();
    const id = $('eventId').value;
    const body = {
      title: $('eventTitle').value, description: $('eventDesc').value, category: $('eventCategory').value,
      date: $('eventDate').value, location: $('eventLocation').value,
      maxParticipants: parseInt($('eventMaxP').value) || 0
    };
    try {
      const res = await fetch(API + '/events' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast(id ? 'Event updated' : 'Event created', 'success');
      hideEventForm(); loadEvents();
    } catch (er) { showToast(er.message, 'error'); }
  };

  window.editEvent = async function (id) {
    try {
      const ev = await fetch(API + '/events/' + id).then(r => r.json());
      $('eventId').value = ev._id;
      $('eventTitle').value = ev.title;
      $('eventDesc').value = ev.description || '';
      $('eventCategory').value = ev.category || 'workshop';
      $('eventDate').value = ev.date ? new Date(ev.date).toISOString().slice(0, 16) : '';
      $('eventLocation').value = ev.location || '';
      $('eventMaxP').value = ev.maxParticipants || 0;
      $('eventFormTitle').textContent = 'Edit Event';
      $('eventFormCard').style.display = 'block';
    } catch { showToast('Failed to load event', 'error'); }
  };

  window.deleteEvent = async function (id) {
    if (!confirm('Delete this event?')) return;
    try {
      const res = await fetch(API + '/events/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Event deleted', 'success'); loadEvents();
    } catch { showToast('Failed', 'error'); }
  };

  /* ===========================================================
     ATTENDANCE
     =========================================================== */
  async function loadAttendanceSection() {
    /* Populate event dropdowns */
    try {
      const events = await fetch(API + '/events').then(r => r.json());
      const sel = $('attendanceEventSelect');
      const bulkSel = $('bulkAttEvent');
      const opts = '<option value="">Select Event</option>' + events.map(e => `<option value="${e._id}">${esc(e.title)} — ${fmtDate(e.date)}</option>`).join('');
      if (sel) sel.innerHTML = opts;
      if (bulkSel) bulkSel.innerHTML = opts;
    } catch { /* ignore */ }
  }

  window.loadEventAttendance = async function () {
    const eventId = ($('attendanceEventSelect') || {}).value;
    const tbody = $('attendanceTable');
    if (!tbody || !eventId) { if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center">Select an event to view attendance</td></tr>'; return; }
    try {
      const records = await fetch(API + '/attendance/event/' + eventId).then(r => r.json());
      tbody.innerHTML = records.map(r => `<tr>
        <td>${esc(r.member?.fullName || '--')}</td>
        <td>${esc(r.member?.regNumber || '--')}</td>
        <td>${esc(r.member?.department || '--')}</td>
        <td>${fmtDateTime(r.checkInTime)}</td>
        <td><span class="badge badge-info">${r.method}</span></td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteAttendance('${r._id}')"><i class="fas fa-trash"></i></button></td>
      </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted">No attendance records for this event</td></tr>';
    } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Failed to load</td></tr>'; }
  };

  window.showBulkAttendance = async function () {
    $('bulkAttendanceCard').style.display = 'block';
    try {
      const members = await fetch(API + '/members?status=active').then(r => r.json());
      const list = $('attendanceMemberList');
      if (list) {
        list.innerHTML = members.map(m => `<label class="checkbox-item"><input type="checkbox" value="${m._id}"> ${esc(m.fullName)} (${esc(m.regNumber)})</label>`).join('');
      }
    } catch { /* ignore */ }
  };

  window.submitBulkAttendance = async function () {
    const eventId = ($('bulkAttEvent') || {}).value;
    if (!eventId) { showToast('Select an event', 'error'); return; }
    const checked = document.querySelectorAll('#attendanceMemberList input:checked');
    const memberIds = Array.from(checked).map(c => c.value);
    if (!memberIds.length) { showToast('Select at least one member', 'error'); return; }
    try {
      const res = await fetch(API + '/attendance/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, memberIds })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Attendance marked!', 'success');
      $('bulkAttendanceCard').style.display = 'none';
      $('attendanceEventSelect').value = eventId;
      loadEventAttendance();
    } catch (e) { showToast(e.message, 'error'); }
  };

  window.deleteAttendance = async function (id) {
    if (!confirm('Remove this attendance record?')) return;
    try {
      const res = await fetch(API + '/attendance/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Removed', 'success'); loadEventAttendance();
    } catch { showToast('Failed', 'error'); }
  };

  /* ===========================================================
     ELECTIONS
     =========================================================== */
  async function loadElections() {
    try {
      const elections = await fetch(API + '/elections').then(r => r.json());
      const list = $('electionsAdminList');
      if (!list) return;
      if (!elections.length) { list.innerHTML = '<p class="text-muted text-center" style="padding:30px;">No elections yet.</p>'; return; }
      let html = '';
      for (const el of elections) {
        const statusClass = el.status === 'active' ? 'success' : el.status === 'closed' ? 'secondary' : el.status === 'cancelled' ? 'danger' : 'warning';
        html += `<div class="election-admin-card">
          <div class="election-admin-header">
            <h4>${esc(el.title)} <span class="badge badge-${statusClass}">${el.status}</span></h4>
            <div class="election-admin-actions">
              <button class="btn btn-sm btn-outline" onclick="viewResults('${el._id}')" title="View Results"><i class="fas fa-chart-bar"></i></button>
              <button class="btn btn-sm btn-outline" onclick="showAddCandidate('${el._id}')" title="Add Candidate"><i class="fas fa-user-plus"></i></button>
              <button class="btn btn-sm btn-outline" onclick="editElection('${el._id}')" title="Edit"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteElection('${el._id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div class="election-admin-body">
            <div class="meta">
              <span><i class="fas fa-calendar-alt"></i> ${fmtDate(el.startDate)} — ${fmtDate(el.endDate)}</span>
              <span><i class="fas fa-users"></i> ${el.totalVoters || 0} voters</span>
              <span><i class="fas fa-user-tie"></i> ${(el.candidates || []).length} candidates</span>
            </div>
            ${el.description ? '<p style="font-size:.88rem;color:var(--gray-600);margin-bottom:12px;">' + esc(el.description) + '</p>' : ''}
            <p style="margin-bottom:10px;">Positions: ${(el.positions || []).map(p => '<span class="badge badge-info" style="margin-right:4px;">' + esc(p) + '</span>').join('')}</p>
            ${(el.candidates || []).length ? `<div class="candidates-grid">${el.candidates.map(c => `<div class="candidate-mini">
              <div style="flex:1;">
                <strong>${esc(c.member?.fullName || 'Unknown')}</strong>
                <div style="font-size:.8rem;color:var(--gray-500);">${esc(c.position)}</div>
              </div>
              <span class="votes">${c.votes || 0}</span>
              <button class="btn btn-sm btn-ghost" onclick="removeCandidate('${el._id}','${c._id}')" title="Remove"><i class="fas fa-times" style="color:var(--danger);"></i></button>
            </div>`).join('')}</div>` : '<p class="text-muted" style="font-size:.85rem;">No candidates yet.</p>'}
          </div>
        </div>`;
      }
      list.innerHTML = html;
    } catch (e) { console.error(e); }
  }

  window.showElectionForm = function () {
    $('electionFormCard').style.display = 'block';
    $('electionFormTitle').textContent = 'Create Election';
    $('electionId').value = '';
    $('electionTitle').value = '';
    $('electionDesc').value = '';
    $('electionStart').value = '';
    $('electionEnd').value = '';
    $('electionPositions').value = '';
    $('electionStatus').value = 'upcoming';
  };
  window.hideElectionForm = function () { $('electionFormCard').style.display = 'none'; };

  window.saveElection = async function (e) {
    e.preventDefault();
    const id = $('electionId').value;
    const body = {
      title: $('electionTitle').value, description: $('electionDesc').value,
      startDate: $('electionStart').value, endDate: $('electionEnd').value,
      positions: $('electionPositions').value.split(',').map(s => s.trim()).filter(Boolean),
      status: $('electionStatus').value
    };
    try {
      const res = await fetch(API + '/elections' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast(id ? 'Election updated' : 'Election created', 'success');
      hideElectionForm(); loadElections();
    } catch (er) { showToast(er.message, 'error'); }
  };

  window.editElection = async function (id) {
    try {
      const el = await fetch(API + '/elections/' + id).then(r => r.json());
      $('electionId').value = el._id;
      $('electionTitle').value = el.title;
      $('electionDesc').value = el.description || '';
      $('electionStart').value = el.startDate ? new Date(el.startDate).toISOString().slice(0, 16) : '';
      $('electionEnd').value = el.endDate ? new Date(el.endDate).toISOString().slice(0, 16) : '';
      $('electionPositions').value = (el.positions || []).join(', ');
      $('electionStatus').value = el.status || 'upcoming';
      $('electionFormTitle').textContent = 'Edit Election';
      $('electionFormCard').style.display = 'block';
    } catch { showToast('Failed to load election', 'error'); }
  };

  window.deleteElection = async function (id) {
    if (!confirm('Delete this election? This action cannot be undone.')) return;
    try {
      const res = await fetch(API + '/elections/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Election deleted', 'success'); loadElections();
    } catch { showToast('Failed', 'error'); }
  };

  window.removeCandidate = async function (electionId, candidateId) {
    if (!confirm('Remove this candidate?')) return;
    try {
      const res = await fetch(API + '/elections/' + electionId + '/candidates/' + candidateId, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Candidate removed', 'success'); loadElections();
    } catch (er) { showToast(er.message, 'error'); }
  };

  window.viewResults = async function (id) {
    try {
      const res = await fetch(API + '/elections/' + id + '/results');
      const el = await res.json();
      if (!res.ok) throw new Error(el.error);
      const positions = el.positions || [];
      const candidates = el.candidates || [];
      let html = `<div class="results-modal-overlay" onclick="if(event.target===this)this.remove()">
        <div class="results-modal">
          <div class="results-modal-header">
            <h3><i class="fas fa-chart-bar"></i> ${esc(el.title)} — Results</h3>
            <button class="btn btn-ghost" onclick="this.closest('.results-modal-overlay').remove()">&times;</button>
          </div>
          <div class="results-modal-body">
            <div class="meta" style="margin-bottom:16px;">
              <span><i class="fas fa-users"></i> Total Voters: <strong>${el.totalVoters || 0}</strong></span>
              <span class="badge badge-${el.status === 'active' ? 'success' : el.status === 'closed' ? 'secondary' : 'warning'}" style="margin-left:8px;">${el.status}</span>
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
                <span class="text-muted">${esc(c.member?.regNumber || '')}</span>
              </div>
              <div class="results-bar-wrap">
                <div class="results-bar" style="width:${pct}%"></div>
              </div>
              <div class="results-votes">${c.votes} votes (${pct}%)</div>
            </div>`;
          }).join('')}
        </div>`;
      });
      if (el.voterList && el.voterList.length) {
        html += `<details style="margin-top:16px;"><summary style="cursor:pointer;font-weight:600;color:var(--primary);"><i class="fas fa-list"></i> Voter List (${el.voterList.length})</summary>
          <div style="max-height:200px;overflow-y:auto;margin-top:8px;">
            ${el.voterList.map(v => `<div style="padding:4px 0;font-size:.85rem;border-bottom:1px solid var(--gray-200);">${esc(v.fullName)} (${esc(v.regNumber)})</div>`).join('')}
          </div></details>`;
      }
      html += '</div></div></div>';
      document.body.insertAdjacentHTML('beforeend', html);
    } catch (er) { showToast(er.message || 'Failed to load results', 'error'); }
  };

  window.showAddCandidate = async function (electionId) {
    $('candidateFormCard').style.display = 'block';
    $('candidateElectionId').value = electionId;
    try {
      const members = await fetch(API + '/members?status=active').then(r => r.json());
      $('candidateMember').innerHTML = '<option value="">Select member</option>' + members.map(m => `<option value="${m._id}">${esc(m.fullName)} (${esc(m.regNumber)})</option>`).join('');
    } catch { /* ignore */ }
    try {
      const el = await fetch(API + '/elections/' + electionId).then(r => r.json());
      $('candidatePosition').innerHTML = (el.positions || []).map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
    } catch { /* ignore */ }
  };

  window.addCandidate = async function (e) {
    e.preventDefault();
    const elId = $('candidateElectionId').value;
    const body = { memberId: $('candidateMember').value, position: $('candidatePosition').value, manifesto: $('candidateManifesto').value };
    try {
      const res = await fetch(API + '/elections/' + elId + '/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Candidate added!', 'success');
      $('candidateFormCard').style.display = 'none';
      loadElections();
    } catch (er) { showToast(er.message, 'error'); }
  };

  /* ===========================================================
     RESOURCES
     =========================================================== */
  async function loadResources() {
    try {
      const resources = await fetch(API + '/resources').then(r => r.json());
      const tbody = $('resourcesTable');
      if (!tbody) return;
      tbody.innerHTML = resources.map(r => `<tr>
        <td>${esc(r.title)}</td>
        <td><span class="badge badge-info">${esc(r.category)}</span></td>
        <td>${esc(r.department || 'General')}</td>
        <td>${r.downloads || 0}</td>
        <td>${r.isPublic ? '<i class="fas fa-globe" style="color:var(--success)"></i>' : '<i class="fas fa-lock" style="color:var(--muted)"></i>'}</td>
        <td class="actions">
          <button class="btn btn-sm btn-danger" onclick="deleteResource('${r._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted">No resources</td></tr>';
    } catch (e) { console.error(e); }
  }

  window.showResourceForm = function () { $('resourceFormCard').style.display = 'block'; };
  window.hideResourceForm = function () { $('resourceFormCard').style.display = 'none'; };

  window.saveResource = async function (e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', $('resTitle').value);
    formData.append('category', $('resCategory').value);
    formData.append('description', $('resDesc').value);
    formData.append('department', $('resDept').value);
    formData.append('yearOfStudy', $('resYear').value);
    formData.append('isPublic', $('resPublic').checked);
    const link = $('resLink').value;
    if (link) formData.append('externalLink', link);
    const file = $('resFile').files[0];
    if (file) formData.append('file', file);
    try {
      const res = await fetch(API + '/resources', { method: 'POST', body: formData });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Resource uploaded!', 'success');
      hideResourceForm(); loadResources();
    } catch (er) { showToast(er.message, 'error'); }
  };

  window.deleteResource = async function (id) {
    if (!confirm('Delete this resource?')) return;
    try {
      const res = await fetch(API + '/resources/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Deleted', 'success'); loadResources();
    } catch { showToast('Failed', 'error'); }
  };

  /* ===========================================================
     ANNOUNCEMENTS
     =========================================================== */
  async function loadAnnouncements() {
    try {
      const anns = await fetch(API + '/announcements').then(r => r.json());
      const tbody = $('announcementsTable');
      if (!tbody) return;
      tbody.innerHTML = anns.map(a => `<tr>
        <td>${esc(a.title)}</td>
        <td><span class="badge badge-${a.priority === 'urgent' ? 'danger' : a.priority === 'high' ? 'warning' : 'secondary'}">${a.priority}</span></td>
        <td>${a.targetAudience || 'all'}</td>
        <td>${a.isPinned ? '<i class="fas fa-thumbtack" style="color:var(--accent)"></i>' : ''}</td>
        <td>${fmtDate(a.createdAt)}</td>
        <td class="actions">
          <button class="btn btn-sm btn-outline" onclick="editAnnouncement('${a._id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement('${a._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted">No announcements</td></tr>';
    } catch (e) { console.error(e); }
  }

  window.showAnnouncementForm = function () { $('announcementFormCard').style.display = 'block'; $('annFormTitle').textContent = 'Create Announcement'; $('annId').value = ''; };
  window.hideAnnouncementForm = function () { $('announcementFormCard').style.display = 'none'; };

  window.saveAnnouncement = async function (e) {
    e.preventDefault();
    const id = $('annId').value;
    const body = { title: $('annTitle').value, content: $('annContent').value, priority: $('annPriority').value, targetAudience: $('annTarget').value, isPinned: $('annPinned').checked };
    try {
      const res = await fetch(API + '/announcements' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast(id ? 'Updated' : 'Created', 'success');
      hideAnnouncementForm(); loadAnnouncements();
    } catch (er) { showToast(er.message, 'error'); }
  };

  window.editAnnouncement = async function (id) {
    try {
      const a = await fetch(API + '/announcements/' + id).then(r => r.json());
      $('annId').value = a._id;
      $('annTitle').value = a.title;
      $('annContent').value = a.content || '';
      $('annPriority').value = a.priority || 'normal';
      $('annTarget').value = a.targetAudience || 'all';
      $('annPinned').checked = a.isPinned || false;
      $('annFormTitle').textContent = 'Edit Announcement';
      $('announcementFormCard').style.display = 'block';
    } catch { showToast('Failed to load', 'error'); }
  };

  window.deleteAnnouncement = async function (id) {
    if (!confirm('Delete this announcement?')) return;
    try {
      const res = await fetch(API + '/announcements/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Deleted', 'success'); loadAnnouncements();
    } catch { showToast('Failed', 'error'); }
  };

  /* ===========================================================
     PROJECTS
     =========================================================== */
  async function loadProjects() {
    try {
      const projects = await fetch(API + '/projects').then(r => r.json());
      const tbody = $('projectsTable');
      if (!tbody) return;
      tbody.innerHTML = projects.map(p => `<tr>
        <td>${esc(p.title)}</td>
        <td>${esc(p.category || '--')}</td>
        <td><span class="badge badge-${p.status === 'completed' ? 'success' : p.status === 'in-progress' ? 'info' : p.status === 'on-hold' ? 'warning' : 'secondary'}">${p.status}</span></td>
        <td>${esc(p.teamLead || '--')}</td>
        <td>${fmtDate(p.startDate)}</td>
        <td class="actions">
          <button class="btn btn-sm btn-outline" onclick="editProject('${p._id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteProject('${p._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted">No projects</td></tr>';
    } catch (e) { console.error(e); }
  }

  window.showProjectForm = function () { $('projectFormCard').style.display = 'block'; $('projFormTitle').textContent = 'Create Project'; $('projId').value = ''; };
  window.hideProjectForm = function () { $('projectFormCard').style.display = 'none'; };

  window.saveProject = async function (e) {
    e.preventDefault();
    const id = $('projId').value;
    const body = {
      title: $('projTitle').value, description: $('projDesc').value, category: $('projCategory').value,
      teamLead: $('projLead').value, status: $('projStatus').value,
      startDate: $('projStart').value || undefined, endDate: $('projEnd').value || undefined
    };
    try {
      const res = await fetch(API + '/projects' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast(id ? 'Project updated' : 'Project created', 'success');
      hideProjectForm(); loadProjects();
    } catch (er) { showToast(er.message, 'error'); }
  };

  window.editProject = async function (id) {
    try {
      const p = await fetch(API + '/projects/' + id).then(r => r.json());
      $('projId').value = p._id;
      $('projTitle').value = p.title;
      $('projDesc').value = p.description || '';
      $('projCategory').value = p.category || '';
      $('projLead').value = p.teamLead || '';
      $('projStatus').value = p.status || 'planning';
      $('projStart').value = p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : '';
      $('projEnd').value = p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : '';
      $('projFormTitle').textContent = 'Edit Project';
      $('projectFormCard').style.display = 'block';
    } catch { showToast('Failed to load', 'error'); }
  };

  window.deleteProject = async function (id) {
    if (!confirm('Delete this project?')) return;
    try {
      const res = await fetch(API + '/projects/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Deleted', 'success'); loadProjects();
    } catch { showToast('Failed', 'error'); }
  };

  /* ===========================================================
     SPONSORS
     =========================================================== */
  async function loadSponsors() {
    try {
      const sponsors = await fetch(API + '/sponsors/all').then(r => r.json());
      const tbody = $('sponsorsTable');
      if (!tbody) return;
      tbody.innerHTML = sponsors.map(s => `<tr>
        <td>${s.logo ? `<img src="${esc(s.logo)}" style="height:30px;width:auto;border-radius:4px;">` : '--'} ${esc(s.name)}</td>
        <td><span class="badge badge-accent">${esc(s.tier)}</span></td>
        <td>${s.website ? `<a href="${esc(s.website)}" target="_blank" rel="noopener noreferrer">Visit</a>` : '--'}</td>
        <td>${s.isActive ? '<i class="fas fa-check-circle" style="color:var(--success)"></i>' : '<i class="fas fa-times-circle" style="color:var(--danger)"></i>'}</td>
        <td class="actions">
          <button class="btn btn-sm btn-outline" onclick="editSponsor('${s._id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteSponsor('${s._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('') || '<tr><td colspan="5" class="text-center text-muted">No sponsors</td></tr>';
    } catch (e) { console.error(e); }
  }

  window.showSponsorForm = function () { $('sponsorFormCard').style.display = 'block'; $('sponsorId').value = ''; };
  window.hideSponsorForm = function () { $('sponsorFormCard').style.display = 'none'; };

  window.saveSponsor = async function (e) {
    e.preventDefault();
    const id = $('sponsorId').value;
    const formData = new FormData();
    formData.append('name', $('sponsorName').value);
    formData.append('tier', $('sponsorTier').value);
    formData.append('description', $('sponsorDesc').value);
    formData.append('website', $('sponsorWebsite').value);
    formData.append('isActive', $('sponsorActive').checked);
    const logo = $('sponsorLogo').files[0];
    if (logo) formData.append('logo', logo);
    try {
      const res = await fetch(API + '/sponsors' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: formData });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast(id ? 'Sponsor updated' : 'Sponsor added', 'success');
      hideSponsorForm(); loadSponsors();
    } catch (er) { showToast(er.message, 'error'); }
  };

  window.editSponsor = async function (id) {
    try {
      const s = await fetch(API + '/sponsors/all').then(r => r.json()).then(arr => arr.find(x => x._id === id));
      if (!s) throw new Error('Not found');
      $('sponsorId').value = s._id;
      $('sponsorName').value = s.name;
      $('sponsorTier').value = s.tier;
      $('sponsorDesc').value = s.description || '';
      $('sponsorWebsite').value = s.website || '';
      $('sponsorActive').checked = s.isActive !== false;
      $('sponsorFormCard').style.display = 'block';
    } catch { showToast('Failed to load', 'error'); }
  };

  window.deleteSponsor = async function (id) {
    if (!confirm('Delete this sponsor?')) return;
    try {
      const res = await fetch(API + '/sponsors/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Deleted', 'success'); loadSponsors();
    } catch { showToast('Failed', 'error'); }
  };

  /* ===========================================================
     CLUBS MANAGEMENT
     =========================================================== */
  async function loadAdminClubs() {
    const tbody = $('clubsTable');
    if (!tbody) return;
    try {
      const res = await fetch(API + '/clubs');
      if (!res.ok) throw new Error();
      const clubs = await res.json();
      if (!clubs.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No clubs yet</td></tr>'; return; }
      tbody.innerHTML = clubs.map(c => `<tr>
        <td>${esc(c.name)}</td>
        <td><span class="badge badge-accent">${esc(c.category || 'General')}</span></td>
        <td>${esc(c.chairperson?.fullName || 'TBA')}</td>
        <td>${c.memberCount || 0}</td>
        <td><span class="badge badge-${c.status === 'active' ? 'success' : 'secondary'}">${c.status || 'active'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editClub('${c._id}','${esc(c.name)}','${esc(c.category||'')}','${esc(c.description||'')}','${c.chairperson?._id||''}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="deleteClub('${c._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('');
    } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Failed to load</td></tr>'; }
  }

  window.showClubForm = function () { $('clubFormCard').style.display = ''; $('clubFormTitle').textContent = 'Create Club'; $('clubId').value = ''; };
  window.hideClubForm = function () { $('clubFormCard').style.display = 'none'; };

  window.editClub = function (id, name, cat, desc, chairId) {
    $('clubId').value = id; $('clubName').value = name; $('clubCategory').value = cat;
    $('clubDesc').value = desc; $('clubChair').value = chairId;
    $('clubFormTitle').textContent = 'Edit Club'; $('clubFormCard').style.display = '';
  };

  window.saveClub = async function (e) {
    e.preventDefault();
    const id = $('clubId').value;
    const body = { name: $('clubName').value, category: $('clubCategory').value, description: $('clubDesc').value, chairpersonId: $('clubChair').value };
    try {
      const res = await fetch(API + '/clubs' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(id ? 'Club updated!' : 'Club created!', 'success');
      hideClubForm(); loadAdminClubs();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.deleteClub = async function (id) {
    if (!confirm('Delete this club?')) return;
    try {
      const res = await fetch(API + '/clubs/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Club deleted', 'success'); loadAdminClubs();
    } catch { showToast('Failed', 'error'); }
  };

  /* ===========================================================
     FORUM MODERATION
     =========================================================== */
  async function loadAdminForum() {
    const tbody = $('forumAdminTable');
    if (!tbody) return;
    const filter = $('forumAdminFilter')?.value || '';
    const search = $('forumAdminSearch')?.value || '';
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filter === 'pinned') params.append('pinned', '1');
      if (filter === 'locked') params.append('locked', '1');
      params.append('limit', '50');
      const res = await fetch(API + '/forum?' + params);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const topics = data.topics || [];
      if (!topics.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No topics</td></tr>'; return; }
      tbody.innerHTML = topics.map(t => {
        let status = [];
        if (t.isPinned) status.push('<span class="badge badge-accent">Pinned</span>');
        if (t.isLocked) status.push('<span class="badge badge-error">Locked</span>');
        if (!status.length) status.push('<span class="badge badge-success">Open</span>');
        return `<tr>
          <td>${esc(t.title)}</td>
          <td>${esc(t.author?.fullName || 'Unknown')}</td>
          <td><span class="badge badge-outline">${esc(t.category)}</span></td>
          <td>${t.replyCount || 0}</td>
          <td>${t.views || 0}</td>
          <td>${status.join(' ')}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="togglePinTopic('${t._id}', ${!t.isPinned})" title="${t.isPinned ? 'Unpin' : 'Pin'}"><i class="fas fa-thumbtack"></i></button>
            <button class="btn btn-sm btn-outline" onclick="toggleLockTopic('${t._id}', ${!t.isLocked})" title="${t.isLocked ? 'Unlock' : 'Lock'}"><i class="fas fa-${t.isLocked ? 'unlock' : 'lock'}"></i></button>
            <button class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="deleteForumTopic('${t._id}')"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
      }).join('');
    } catch { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Failed to load</td></tr>'; }
  }

  window.togglePinTopic = async function (id, pin) {
    try {
      const res = await fetch(API + '/forum/' + id + '/pin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
      if (!res.ok) throw new Error();
      showToast(pin ? 'Topic pinned' : 'Topic unpinned', 'success'); loadAdminForum();
    } catch { showToast('Failed', 'error'); }
  };

  window.toggleLockTopic = async function (id, lock) {
    try {
      const res = await fetch(API + '/forum/' + id + '/lock', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lock }) });
      if (!res.ok) throw new Error();
      showToast(lock ? 'Topic locked' : 'Topic unlocked', 'success'); loadAdminForum();
    } catch { showToast('Failed', 'error'); }
  };

  window.deleteForumTopic = async function (id) {
    if (!confirm('Delete this topic?')) return;
    try {
      const res = await fetch(API + '/forum/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Topic deleted', 'success'); loadAdminForum();
    } catch { showToast('Failed', 'error'); }
  };

  /* ===========================================================
     POLLS MANAGEMENT
     =========================================================== */
  async function loadAdminPolls() {
    const tbody = $('pollsAdminTable');
    if (!tbody) return;
    try {
      const res = await fetch(API + '/polls');
      const polls = await res.json();
      if (!res.ok) throw new Error();
      if (!polls.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No polls yet</td></tr>'; return; }
      tbody.innerHTML = polls.map(p => `<tr>
        <td>${esc(p.title)}</td>
        <td><span class="badge badge-${p.status === 'active' ? 'success' : 'info'}">${p.status}</span></td>
        <td>${p.voterCount || 0}</td>
        <td>${p.endsAt ? fmtDateTime(p.endsAt) : 'No end date'}</td>
        <td>
          ${p.status === 'active' ? `<button class="btn btn-sm btn-outline" onclick="closePoll('${p._id}')"><i class="fas fa-stop"></i> Close</button>` : ''}
          <button class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="deletePoll('${p._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('');
    } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Failed to load</td></tr>'; }
  }

  window.showPollForm = function () { $('pollFormCard').style.display = ''; };

  window.addPollOption = function () {
    const c = $('pollOptionsContainer');
    const count = c.querySelectorAll('.poll-option-input').length + 1;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'poll-option-input'; inp.placeholder = 'Option ' + count; inp.required = true;
    inp.style.marginTop = '6px';
    c.appendChild(inp);
  };

  window.savePoll = async function (e) {
    e.preventDefault();
    const options = Array.from(document.querySelectorAll('.poll-option-input')).map(i => i.value.trim()).filter(Boolean);
    if (options.length < 2) { showToast('At least 2 options required', 'error'); return; }
    try {
      const body = {
        title: $('pollTitle').value,
        description: $('pollDescription').value,
        options,
        allowMultiple: $('pollMultiple')?.checked || false,
        isAnonymous: $('pollAnonymous')?.checked || false
      };
      const endsAt = $('pollEndsAt')?.value;
      if (endsAt) body.endsAt = endsAt;
      const res = await fetch(API + '/polls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Poll created!', 'success');
      $('pollFormCard').style.display = 'none';
      $('pollTitle').value = ''; $('pollDescription').value = '';
      $('pollOptionsContainer').innerHTML = '<input type="text" class="poll-option-input" placeholder="Option 1" required><input type="text" class="poll-option-input" placeholder="Option 2" required>';
      loadAdminPolls();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.closePoll = async function (id) {
    if (!confirm('Close this poll?')) return;
    try {
      const res = await fetch(API + '/polls/' + id + '/close', { method: 'PATCH' });
      if (!res.ok) throw new Error();
      showToast('Poll closed', 'success'); loadAdminPolls();
    } catch { showToast('Failed', 'error'); }
  };

  window.deletePoll = async function (id) {
    if (!confirm('Delete this poll?')) return;
    try {
      const res = await fetch(API + '/polls/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Poll deleted', 'success'); loadAdminPolls();
    } catch { showToast('Failed', 'error'); }
  };

  /* ===========================================================
     NOTIFICATIONS BROADCAST
     =========================================================== */
  window.showBroadcastForm = function () { $('broadcastFormCard').style.display = ''; };

  window.sendBroadcast = async function (e) {
    e.preventDefault();
    try {
      const res = await fetch(API + '/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: $('broadcastTitle').value,
          message: $('broadcastMessage').value,
          type: $('broadcastType').value,
          link: $('broadcastLink').value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Notification sent to all members!', 'success');
      $('broadcastFormCard').style.display = 'none';
      $('broadcastTitle').value = ''; $('broadcastMessage').value = ''; $('broadcastLink').value = '';
    } catch (err) { showToast(err.message, 'error'); }
  };

})();
