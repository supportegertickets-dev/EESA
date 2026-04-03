import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Nav configs per role ───────────────────────── */
const MEMBER_NAV = [
  { icon: 'fa-tachometer-alt', label: 'Dashboard', path: '/portal' },
  { icon: 'fa-id-card', label: 'Membership & Payments', path: '/portal/membership' },
  { icon: 'fa-calendar-alt', label: 'Events', path: '/portal/events' },
  { icon: 'fa-bullhorn', label: 'Announcements', path: '/portal/announcements' },
  { icon: 'fa-book', label: 'Resource Library', path: '/portal/resources' },
  { icon: 'fa-vote-yea', label: 'Elections & Voting', path: '/portal/elections' },
  { icon: 'fa-user-edit', label: 'My Profile', path: '/portal/profile' },
];

const ADMIN_NAV = [
  { icon: 'fa-tachometer-alt', label: 'Dashboard', path: '/admin' },
  { icon: 'fa-users', label: 'Members', path: '/admin/members' },
  { icon: 'fa-money-bill-wave', label: 'Payments', path: '/admin/payments' },
  { icon: 'fa-calendar-alt', label: 'Events', path: '/admin/events' },
  { icon: 'fa-clipboard-check', label: 'Attendance', path: '/admin/attendance' },
  { icon: 'fa-bullhorn', label: 'Announcements', path: '/admin/announcements' },
  { icon: 'fa-vote-yea', label: 'Elections', path: '/admin/elections' },
  { icon: 'fa-book', label: 'Resources', path: '/admin/resources' },
  { icon: 'fa-project-diagram', label: 'Projects', path: '/admin/projects' },
  { icon: 'fa-handshake', label: 'Sponsors', path: '/admin/sponsors' },
];

const LECTURER_NAV = [
  { icon: 'fa-tachometer-alt', label: 'Dashboard', path: '/lecturer' },
  { icon: 'fa-clipboard-check', label: 'Attendance', path: '/lecturer/attendance' },
];

const SPONSOR_NAV = [
  { icon: 'fa-tachometer-alt', label: 'Dashboard', path: '/sponsor' },
];

const NAV_MAP = { member: MEMBER_NAV, admin: ADMIN_NAV, lecturer: LECTURER_NAV, sponsor: SPONSOR_NAV };
const BRAND_MAP = { member: 'EESA Member Portal', admin: 'EESA Admin Panel', lecturer: 'Lecturer Portal', sponsor: 'Sponsor Portal' };
const ICON_MAP = { member: 'fa-user-circle', admin: 'fa-user-shield', lecturer: 'fa-chalkboard-teacher', sponsor: 'fa-handshake' };

export default function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('eesa-dark') === '1');
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  /* dark mode */
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('eesa-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  /* notifications */
  useEffect(() => {
    if (role !== 'member') return;
    const load = () => fetch('/api/notifications').then(r => r.ok ? r.json() : { notifications: [] }).then(d => setNotifs(Array.isArray(d) ? d : Array.isArray(d.notifications) ? d.notifications : [])).catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [role]);

  const unreadCount = notifs.filter(n => !n.read).length;
  const nav = NAV_MAP[role] || [];
  const brand = BRAND_MAP[role] || 'EESA Portal';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'PUT' }).catch(() => {});
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
  };

  const userName = user?.fullName || user?.username || user?.name || 'User';
  const userStatus = user?.status || user?.role || user?.tier || 'Active';
  const statusClass = userStatus === 'active' || userStatus === 'Active' ? 'success' : userStatus === 'admin' ? 'admin' : 'warning';

  return (
    <div className="portal-page">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/images/eesa-logo.svg" alt="EESA" className="sidebar-logo" />
            <span>{brand}</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar"><i className={`fas ${ICON_MAP[role] || 'fa-user-circle'}`}></i></div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className={`user-badge badge-${statusClass}`}>{userStatus}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(item => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/portal' || item.path === '/admin' || item.path === '/lecturer' || item.path === '/sponsor'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <i className={`fas ${item.icon}`}></i>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <Link to="/" className="nav-item"><i className="fas fa-globe"></i><span>Main Website</span></Link>
          <button className="nav-item" onClick={handleLogout} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <i className="fas fa-sign-out-alt"></i><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(o => !o)}>
            <i className="fas fa-bars"></i>
          </button>
          <h2 className="page-title">Dashboard</h2>
          <div className="topbar-actions">
            {role === 'member' && (
              <div className="notification-bell" onClick={() => setNotifOpen(o => !o)} style={{ position: 'relative' }}>
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </div>
            )}
            <button className="dark-mode-toggle" onClick={() => setDarkMode(d => !d)} title="Toggle dark mode">
              <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <span className="topbar-greeting">Welcome, {userName.split(' ')[0]}!</span>
          </div>
          {notifOpen && role === 'member' && (
            <div className="notification-dropdown" style={{ display: 'block' }}>
              <div className="notif-header">
                <h4>Notifications</h4>
                <a href="#" onClick={e => { e.preventDefault(); markAllRead(); }}>Mark all read</a>
              </div>
              <div className="notif-list">
                {notifs.length === 0 ? (
                  <div className="notif-empty">No notifications</div>
                ) : notifs.slice(0, 10).map(n => (
                  <div key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                    <div className="notif-icon"><i className="fas fa-bell"></i></div>
                    <div className="notif-content">
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </header>
        <div className="section-container" style={{ padding: '20px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
