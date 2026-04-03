import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';

/* ── Pages ───────────────────────────────────────── */
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

/* Member */
import MemberDashboard from './pages/member/Dashboard';
import Membership from './pages/member/Membership';
import MemberResources from './pages/member/Resources';
import MemberElections from './pages/member/Elections';
import MemberEvents from './pages/member/Events';
import MemberAnnouncements from './pages/member/Announcements';
import Profile from './pages/member/Profile';

/* Admin */
import AdminDashboard from './pages/admin/Dashboard';
import AdminMembers from './pages/admin/Members';
import AdminPayments from './pages/admin/Payments';
import AdminEvents from './pages/admin/Events';
import AdminAttendance from './pages/admin/Attendance';
import AdminElections from './pages/admin/Elections';
import AdminResources from './pages/admin/Resources';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminProjects from './pages/admin/Projects';
import AdminSponsors from './pages/admin/Sponsors';

/* Lecturer */
import LecturerDashboard from './pages/lecturer/Dashboard';
import LecturerAttendance from './pages/lecturer/Attendance';

/* Sponsor */
import SponsorDashboard from './pages/sponsor/Dashboard';

/* ── Route guard ─────────────────────────────────── */
function ProtectedRoute({ requiredRole, children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user || role !== requiredRole) {
    const loginPaths = { member: '/login', admin: '/login/admin', lecturer: '/login/lecturer', sponsor: '/login/sponsor' };
    return <Navigate to={loginPaths[requiredRole] || '/login'} replace />;
  }

  return children;
}

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
  }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/:role" element={<LoginPage />} />
      <Route path="/dashboard" element={<LoginPage />} />

      {/* Member portal */}
      <Route path="/portal" element={<ProtectedRoute requiredRole="member"><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<MemberDashboard />} />
        <Route path="membership" element={<Membership />} />
        <Route path="resources" element={<MemberResources />} />
        <Route path="elections" element={<MemberElections />} />
        <Route path="events" element={<MemberEvents />} />
        <Route path="announcements" element={<MemberAnnouncements />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Admin panel */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="elections" element={<AdminElections />} />
        <Route path="resources" element={<AdminResources />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="sponsors" element={<AdminSponsors />} />
      </Route>

      {/* Lecturer portal */}
      <Route path="/lecturer" element={<ProtectedRoute requiredRole="lecturer"><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<LecturerDashboard />} />
        <Route path="attendance" element={<LecturerAttendance />} />
      </Route>

      {/* Sponsor portal */}
      <Route path="/sponsor" element={<ProtectedRoute requiredRole="sponsor"><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SponsorDashboard />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
