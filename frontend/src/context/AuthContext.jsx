import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const ROLE_CONFIG = {
  member:   { loginUrl: '/api/auth/member/login',   checkUrl: '/api/auth/member/me',   logoutUrl: '/api/auth/member/logout' },
  admin:    { loginUrl: '/api/auth/admin/login',    checkUrl: '/api/auth/admin/me',    logoutUrl: '/api/auth/admin/logout' },
  lecturer: { loginUrl: '/api/auth/lecturer/login', checkUrl: '/api/auth/lecturer/me', logoutUrl: '/api/auth/lecturer/logout' },
  sponsor:  { loginUrl: '/api/sponsors/auth/login', checkUrl: '/api/sponsors/auth/me', logoutUrl: '/api/sponsors/auth/logout' }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const safeJson = async (res) => {
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  };

  const checkSession = useCallback(async () => {
    for (const [r, cfg] of Object.entries(ROLE_CONFIG)) {
      try {
        const res = await fetch(cfg.checkUrl);
        if (res.ok) {
          const data = await safeJson(res);
          if (data) {
            const u = data.member || data.admin || data.lecturer || data.sponsor || data;
            setUser(u);
            setRole(r);
            setLoading(false);
            return;
          }
        }
      } catch { /* next role */ }
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);

  const login = async (r, credentials) => {
    const cfg = ROLE_CONFIG[r];
    if (!cfg) throw new Error('Invalid role');
    const res = await fetch(cfg.loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error((data && data.error) || 'Login failed');
    if (!data) throw new Error('Server returned an empty response — please try again');
    // Detect actual role from response (admin may log in via member endpoint)
    const actualRole = data.admin ? 'admin' : data.lecturer ? 'lecturer' : data.sponsor ? 'sponsor' : r;
    const u = data.member || data.admin || data.lecturer || data.sponsor || data;
    setUser(u);
    setRole(actualRole);
    return { user: u, role: actualRole, redirectTo: data.redirectTo };
  };

  const logout = async () => {
    if (role && ROLE_CONFIG[role]) {
      await fetch(ROLE_CONFIG[role].logoutUrl, { method: 'POST' }).catch(() => {});
    }
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, checkSession, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
