import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, useFetch, useToast } from '../lib/hooks.jsx';
import {
  Alert, Badge, Button, Card, Empty, ErrorState, Field, Input, Loading, Modal, Progress,
  Select, Textarea, formatDate, label, STATUS_TONE,
} from '../components/ui.jsx';

function NewProjectModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', description: '', requirements: '', due_date: '', client_email: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function submit(ev) {
    ev.preventDefault();
    setFormError('');
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Project name must be at least 2 characters';
    if (form.client_email && !/^\S+@\S+\.\S+$/.test(form.client_email.trim())) e.client_email = 'Enter a valid email';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const d = await api.post('/api/projects', {
        name: form.name.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        due_date: form.due_date || undefined,
        client_email: form.client_email.trim() || undefined,
      });
      toast.success('Project created.');
      onCreated(d.project);
      onClose();
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="New project"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={submit} loading={busy}>{busy ? 'Creating…' : 'Create project'}</Button>
        </>
      }
    >
      <form className="modal-body" onSubmit={submit} noValidate>
        <Alert type="error">{formError}</Alert>
        <Field label="Project name" error={errors.name} id="p-name">
          <Input id="p-name" value={form.name} onChange={set('name')} error={errors.name} placeholder="Website redesign" autoFocus />
        </Field>
        <Field label="Short description" error={errors.description} id="p-desc">
          <Textarea id="p-desc" value={form.description} onChange={set('description')} placeholder="What is this project about?" style={{ minHeight: 70 }} />
        </Field>
        <Field label="Requirements / brief" hint="The agreed scope. Both you and the client can see this." error={errors.requirements} id="p-req">
          <Textarea id="p-req" value={form.requirements} onChange={set('requirements')} placeholder="Deliverables, constraints, acceptance criteria…" />
        </Field>
        <Field label="Due date" error={errors.due_date} id="p-due">
          <Input id="p-due" type="date" value={form.due_date} onChange={set('due_date')} error={errors.due_date} />
        </Field>
        <Field
          label="Client email (optional)"
          hint="The client must already have a ClientSync client account. You can invite them later."
          error={errors.client_email}
          id="p-client"
        >
          <Input id="p-client" type="email" value={form.client_email} onChange={set('client_email')} error={errors.client_email} placeholder="client@company.com" />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function ProjectCard({ p }) {
  return (
    <Card className="card-pad stack gap-12">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <Link to={`/projects/${p.id}`} style={{ fontWeight: 650, color: 'var(--text)', fontSize: 15 }}>
          {p.name}
        </Link>
        <Badge tone={STATUS_TONE[p.status]}>{label(p.status)}</Badge>
      </div>
      <p className="small muted" style={{ minHeight: 20 }}>
        {p.description || 'No description yet.'}
      </p>
      <div className="stack gap-8">
        <div className="row-between tiny muted">
          <span>{p.task_done}/{p.task_total} tasks done</span>
          <span>{p.progress}%</span>
        </div>
        <Progress value={p.progress} />
      </div>
      <div className="row-between">
        <span className="tiny muted">Due {formatDate(p.due_date)}</span>
        {p.pending_approvals > 0 && <Badge tone="amber">{p.pending_approvals} awaiting approval</Badge>}
      </div>
      <Link className="btn secondary sm" to={`/projects/${p.id}`}>
        Open workspace
      </Link>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useFetch('/api/projects');
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const projects = data?.projects || [];
  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          (filter === 'all' || p.status === filter) &&
          (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
      ),
    [projects, filter, q]
  );

  const stats = useMemo(
    () => ({
      active: projects.filter((p) => p.status === 'active').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      approvals: projects.reduce((s, p) => s + p.pending_approvals, 0),
    }),
    [projects]
  );

  const isClient = user.role === 'client';

  return (
    <main className="container page stack gap-24">
      <div className="row-between">
        <div className="stack gap-8">
          <h1 style={{ fontSize: 24 }}>{isClient ? 'Your projects' : 'Projects'}</h1>
          <p className="small muted">
            {isClient
              ? 'Everything your freelancers are building for you.'
              : 'Your client workspaces, from brief to completion.'}
          </p>
        </div>
        {!isClient && <Button onClick={() => setShowNew(true)}>+ New project</Button>}
      </div>

      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cards">
          {[
            ['Active projects', stats.active],
            ['Completed', stats.completed],
            ['Approvals pending', stats.approvals],
          ].map(([t, v]) => (
            <Card key={t} className="card-pad stack gap-8">
              <span className="small muted">{t}</span>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{v}</span>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <div className="card-head">
          <div className="row gap-8 grow" style={{ flexWrap: 'wrap' }}>
            <Input
              placeholder="Search projects…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 260 }}
              aria-label="Search projects"
            />
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 170 }} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <Loading rows={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : projects.length === 0 ? (
          <Empty
            title={isClient ? 'No projects shared with you yet' : 'No projects yet'}
            hint={
              isClient
                ? 'Once a freelancer adds you to a project, it will appear here.'
                : 'Create your first project to capture requirements and invite your client.'
            }
            action={!isClient && <Button onClick={() => setShowNew(true)}>Create your first project</Button>}
          />
        ) : visible.length === 0 ? (
          <Empty title="No matching projects" hint="Try a different search or filter." />
        ) : (
          <div className="card-pad grid grid-cards">
            {visible.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </Card>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={(p) => setData((d) => ({ projects: [p, ...(d?.projects || [])] }))}
        />
      )}
    </main>
  );
}
