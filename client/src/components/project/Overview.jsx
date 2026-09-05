import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch, useToast } from '../../lib/hooks.jsx';
import {
  Alert, Badge, Button, Card, CardHead, Empty, Field, Input, Loading, Modal, Progress,
  Select, Textarea, formatDate, formatDateTime, label, STATUS_TONE,
} from '../ui.jsx';

function EditProjectModal({ project, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: project.name,
    description: project.description,
    requirements: project.requirements,
    due_date: project.due_date || '',
  });
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
    if (form.name.trim().length < 2) return setErrors({ name: 'Project name must be at least 2 characters' });
    setBusy(true);
    try {
      const d = await api.patch(`/api/projects/${project.id}`, {
        name: form.name.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        due_date: form.due_date || null,
      });
      toast.success('Project updated.');
      onSaved(d.project);
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
      title="Edit project"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Save changes</Button>
        </>
      }
    >
      <form className="modal-body" onSubmit={submit} noValidate>
        <Alert type="error">{formError}</Alert>
        <Field label="Project name" error={errors.name}><Input value={form.name} onChange={set('name')} error={errors.name} /></Field>
        <Field label="Description" error={errors.description}><Textarea value={form.description} onChange={set('description')} style={{ minHeight: 70 }} /></Field>
        <Field label="Requirements" error={errors.requirements}><Textarea value={form.requirements} onChange={set('requirements')} /></Field>
        <Field label="Due date" error={errors.due_date}><Input type="date" value={form.due_date} onChange={set('due_date')} error={errors.due_date} /></Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function InviteModal({ projectId, onClose, onAdded }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(ev) {
    ev.preventDefault();
    setFormError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErrors({ email: 'Enter a valid email address' });
    setBusy(true);
    try {
      await api.post(`/api/projects/${projectId}/members`, { email: email.trim() });
      toast.success('Member added to the project.');
      onAdded();
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
      title="Add a person"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Add to project</Button>
        </>
      }
    >
      <form className="modal-body" onSubmit={submit} noValidate>
        <Alert type="error">{formError}</Alert>
        <Field
          label="Email address"
          hint="They need an existing ClientSync account. Their role is taken from their account type."
          error={errors.email}
        >
          <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors({}); }} error={errors.email} placeholder="client@company.com" autoFocus />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Overview({ project, members, myRole, reload, onProjectChange }) {
  const toast = useToast();
  const activity = useFetch(`/api/projects/${project.id}/activity`);
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const isFreelancer = myRole === 'freelancer';

  async function changeStatus(status) {
    setActionError('');
    setStatusBusy(true);
    try {
      const d = await api.patch(`/api/projects/${project.id}`, { status });
      onProjectChange(d.project);
      activity.reload(true);
      toast.success(status === 'completed' ? 'Project marked complete.' : `Status set to ${label(status)}.`);
    } catch (err) {
      setActionError(err.message);
      toast.error(err.message);
    } finally {
      setStatusBusy(false);
    }
  }

  async function removeMember(id, name) {
    if (!window.confirm(`Remove ${name} from this project?`)) return;
    try {
      await api.del(`/api/projects/${project.id}/members/${id}`);
      toast.success('Member removed.');
      reload(true);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="split">
      <div className="stack gap-16">
        <Card>
          <CardHead
            title="Requirements & brief"
            subtitle="The agreed scope, visible to everyone on the project."
            actions={isFreelancer && <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
          />
          <div className="card-pad stack gap-16">
            {project.description && <p className="small">{project.description}</p>}
            {project.requirements ? (
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{project.requirements}</p>
            ) : (
              <Empty
                title="No requirements captured yet"
                hint={isFreelancer ? 'Add the brief so your client knows exactly what is in scope.' : 'Your freelancer has not added the brief yet.'}
                action={isFreelancer && <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Add requirements</Button>}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="Recent activity" />
          {activity.loading ? (
            <Loading rows={3} />
          ) : activity.error ? (
            <div className="card-pad small muted">Could not load activity.</div>
          ) : (activity.data?.activity || []).length === 0 ? (
            <Empty title="Nothing has happened yet" hint="Actions on this project will show up here." />
          ) : (
            <div>
              {activity.data.activity.map((a) => (
                <div key={a.id} className="list-item">
                  <div className="grow">
                    <div className="small">
                      <strong>{a.actor_name || 'Someone'}</strong> {a.action}
                    </div>
                    <div className="tiny muted">{formatDateTime(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="stack gap-16">
        <Card className="card-pad stack gap-12">
          <div className="row-between">
            <span className="card-title">Status</span>
            <Badge tone={STATUS_TONE[project.status]}>{label(project.status)}</Badge>
          </div>
          <div className="stack gap-8">
            <div className="row-between tiny muted">
              <span>{project.task_done}/{project.task_total} tasks done</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
          </div>
          <div className="row-between small">
            <span className="muted">Due date</span>
            <span>{formatDate(project.due_date)}</span>
          </div>
          {project.completed_at && (
            <div className="row-between small">
              <span className="muted">Completed</span>
              <span>{formatDateTime(project.completed_at)}</span>
            </div>
          )}
          {isFreelancer && (
            <div className="stack gap-8">
              {actionError && <Alert type="error">{actionError}</Alert>}
              <Field label="Change status">
                <Select
                  value={project.status}
                  disabled={statusBusy}
                  onChange={(e) => changeStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
              {project.status !== 'completed' && (
                <Button variant="success" onClick={() => changeStatus('completed')} loading={statusBusy}>
                  Mark project complete
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHead
            title="People"
            actions={isFreelancer && <Button size="sm" variant="secondary" onClick={() => setInviting(true)}>+ Add</Button>}
          />
          <div>
            {members.map((m) => (
              <div key={m.id} className="list-item">
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>{m.name}</div>
                  <div className="tiny muted truncate">{m.email}</div>
                </div>
                <Badge tone={m.role === 'client' ? 'blue' : 'brand'}>{label(m.role)}</Badge>
                {isFreelancer && m.id !== project.created_by && (
                  <button className="btn ghost sm" onClick={() => removeMember(m.id, m.name)} aria-label={`Remove ${m.name}`}>✕</button>
                )}
              </div>
            ))}
            {members.length === 0 && <Empty title="No members" />}
          </div>
          {isFreelancer && !members.some((m) => m.role === 'client') && (
            <div className="card-pad">
              <Alert type="info">Add your client so they can review progress and approve deliverables.</Alert>
            </div>
          )}
        </Card>
      </div>

      {editing && <EditProjectModal project={project} onClose={() => setEditing(false)} onSaved={onProjectChange} />}
      {inviting && <InviteModal projectId={project.id} onClose={() => setInviting(false)} onAdded={() => reload(true)} />}
    </div>
  );
}
