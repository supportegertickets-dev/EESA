/* ============================================================
   EESA — Landing Page JavaScript
   ============================================================ */
(function () {
  'use strict';

  /* --- Helpers --- */
  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function $(id) { return document.getElementById(id); }
  function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }); }

  /* --- Navbar scroll + top-bar awareness --- */
  const navbar = $('navbar');
  if (navbar) {
    const hasTopbar = document.querySelector('.top-info-bar') || document.querySelector('.top-bar');
    if (hasTopbar) navbar.classList.add('has-topbar');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
      /* Back to top button */
      const btt = $('backToTop');
      if (btt) btt.classList.toggle('visible', window.scrollY > 400);
    });
  }

  /* --- Mobile nav toggle --- */
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = $('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
  }

  /* --- Load all public data --- */
  loadPublicData();

  async function loadPublicData() {
    try {
      const [events, projects, announcements, sponsors] = await Promise.all([
        fetch('/api/events').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/announcements').then(r => r.json()),
        fetch('/api/sponsors').then(r => r.json()).catch(() => [])
      ]);

      renderProjects(projects);
      renderNewsEvents(events, announcements);
      renderSponsors(sponsors);
      animateStats({
        statMembers: '100+',
        statProjects: projects.length || 0,
        statEvents: events.length || 0,
        statSponsors: sponsors.length || 0
      });
    } catch (e) { console.error('Failed to load public data:', e); }
  }

  /* --- Stat Animation --- */
  function animateStats(data) {
    Object.entries(data).forEach(([id, val]) => {
      const el = $(id);
      if (!el) return;
      if (typeof val === 'string') { el.textContent = val; return; }
      let current = 0;
      const step = Math.max(1, Math.ceil(val / 30));
      const timer = setInterval(() => {
        current += step;
        if (current >= val) { current = val; clearInterval(timer); }
        el.textContent = current;
      }, 40);
    });
  }

  /* --- Projects with Filter --- */
  let allProjects = [];
  function renderProjects(projects) {
    allProjects = projects || [];
    const grid = $('projectsGrid');
    if (!grid) return;
    displayProjects('all');
  }

  function displayProjects(filter) {
    const grid = $('projectsGrid');
    const filtered = filter === 'all' ? allProjects : allProjects.filter(p => p.status === filter);
    if (!filtered.length) {
      grid.innerHTML = '<div class="text-center text-muted" style="grid-column:1/-1;padding:40px;"><i class="fas fa-folder-open"></i><p>No projects found.</p></div>';
      return;
    }
    grid.innerHTML = filtered.map(p => `<div class="project-card">
      <h3>${esc(p.title)}</h3>
      <p>${esc((p.description || '').slice(0, 150))}</p>
      <div class="project-meta">
        <span><i class="fas fa-tag"></i> ${esc(p.department || p.category || 'General')}</span>
        <span><i class="fas fa-users"></i> ${(p.members || []).length} members</span>
        <span class="badge badge-${p.status === 'completed' ? 'success' : p.status === 'in-progress' ? 'info' : 'secondary'}">${p.status || 'planning'}</span>
      </div>
    </div>`).join('');
  }

  /* Project filter buttons */
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      displayProjects(this.dataset.filter);
    });
  });

  /* --- News & Events --- */
  function renderNewsEvents(events, announcements) {
    /* Events list */
    const eventsList = $('eventsList');
    if (eventsList) {
      const upcoming = (events || []).filter(e => e.status === 'upcoming' || e.status === 'ongoing').slice(0, 5);
      if (!upcoming.length) {
        eventsList.innerHTML = '<p class="text-muted" style="padding:12px;">No upcoming events.</p>';
      } else {
        eventsList.innerHTML = upcoming.map(ev => `<div class="event-mini-card">
          <div class="event-mini-icon"><i class="fas fa-calendar-day"></i></div>
          <div class="event-mini-info">
            <h4>${esc(ev.title)}</h4>
            <p><i class="fas fa-clock"></i> ${fmtDate(ev.date)} &bull; <i class="fas fa-map-marker-alt"></i> ${esc(ev.location || 'TBA')}</p>
          </div>
        </div>`).join('');
      }
    }

    /* News / announcements list */
    const newsList = $('newsList');
    if (newsList) {
      const news = (announcements || []).slice(0, 5);
      if (!news.length) {
        newsList.innerHTML = '<p class="text-muted" style="padding:12px;">No news yet.</p>';
      } else {
        newsList.innerHTML = news.map(a => {
          const d = new Date(a.createdAt);
          return `<div class="news-item">
            <div class="news-date"><span class="day">${d.getDate()}</span><span class="month">${d.toLocaleString('en', { month: 'short' })}</span></div>
            <div class="news-content">
              <h4>${esc(a.title)}</h4>
              <p>${esc((a.content || '').slice(0, 120))}</p>
            </div>
          </div>`;
        }).join('');
      }
    }
  }

  /* --- Sponsors --- */
  function renderSponsors(sponsors) {
    const showcase = $('sponsorsShowcase');
    if (!showcase) return;
    if (!sponsors || !sponsors.length) {
      showcase.innerHTML = '<p class="text-muted">Become our first partner! <a href="mailto:eesa@egerton.ac.ke?subject=Partnership">Contact us</a></p>';
      return;
    }
    const tiers = ['platinum', 'gold', 'silver', 'bronze', 'partner'];
    let html = '';
    tiers.forEach(tier => {
      const tierSponsors = sponsors.filter(s => s.tier === tier);
      if (!tierSponsors.length) return;
      html += `<div class="sponsors-tier ${tier}">
        <h4>${tier.charAt(0).toUpperCase() + tier.slice(1)} Partners</h4>
        <div class="sponsors-logos">
          ${tierSponsors.map(s => `<div class="sponsor-logo">
            ${s.logo ? `<img src="${esc(s.logo)}" alt="${esc(s.name)}">` : `<i class="fas fa-building" style="font-size:2rem;color:var(--gray-400);"></i>`}
            <span class="sponsor-name">${esc(s.name)}</span>
          </div>`).join('')}
        </div>
      </div>`;
    });
    showcase.innerHTML = html;
  }

  /* --- Auth Modal --- */
  window.showAuthModal = function (tab) {
    const modal = $('authModal');
    if (!modal) return;
    modal.style.display = 'flex';
    switchAuthTab(tab || 'login');
  };

  window.hideAuthModal = function () {
    const modal = $('authModal');
    if (modal) modal.style.display = 'none';
  };

  window.switchAuthTab = function (tab) {
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.auth-form').forEach(f => {
      f.style.display = f.id === (tab === 'login' ? 'loginForm' : 'registerForm') ? 'block' : 'none';
    });
    /* Clear errors */
    const le = $('loginError'), re = $('registerError'), rs = $('registerSuccess');
    if (le) le.textContent = '';
    if (re) re.textContent = '';
    if (rs) { rs.textContent = ''; rs.style.display = 'none'; }
  };

  /* Close on background click */
  const authModal = $('authModal');
  if (authModal) {
    authModal.addEventListener('click', function (e) { if (e.target === this) hideAuthModal(); });
  }

  /* --- Login --- */
  window.handleLogin = async function (e) {
    e.preventDefault();
    const form = e.target;
    const errEl = $('loginError');
    if (errEl) errEl.textContent = '';
    try {
      const res = await fetch('/api/auth/member/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.value,
          password: form.password.value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      window.location.href = '/portal';
    } catch (err) {
      if (errEl) errEl.textContent = err.message;
    }
  };

  /* --- Register --- */
  window.handleRegister = async function (e) {
    e.preventDefault();
    const form = e.target;
    const errEl = $('registerError');
    const sucEl = $('registerSuccess');
    if (errEl) errEl.textContent = '';
    if (sucEl) { sucEl.textContent = ''; sucEl.style.display = 'none'; }
    const body = {};
    new FormData(form).forEach((v, k) => { body[k] = k === 'yearOfStudy' ? parseInt(v) : v; });
    try {
      const res = await fetch('/api/auth/member/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      if (sucEl) {
        sucEl.innerHTML = '<i class="fas fa-check-circle"></i> Account created! You can now <a href="#" onclick="switchAuthTab(\'login\');return false;">sign in</a> and pay your registration fee.';
        sucEl.style.display = 'block';
      }
      form.reset();
    } catch (err) {
      if (errEl) errEl.textContent = err.message;
    }
  };

  /* --- Scroll Reveal (IntersectionObserver) --- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => revealObs.observe(el));
  } else {
    /* Fallback: reveal everything immediately */
    revealEls.forEach(el => el.classList.add('revealed'));
  }

  /* --- Smooth scroll for anchor links --- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

})();
