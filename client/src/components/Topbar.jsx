import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth, useToast } from '../lib/hooks.jsx';
import { Badge, Button, label } from './ui.jsx';

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
      toast.error('Could not sign out. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link to={user ? '/dashboard' : '/'} className="brand">
          <span className="brand-mark">CS</span>
          <span>ClientSync</span>
        </Link>

        {loading ? (
          <span className="spinner" />
        ) : user ? (
          <div className="row gap-8">
            <span className="hide-sm small muted truncate" style={{ maxWidth: 180 }}>
              {user.name}
            </span>
            <Badge tone={user.role === 'client' ? 'blue' : user.role === 'admin' ? 'red' : 'brand'}>
              {label(user.role)}
            </Badge>
            {user.role === 'admin' && (
              <Link className="btn secondary sm" to="/admin">
                Admin
              </Link>
            )}
            <Button variant="secondary" size="sm" onClick={onLogout} loading={busy}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="row gap-8">
            <Link className="btn secondary sm" to="/login">
              Sign in
            </Link>
            <Link className="btn sm" to="/register">
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
