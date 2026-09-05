import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch, useToast } from '../../lib/hooks.jsx';
import {
  Alert, Badge, Button, Card, CardHead, Empty, ErrorState, Field, Input, Loading, Modal,
  Select, Textarea, formatDate, label, STATUS_TONE,
} from '../ui.jsx';

function MilestoneModal({ projectId, milestone, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: milestone?.title || '',
    description: milestone?.description || '',
    due_date: milestone?.due_date || '',
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
    if (form.title.trim().length < 2) return setErrors({ title: 'Title must be at least 2 characters' });
    setBusy(true);
    const payload = { title: form.title.trim(), description: form.description.trim(), due_date: form.due_date || '' };
    try {
      if (milestone) await api.patch(`/api/projects/${projectId}/milestones/${milestone.id}`, payload);
      else await api.post(`/api/projects/${projectId}/milestones`, payload);
      toast.success(milestone ? 'Milestone updated.' : 'Milestone added.');
      onSaved();
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
      title={milestone ? 'Edit milestone' : 'New milestone'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>{milestone ? 'Save' : 'Add milestone'}</Button>
        </>
      }
    >
      <form className="modal-body" onSubmit={submit} noValidate>
        <Alert type="error">{formError}</Alert>
        <Field label="Title" error={errors.title}>
          <Input value={form.title} onChange={set('title')} error={errors.title} placeholder="Phase 1 — Discovery" autoFocus />
        </Field>
        <Field label="Description" error={errors.description}>
          <Textarea value={form.description} onChange={set('description')} style={{ minHeight: 70 }} />
        </Field>
        <Field label="Due date" error={errors.due_date}>
          <Input type="date" value={form.due_date} onChange={set('due_date')} error={errors.due_date} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Milestones({ project, myRole }) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/api/projects/${project.id}/milestones`);
  const tasks = useFetch(`/api/projects/${project.id}/tasks`);
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const isFreelancer = myRole === 'freelancer';
  const milestones = data?.milestones || [];

  async function setStatus(m, status) {
    setBusyId(m.id);
    try {
      await api.patch(`/api/projects/${project.id}/milestones/${m.id}`, { status });
      await reload(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(m) {
    if (!window.confirm(`Delete milestone "${m.title}"? Tasks will stay but become unassigned from it.`)) return;
    setBusyId(m.id);
    try {
      await api.del(`/api/projects/${project.id}/milestones/${m.id}`);
      toast.success('Milestone deleted.');
      await reload(true);
      tasks.reload(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHead
        title="Milestones"
        subtitle="Phases the project moves through."
        actions={isFreelancer && <Button size="sm" onClick={() => setModal({ milestone: null })}>+ New milestone</Button>}
      />
      {loading ? (
        <Loading rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : milestones.length === 0 ? (
        <Empty
          title="No milestones yet"
          hint={isFreelancer ? 'Group tasks into phases so the client can follow the plan.' : 'No phases have been defined yet.'}
          action={isFreelancer && <Button size="sm" onClick={() => setModal({ milestone: null })}>Add a milestone</Button>}
        />
      ) : (
        <div>
          {milestones.map((m) => {
            const mt = (tasks.data?.tasks || []).filter((t) => t.milestone_id === m.id);
            const done = mt.filter((t) => t.status === 'done').length;
            return (
              <div key={m.id} className="list-item" style={{ opacity: busyId === m.id ? 0.6 : 1 }}>
                <div className="grow stack gap-8">
                  <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{m.title}</strong>
                    <Badge tone={STATUS_TONE[m.status]}>{label(m.status)}</Badge>
                  </div>
                  {m.description && <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{m.description}</p>}
                  <div className="tiny muted">
                    Due {formatDate(m.due_date)} · {done}/{mt.length} tasks done
                  </div>
                  {isFreelancer && (
                    <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                      <Select
                        value={m.status}
                        disabled={busyId === m.id}
                        onChange={(e) => setStatus(m, e.target.value)}
                        style={{ width: 'auto', minHeight: 32, fontSize: 12, padding: '4px 26px 4px 8px' }}
                        aria-label={`Status for ${m.title}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                      </Select>
                      <button className="btn ghost sm" onClick={() => setModal({ milestone: m })}>Edit</button>
                      <button className="btn ghost sm" onClick={() => remove(m)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal && (
        <MilestoneModal
          projectId={project.id}
          milestone={modal.milestone}
          onClose={() => setModal(null)}
          onSaved={() => reload(true)}
        />
      )}
    </Card>
  );
}
