import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../lib/hooks.jsx';
import { Alert, Button, Card, Field, Input } from '../components/ui.jsx';

const ROLES = [
  ['freelancer', 'Freelancer / agency', 'Create projects, manage tasks, request approvals.'],
  ['client', 'Client', 'Follow progress, share files, approve work.'],
];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'freelancer' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function clientValidate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    setFormError('');
    if (!clientValidate()) return;
    setBusy(true);
    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success(`Account created. Welcome, ${user.name.split(' ')[0]}.`);
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
              <h1 style={{ fontSize: 22 }}>Create your account</h1>
              <p className="small muted">Free to start. Invite your client once your project is set up.</p>
            </div>
            <Alert type="error">{formError}</Alert>

            <Field label="I am a…" error={errors.role}>
              <div className="stack gap-8">
                {ROLES.map(([value, title, desc]) => (
                  <label
                    key={value}
                    className="row"
                    style={{
                      alignItems: 'flex-start',
                      border: `1px solid ${form.role === value ? 'var(--brand)' : 'var(--border)'}`,
                      background: form.role === value ? 'var(--brand-soft)' : '#fff',
                      borderRadius: 10,
                      padding: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={form.role === value}
                      onChange={set('role')}
                      style={{ marginTop: 3 }}
                    />
                    <span className="grow">
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{title}</span>
                      <span className="tiny muted">{desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Full name" error={errors.name} id="name">
              <Input id="name" value={form.name} onChange={set('name')} error={errors.name} placeholder="Alex Rivera" autoComplete="name" />
            </Field>
            <Field label="Email" error={errors.email} id="email">
              <Input id="email" type="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@studio.com" autoComplete="email" />
            </Field>
            <Field label="Password" error={errors.password} hint="At least 8 characters." id="password">
              <Input id="password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
            </Field>

            <Button type="submit" className="block" loading={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
            <p className="small muted center">
              Already registered? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
