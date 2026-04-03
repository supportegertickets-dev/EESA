/* ============================================================
   EESA — Lecturer Portal JavaScript
   ============================================================ */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function fmtDateTime(d) { return new Date(d).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function showToast(msg, type) { const t = $('toast'); if (!t) return; t.textContent = msg; t.className = 'toast ' + (type || 'info') + ' show'; setTimeout(() => t.classList.remove('show'), 3000); }

  let lecturer = null;
  let _units = [];

  /* Auth check */
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/lecturer/me');
      if (res.ok) { lecturer = await res.json(); initPortal(); }
    } catch { /* show login */ }
  }
  checkAuth();

  function initPortal() {
    if (!lecturer) return;
    const sl = $('sec-login'); if (sl) sl.classList.remove('active');
    const sd = $('sec-dashboard'); if (sd) sd.classList.add('active');
    document.querySelector('.sidebar').style.pointerEvents = '';
    $('userName').textContent = (lecturer.title || '') + ' ' + lecturer.fullName;
    $('topbarGreeting').textContent = 'Welcome, ' + (lecturer.title || '') + ' ' + (lecturer.fullName || '').split(' ')[0] + '!';
    loadDashboard();
  }

  /* Login / Register */
  window.lecturerLogin = async function (e) {
    e.preventDefault();
    const msg = $('loginMsg');
    try {
      const res = await fetch('/api/auth/lecturer/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      lecturer = data;
      initPortal();
    } catch (err) { if (msg) { msg.textContent = err.message; msg.className = 'form-msg error'; } }
  };

  window.lecturerRegister = async function (e) {
    e.preventDefault();
    const msg = $('regMsg');
    try {
      const res = await fetch('/api/auth/lecturer/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: $('regName').value, staffId: $('regStaffId').value,
          email: $('regEmail').value, phone: $('regPhone').value,
          department: $('regDept').value, title: $('regTitle').value,
          password: $('regPassword').value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      showToast('Registered! Please login.', 'success');
      $('registerForm').style.display = 'none';
    } catch (err) { if (msg) { msg.textContent = err.message; msg.className = 'form-msg error'; } }
  };

  window.toggleRegister = function () {
    const f = $('registerForm');
    f.style.display = f.style.display === 'none' ? '' : 'none';
  };

  window.logout = async function () {
    await fetch('/api/auth/lecturer/logout', { method: 'POST' });
    window.location.href = '/';
  };

  /* Sidebar navigation */
  window.showSection = function (section) {
    if (!lecturer && section !== 'login') return;
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
    const sec = $('sec-' + section);
    if (sec) sec.classList.add('active');
    const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (nav) nav.classList.add('active');
    const titles = { dashboard: 'Dashboard', units: 'My Units', attendance: 'Attendance', assignments: 'Assignments' };
    $('pageTitle').textContent = titles[section] || section;
    const loaders = { dashboard: loadDashboard, units: loadUnitsSection, attendance: loadAttendanceSection, assignments: loadAssignmentsSection };
    if (loaders[section]) loaders[section]();
    const sb = $('sidebar');
    if (sb) sb.classList.remove('open');
  };

  window.toggleSidebar = function () {
    const sb = $('sidebar');
    if (sb) sb.classList.toggle('open');
  };

  /* Dashboard */
  async function loadDashboard() {
    try {
      const res = await fetch('/api/units');
      if (!res.ok) return;
      _units = await res.json();
      $('dashUnits').textContent = _units.length;
      $('dashStudents').textContent = _units.reduce((sum, u) => sum + (u.students?.length || 0), 0);
      let total = 0;
      for (const u of _units) {
        const r = await fetch('/api/units/' + u._id + '/assignments');
        if (r.ok) { const a = await r.json(); total += a.length; }
      }
      $('dashAssignments').textContent = total;
    } catch { /* ignore */ }
  }

  /* Units Section */
  async function loadUnitsSection() {
    const container = $('lecUnitsContainer');
    if (!container) return;
    try {
      const res = await fetch('/api/units');
      if (!res.ok) throw new Error('Failed');
      _units = await res.json();
      if (!_units.length) { container.innerHTML = '<p class="text-muted text-center" style="padding:30px;">No units yet. Create one above.</p>'; return; }
      container.innerHTML = `<div class="units-grid">${_units.map(u => `<div class="unit-card">
        <div class="unit-card-header"><span class="unit-code">${esc(u.code)}</span></div>
        <h4>${esc(u.name)}</h4>
        <div class="unit-card-meta">
          <span><i class="fas fa-building"></i> ${esc(u.department || '')}</span>
          <span>Year ${u.yearOfStudy || '?'} &bull; Sem ${u.semester || '?'}</span>
          <span><i class="fas fa-users"></i> ${u.students?.length || 0} students</span>
        </div>
      </div>`).join('')}</div>`;
      populateUnitSelects();
    } catch { container.innerHTML = '<p class="text-muted">Failed to load.</p>'; }
  }

  function populateUnitSelects() {
    ['attUnit', 'asnUnit'].forEach(id => {
      const sel = $(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Select Unit...</option>' + _units.map(u => `<option value="${u._id}">${esc(u.code)} — ${esc(u.name)}</option>`).join('');
    });
  }

  window.createUnit = async function (e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/units', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: $('uCode').value, name: $('uName').value, department: $('uDept').value, yearOfStudy: $('uYear').value, semester: $('uSem').value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Unit created!', 'success');
      e.target.reset();
      loadUnitsSection();
    } catch (err) { showToast(err.message, 'error'); }
  };

  /* Attendance */
  async function loadAttendanceSection() {
    populateUnitSelects();
    $('attDate').value = new Date().toISOString().slice(0, 10);
    if (_units.length) await loadAttendanceHistory(_units[0]._id);
  }

  window.loadUnitStudents = async function () {
    const unitId = $('attUnit').value;
    const list = $('attStudentList');
    if (!unitId || !list) { if (list) list.innerHTML = ''; return; }
    try {
      const res = await fetch('/api/units/' + unitId);
      if (!res.ok) return;
      const unit = await res.json();
      const students = unit.students || [];
      if (!students.length) { list.innerHTML = '<p class="text-muted">No students enrolled in this unit.</p>'; return; }
      list.innerHTML = '<p style="font-weight:600;margin-bottom:8px;">Mark present students:</p>' +
        students.map(s => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:.9rem;">
          <input type="checkbox" name="presentStudent" value="${s._id}" checked> ${esc(s.fullName)} (${esc(s.regNumber)})
        </label>`).join('');
    } catch { /* ignore */ }
  };

  window.recordAttendance = async function (e) {
    e.preventDefault();
    const unitId = $('attUnit').value;
    if (!unitId) { showToast('Select a unit', 'error'); return; }
    const checked = document.querySelectorAll('input[name="presentStudent"]:checked');
    const presentStudentIds = Array.from(checked).map(c => c.value);
    try {
      const res = await fetch('/api/units/' + unitId + '/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: $('attDate').value, topic: $('attTopic').value, presentStudentIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Attendance recorded!', 'success');
      loadAttendanceHistory(unitId);
    } catch (err) { showToast(err.message, 'error'); }
  };

  async function loadAttendanceHistory(unitId) {
    const container = $('attHistoryContainer');
    if (!container) return;
    try {
      const res = await fetch('/api/units/' + unitId + '/attendance');
      if (!res.ok) return;
      const sessions = await res.json();
      if (!sessions.length) { container.innerHTML = '<p class="text-muted">No attendance sessions yet.</p>'; return; }
      container.innerHTML = '<h4 style="margin-bottom:12px;">Attendance History</h4>' +
        sessions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => `<div class="att-row att-present" style="background:var(--white);box-shadow:var(--shadow);margin-bottom:6px;">
          <span style="font-weight:600;">${fmtDate(s.date)}</span>
          <span>${esc(s.topic || 'No topic')}</span>
          <span class="badge badge-info">${(s.present || []).length} present</span>
        </div>`).join('');
    } catch { /* ignore */ }
  }

  /* Assignments */
  async function loadAssignmentsSection() {
    populateUnitSelects();
    const container = $('asnContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    try {
      let all = [];
      for (const u of _units) {
        const res = await fetch('/api/units/' + u._id + '/assignments');
        if (res.ok) {
          const asns = await res.json();
          all = all.concat(asns.map(a => ({ ...a, unitCode: u.code, unitName: u.name })));
        }
      }
      if (!all.length) { container.innerHTML = '<p class="text-muted text-center" style="padding:30px;">No assignments yet.</p>'; return; }
      container.innerHTML = all.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)).map(a => `<div class="assignment-card">
        <div class="assignment-header">
          <strong>${esc(a.title)}</strong>
          <span class="badge badge-accent">${esc(a.unitCode)}</span>
        </div>
        <p>${esc(a.description || '')}</p>
        <p class="text-muted">Due: ${fmtDateTime(a.dueDate)} &bull; ${a.submissions?.length || a.submissionCount || 0} submissions</p>
      </div>`).join('');
    } catch { container.innerHTML = '<p class="text-muted">Failed to load assignments.</p>'; }
  }

  window.createAssignment = async function (e) {
    e.preventDefault();
    const unitId = $('asnUnit').value;
    if (!unitId) { showToast('Select a unit', 'error'); return; }
    try {
      const res = await fetch('/api/units/' + unitId + '/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: $('asnTitle').value, description: $('asnDesc').value, dueDate: $('asnDue').value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Assignment created!', 'success');
      e.target.reset();
      loadAssignmentsSection();
    } catch (err) { showToast(err.message, 'error'); }
  };

})();
