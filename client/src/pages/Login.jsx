import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../lib/hooks.jsx';
import { Alert, Button, Card, Field, Input } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function clientValidate() {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    setFormError('');
    if (!clientValidate()) return;
    setBusy(true);
    try {
      const user = await login({ email: form.email.trim(), password: form.password });
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="auth-wrap">
        <Card className="card-pad">
          <form className="stack gap-16" onSubmit={onSubmit} noValidate>
            <div className="stack gap-8">
              <h1 style={{ fontSize: 22 }}>Sign in</h1>
              <p className="small muted">Access your projects and client workspaces.</p>
            </div>
            <Alert type="error">{formError}</Alert>
            <Field label="Email" error={errors.email} id="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                placeholder="you@studio.com"
              />
            </Field>
            <Field label="Password" error={errors.password} id="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" className="block" loading={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="small muted center">
              No account? <Link to="/auth/register">Create one</Link>
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
