import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'eesa_auth';

const ROLE_CONFIG = {
  member:   { loginUrl: '/api/auth/member/login',   checkUrl: '/api/auth/member/me',   logoutUrl: '/api/auth/member/logout' },
  admin:    { loginUrl: '/api/auth/admin/login',    checkUrl: '/api/auth/admin/me',    logoutUrl: '/api/auth/admin/logout' },
  lecturer: { loginUrl: '/api/auth/lecturer/login', checkUrl: '/api/auth/lecturer/me', logoutUrl: '/api/auth/lecturer/logout' },
  sponsor:  { loginUrl: '/api/sponsors/auth/login', checkUrl: '/api/sponsors/auth/me', logoutUrl: '/api/sponsors/auth/logout' }
};

/* ── localStorage helpers ─────────────────────────── */
function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const { user, role } = JSON.parse(raw);
    if (user && role && ROLE_CONFIG[role]) return { user, role };
  } catch { /* corrupted – ignore */ }
  return null;
}

function saveAuth(user, role) {
  try { if (user && role) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, role })); }
  catch { /* quota – ignore */ }
}

function clearAuth() {
  try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
}

/* ── Provider ─────────────────────────────────────── */
export function AuthProvider({ children }) {
  const stored = loadStoredAuth();
  const [user, setUser] = useState(stored ? stored.user : null);
  const [role, setRole] = useState(stored ? stored.role : null);
  const [loading, setLoading] = useState(true);

  const safeJson = async (res) => {
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  };

  const checkSession = useCallback(async () => {
    /* Check the stored role first for speed, then the rest */
    const storedAuth = loadStoredAuth();
    const roleOrder = storedAuth
      ? [storedAuth.role, ...Object.keys(ROLE_CONFIG).filter(r => r !== storedAuth.role)]
      : Object.keys(ROLE_CONFIG);

    for (const r of roleOrder) {
      const cfg = ROLE_CONFIG[r];
      try {
        const res = await fetch(cfg.checkUrl, { credentials: 'include' });
        if (res.ok) {
          const data = await safeJson(res);
          if (data) {
            const u = data.member || data.admin || data.lecturer || data.sponsor || data;
            setUser(u);
            setRole(r);
            saveAuth(u, r);
            setLoading(false);
            return;
          }
        }
      } catch { /* next role */ }
    }
    /* No valid session — clear everything */
    setUser(null);
    setRole(null);
    clearAuth();
    setLoading(false);
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);

  const login = async (r, credentials) => {
    const cfg = ROLE_CONFIG[r];
    if (!cfg) throw new Error('Invalid role');
    let res;
    try {
      res = await fetch(cfg.loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });
    } catch (err) {
      throw new Error('Cannot reach the server — please check your connection');
    }
    const data = await safeJson(res);
    if (!res.ok) throw new Error((data && data.error) || `Login failed (${res.status})`);
    if (!data) throw new Error('Server returned an empty response — please try again');
    const actualRole = data.admin ? 'admin' : data.lecturer ? 'lecturer' : data.sponsor ? 'sponsor' : r;
    const u = data.member || data.admin || data.lecturer || data.sponsor || data;
    setUser(u);
    setRole(actualRole);
    saveAuth(u, actualRole);
    return { user: u, role: actualRole, redirectTo: data.redirectTo };
  };

  const logout = async () => {
    if (role && ROLE_CONFIG[role]) {
      await fetch(ROLE_CONFIG[role].logoutUrl, { method: 'POST', credentials: 'include' }).catch(() => {});
    }
    setUser(null);
    setRole(null);
    clearAuth();
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
