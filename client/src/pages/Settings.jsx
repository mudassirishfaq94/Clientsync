import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, useFetch, useToast } from '../lib/hooks.jsx';
import {
  Alert, Avatar, AVATAR_PALETTE, Badge, Button, Card, CardHead, ErrorState, Field,
  Input, Loading, Select, Textarea, formatDate, label,
} from '../components/ui.jsx';

const SECTIONS = ['profile', 'security', 'notifications'];

function ProfileSection({ profile, onSaved }) {
  const toast = useToast();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: profile.name || '',
    job_title: profile.job_title || '',
    company: profile.company || '',
    phone: profile.phone || '',
    timezone: profile.timezone || '',
    bio: profile.bio || '',
    avatar_color: profile.avatar_color || '#4f46e5',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors((x) => ({ ...x, [k]: undefined }));
    setOk('');
  };

  async function submit(ev) {
    ev.preventDefault();
    setFormError('');
    setOk('');
    if (form.name.trim().length < 2) return setErrors({ name: 'Name must be at least 2 characters' });
    setBusy(true);
    try {
      const d = await api.patch('/api/me/profile', { ...form, name: form.name.trim() });
      onSaved(d.profile);
      await refreshUser();
      setOk('Profile saved.');
      toast.success('Profile updated.');
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHead title="Profile" subtitle="How you appear to everyone you work with." />
      <form className="card-pad stack gap-16" onSubmit={submit} noValidate>
        {formError && <Alert type="error">{formError}</Alert>}
        {ok && <Alert type="success">{ok}</Alert>}

        <div className="row gap-16">
          <Avatar name={form.name || profile.email} color={form.avatar_color} size={56} />
          <div className="stack gap-8 grow">
            <span className="label">Avatar colour</span>
            <div className="swatches">
              {AVATAR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="swatch"
                  style={{ background: c }}
                  aria-label={`Use colour ${c}`}
                  aria-pressed={form.avatar_color === c}
                  onClick={() => { setForm({ ...form, avatar_color: c }); setOk(''); }}
                />
              ))}
            </div>
          </div>
        </div>

        <Field label="Full name" error={errors.name} id="s-name" required>
          <Input id="s-name" value={form.name} onChange={set('name')} error={errors.name} />
        </Field>
        <Field label="Email" hint="Your sign-in address cannot be changed here." id="s-email">
          <Input id="s-email" value={profile.email} disabled />
        </Field>
        <Field label="Job title" error={errors.job_title} id="s-job">
          <Input id="s-job" value={form.job_title} onChange={set('job_title')} placeholder="Product Designer" />
        </Field>
        <Field label="Company" error={errors.company} id="s-co">
          <Input id="s-co" value={form.company} onChange={set('company')} placeholder="Studio Ltd" />
        </Field>
        <Field label="Phone" error={errors.phone} id="s-phone">
          <Input id="s-phone" value={form.phone} onChange={set('phone')} placeholder="+971 50 000 0000" />
        </Field>
        <Field label="Timezone" error={errors.timezone} id="s-tz">
          <Input id="s-tz" value={form.timezone} onChange={set('timezone')} placeholder="Asia/Dubai" />
        </Field>
        <Field label="Bio" error={errors.bio} id="s-bio">
          <Textarea id="s-bio" value={form.bio} onChange={set('bio')} placeholder="A short introduction…" />
        </Field>

        <div className="row-between">
          <span className="tiny muted">Member since {formatDate(profile.created_at)}</span>
          <Button type="submit" loading={busy}>Save changes</Button>
        </div>
      </form>
    </Card>
  );
}

function SecuritySection() {
  const toast = useToast();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors((x) => ({ ...x, [k]: undefined }));
    setOk('');
  };

  async function submit(ev) {
    ev.preventDefault();
    setFormError('');
    setOk('');
    const e = {};
    if (!form.current_password) e.current_password = 'Enter your current password';
    if (form.new_password.length < 8) e.new_password = 'New password must be at least 8 characters';
    if (form.new_password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      await api.post('/api/me/password', form);
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      setOk('Password updated.');
      toast.success('Password changed.');
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHead title="Security" subtitle="Change the password used to sign in." />
      <form className="card-pad stack gap-16" onSubmit={submit} noValidate>
        {formError && <Alert type="error">{formError}</Alert>}
        {ok && <Alert type="success">{ok}</Alert>}
        <Field label="Current password" error={errors.current_password} id="pw-cur" required>
          <Input id="pw-cur" type="password" autoComplete="current-password" value={form.current_password} onChange={set('current_password')} error={errors.current_password} />
        </Field>
        <Field label="New password" hint="At least 8 characters." error={errors.new_password} id="pw-new" required>
          <Input id="pw-new" type="password" autoComplete="new-password" value={form.new_password} onChange={set('new_password')} error={errors.new_password} />
        </Field>
        <Field label="Confirm new password" error={errors.confirm_password} id="pw-conf" required>
          <Input id="pw-conf" type="password" autoComplete="new-password" value={form.confirm_password} onChange={set('confirm_password')} error={errors.confirm_password} />
        </Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button type="submit" loading={busy}>Update password</Button>
        </div>
      </form>
    </Card>
  );
}

function NotificationsSection({ profile, onSaved }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(!!profile.notify_in_app);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  async function toggle(next) {
    setEnabled(next);
    setBusy(true);
    setFormError('');
    try {
      const d = await api.patch('/api/me/profile', { notify_in_app: next });
      onSaved(d.profile);
      toast.success(next ? 'In-app notifications on.' : 'In-app notifications off.');
    } catch (err) {
      setEnabled(!next);
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHead title="Notifications" subtitle="Control what ClientSync tells you about." />
      <div className="card-pad stack gap-16">
        {formError && <Alert type="error">{formError}</Alert>}
        <label className="row-between" style={{ cursor: 'pointer' }}>
          <span className="grow">
            <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>In-app notifications</span>
            <span className="tiny muted">
              New messages, uploaded files, approval requests and decisions on your projects.
            </span>
          </span>
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy}
            onChange={(e) => toggle(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
        </label>
        <Alert type="info">
          Email delivery is not configured in this environment, so notifications appear in the bell menu only.
        </Alert>
      </div>
    </Card>
  );
}

export default function Settings() {
  const { section } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useFetch('/api/me/profile');
  const active = section || 'profile';

  useEffect(() => { document.title = 'Settings — ClientSync'; }, []);

  if (section && !SECTIONS.includes(section)) return <Navigate to="/settings" replace />;

  const onSaved = (profile) => setData({ profile });

  return (
    <main className="container page stack gap-16">
      <div className="stack gap-8">
        <h1 style={{ fontSize: 24 }}>Settings</h1>
        <div className="row gap-8">
          <Badge tone={user.role === 'client' ? 'blue' : user.role === 'admin' ? 'red' : 'brand'}>
            {label(user.role)} account
          </Badge>
        </div>
      </div>

      <nav className="subnav" aria-label="Settings sections">
        {SECTIONS.map((s) => (
          <Link key={s} to={s === 'profile' ? '/settings' : `/settings/${s}`} className={active === s ? 'active' : ''}>
            {label(s)}
          </Link>
        ))}
      </nav>

      {loading ? (
        <Card><Loading rows={5} /></Card>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={reload} /></Card>
      ) : (
        <>
          {active === 'profile' && <ProfileSection profile={data.profile} onSaved={onSaved} />}
          {active === 'security' && <SecuritySection />}
          {active === 'notifications' && <NotificationsSection profile={data.profile} onSaved={onSaved} />}
        </>
      )}
    </main>
  );
}
