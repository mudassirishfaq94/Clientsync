import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, useFetch, useToast } from '../lib/hooks.jsx';
import { Avatar, Dropdown, Empty, timeAgo } from './ui.jsx';

/** Notification bell with a rich panel (not a plain menu). */
function Bell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data, reload } = useFetch('/api/me/notifications');
  const notifications = data?.notifications || [];
  const unread = data?.unread || 0;

  async function activate(n) {
    setOpen(false);
    if (!n.read_at) {
      try {
        await api.post(`/api/me/notifications/${n.id}/read`);
        reload(true);
      } catch { /* non-blocking */ }
    }
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    try {
      await api.post('/api/me/notifications/read-all');
      await reload(true);
    } catch { /* non-blocking */ }
  }

  return (
    <div className="dropdown">
      <span>
        <button
          className="btn ghost sm notif-btn"
          type="button"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          aria-expanded={open}
          onClick={() => { setOpen((o) => !o); if (!open) reload(true); }}
        >
          <span style={{ fontSize: 15 }}>🔔</span>
          {unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}
        </button>
      </span>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="dropdown-menu right notif-panel" style={{ zIndex: 50 }}>
            <div className="row-between" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ fontSize: 14 }}>Notifications</strong>
              {unread > 0 && (
                <button className="btn ghost sm" type="button" onClick={markAll}>Mark all read</button>
              )}
            </div>
            {notifications.length === 0 ? (
              <Empty title="You’re all caught up" hint="Updates on your projects will appear here." icon="🔔" />
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notif-item ${n.read_at ? '' : 'unread'}`}
                  onClick={() => activate(n)}
                >
                  <div className="small" style={{ fontWeight: n.read_at ? 500 : 650 }}>{n.title}</div>
                  {n.body && <div className="tiny muted truncate">{n.body}</div>}
                  <div className="tiny muted">
                    {n.project_name ? `${n.project_name} · ` : ''}{timeAgo(n.created_at)}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Topbar() {
  const { user, logout, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
      toast.success('Signed out.');
      navigate('/');
    } catch {
      toast.error('Could not sign out. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <div className="row gap-16">
          <Link to={user ? '/dashboard' : '/'} className="brand">
            <span className="brand-mark">CS</span>
            <span>ClientSync</span>
          </Link>
          {user && (
            <nav className="row gap-8 hide-sm" aria-label="Main">
              <NavLink to="/dashboard" className={({ isActive }) => `btn ghost sm ${isActive ? 'active-nav' : ''}`}>
                Dashboard
              </NavLink>
              <NavLink to="/projects" className={({ isActive }) => `btn ghost sm ${isActive ? 'active-nav' : ''}`}>
                Projects
              </NavLink>
            </nav>
          )}
        </div>

        {loading ? (
          <span className="spinner" />
        ) : user ? (
          <div className="row gap-8">
            <Bell />
            <Dropdown
              align="right"
              trigger={
                <button className="btn ghost sm" type="button" aria-label="Account menu" style={{ padding: 4 }}>
                  <Avatar name={user.name} color={user.avatar_color} size={28} />
                </button>
              }
              items={[
                { label: `Signed in as ${user.name}`, disabled: true },
                { separator: true },
                { label: 'Dashboard', onSelect: () => navigate('/dashboard') },
                { label: 'Projects', onSelect: () => navigate('/projects') },
                { label: 'Settings', onSelect: () => navigate('/settings') },
                ...(user.role === 'admin' ? [{ label: 'Admin overview', onSelect: () => navigate('/admin') }] : []),
                { separator: true },
                { label: busy ? 'Signing out…' : 'Sign out', danger: true, onSelect: onLogout },
              ]}
            />
          </div>
        ) : (
          <div className="row gap-8">
            <Link className="btn secondary sm" to="/auth/login">Sign in</Link>
            <Link className="btn sm" to="/auth/register">Get started</Link>
          </div>
        )}
      </div>
    </header>
  );
}
