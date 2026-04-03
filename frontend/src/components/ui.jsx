import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ msg: '', type: '', show: false });

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* shared helpers */
export const fmt = d => d ? new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '--';
export const fmtDt = d => d ? new Date(d).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--';
export const esc = s => { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; };

export function Loading({ text = 'Loading...' }) {
  return <div className="loading"><i className="fas fa-spinner fa-spin"></i> {text}</div>;
}

export function Empty({ text = 'No data found.' }) {
  return <div className="react-empty"><i className="fas fa-inbox"></i> {text}</div>;
}

export function Badge({ type = 'secondary', children }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

export function Modal({ open, onClose, title, large, children }) {
  if (!open) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className={`modal-content ${large ? 'modal-lg' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        {title && <h3 style={{ marginBottom: 16, color: 'var(--primary)' }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = { active: 'success', pending: 'warning', suspended: 'danger', inactive: 'secondary', completed: 'success', 'in-progress': 'info', planning: 'secondary', ongoing: 'info', upcoming: 'accent', past: 'secondary', closed: 'secondary', open: 'success', locked: 'danger' };
  return <Badge type={map[status] || 'secondary'}>{status || 'unknown'}</Badge>;
}
