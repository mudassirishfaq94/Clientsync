import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch, useToast } from '../../lib/hooks.jsx';
import {
  Alert, Badge, Button, Card, CardHead, Empty, ErrorState, Field, Input, Loading, Modal,
  Select, Textarea, formatDate, label, STATUS_TONE,
} from '../ui.jsx';

const COLUMNS = [
  ['todo', 'To do'],
  ['in_progress', 'In progress'],
  ['review', 'In review'],
  ['done', 'Done'],
];

function TaskModal({ projectId, task, milestones, members, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    milestone_id: task?.milestone_id || '',
    assignee_id: task?.assignee_id || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    status: task?.status || 'todo',
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
    if (form.title.trim().length < 2) return setErrors({ title: 'Task title must be at least 2 characters' });
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      milestone_id: form.milestone_id || '',
      assignee_id: form.assignee_id || '',
      priority: form.priority,
      due_date: form.due_date || '',
      ...(task ? { status: form.status } : {}),
    };
    try {
      if (task) await api.patch(`/api/projects/${projectId}/tasks/${task.id}`, payload);
      else await api.post(`/api/projects/${projectId}/tasks`, payload);
      toast.success(task ? 'Task updated.' : 'Task created.');
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
      title={task ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>{task ? 'Save task' : 'Create task'}</Button>
        </>
      }
    >
      <form className="modal-body" onSubmit={submit} noValidate>
        <Alert type="error">{formError}</Alert>
        <Field label="Title" error={errors.title}>
          <Input value={form.title} onChange={set('title')} error={errors.title} placeholder="Design homepage hero" autoFocus />
        </Field>
        <Field label="Description" error={errors.description}>
          <Textarea value={form.description} onChange={set('description')} style={{ minHeight: 70 }} />
        </Field>
        {task && (
          <Field label="Status" error={errors.status}>
            <Select value={form.status} onChange={set('status')}>
              {COLUMNS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Milestone" error={errors.milestone_id}>
          <Select value={form.milestone_id} onChange={set('milestone_id')} error={errors.milestone_id}>
            <option value="">No milestone</option>
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </Select>
        </Field>
        <Field label="Assignee" error={errors.assignee_id}>
          <Select value={form.assignee_id} onChange={set('assignee_id')} error={errors.assignee_id}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Due date" error={errors.due_date}>
          <Input type="date" value={form.due_date} onChange={set('due_date')} error={errors.due_date} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Tasks({ project, members, myRole, onChanged }) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/api/projects/${project.id}/tasks`);
  const ms = useFetch(`/api/projects/${project.id}/milestones`);
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const isFreelancer = myRole === 'freelancer';
  const tasks = data?.tasks || [];

  async function move(task, status) {
    setBusyId(task.id);
    try {
      await api.patch(`/api/projects/${project.id}/tasks/${task.id}`, { status });
      await reload(true);
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    setBusyId(task.id);
    try {
      await api.del(`/api/projects/${project.id}/tasks/${task.id}`);
      toast.success('Task deleted.');
      await reload(true);
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const refresh = async () => {
    await reload(true);
    onChanged?.();
  };

  return (
    <Card>
      <CardHead
        title="Tasks"
        subtitle={`${tasks.filter((t) => t.status === 'done').length} of ${tasks.length} done`}
        actions={isFreelancer && <Button size="sm" onClick={() => setModal({ task: null })}>+ New task</Button>}
      />
      {loading ? (
        <Loading rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : tasks.length === 0 ? (
        <Empty
          title="No tasks yet"
          hint={isFreelancer ? 'Break the project into tasks so progress is visible to your client.' : 'Your freelancer has not added tasks yet.'}
          action={isFreelancer && <Button size="sm" onClick={() => setModal({ task: null })}>Create the first task</Button>}
        />
      ) : (
        <div className="card-pad board">
          {COLUMNS.map(([status, title]) => {
            const items = tasks.filter((t) => t.status === status);
            return (
              <div key={status} className="column">
                <div className="column-head">
                  <span>{title}</span>
                  <span>{items.length}</span>
                </div>
                {items.length === 0 && <div className="tiny muted" style={{ padding: '4px 4px 8px' }}>Empty</div>}
                {items.map((t) => (
                  <div key={t.id} className="task-card stack gap-8" style={{ opacity: busyId === t.id ? 0.6 : 1 }}>
                    <div className="row-between" style={{ alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</span>
                      <Badge tone={STATUS_TONE[t.priority]}>{label(t.priority)}</Badge>
                    </div>
                    {t.description && <p className="tiny muted" style={{ whiteSpace: 'pre-wrap' }}>{t.description}</p>}
                    <div className="row gap-8 tiny muted" style={{ flexWrap: 'wrap' }}>
                      <span>{t.assignee_name || 'Unassigned'}</span>
                      {t.due_date && <span>· Due {formatDate(t.due_date)}</span>}
                    </div>
                    {isFreelancer && (
                      <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                        <Select
                          value={t.status}
                          disabled={busyId === t.id}
                          onChange={(e) => move(t, e.target.value)}
                          style={{ minHeight: 32, fontSize: 12, padding: '4px 26px 4px 8px', width: 'auto', flex: 1 }}
                          aria-label={`Status for ${t.title}`}
                        >
                          {COLUMNS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </Select>
                        <button className="btn ghost sm" onClick={() => setModal({ task: t })}>Edit</button>
                        <button className="btn ghost sm" onClick={() => remove(t)} aria-label={`Delete ${t.title}`}>✕</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {modal && (
        <TaskModal
          projectId={project.id}
          task={modal.task}
          milestones={ms.data?.milestones || []}
          members={members}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </Card>
  );
}
