import { useState } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../lib/hooks.jsx';
import { Alert, Button, Field, Input, Modal, Textarea } from './ui.jsx';

export default function NewProjectModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '', description: '', requirements: '', due_date: '', client_email: '',
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
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Project name must be at least 2 characters';
    if (form.client_email && !/^\S+@\S+\.\S+$/.test(form.client_email.trim())) {
      e.client_email = 'Enter a valid email address';
    }
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
        <Field label="Project name" error={errors.name} id="np-name" required>
          <Input id="np-name" value={form.name} onChange={set('name')} error={errors.name} placeholder="Website redesign" />
        </Field>
        <Field label="Short description" error={errors.description} id="np-desc">
          <Textarea id="np-desc" value={form.description} onChange={set('description')} placeholder="What is this project about?" style={{ minHeight: 70 }} />
        </Field>
        <Field
          label="Requirements / brief"
          hint="The agreed scope. Both you and the client can see this."
          error={errors.requirements}
          id="np-req"
        >
          <Textarea id="np-req" value={form.requirements} onChange={set('requirements')} placeholder="Deliverables, constraints, acceptance criteria…" />
        </Field>
        <Field label="Due date" error={errors.due_date} id="np-due">
          <Input id="np-due" type="date" value={form.due_date} onChange={set('due_date')} error={errors.due_date} />
        </Field>
        <Field
          label="Client email (optional)"
          hint="They need an existing ClientSync client account. You can add them later."
          error={errors.client_email}
          id="np-client"
        >
          <Input id="np-client" type="email" value={form.client_email} onChange={set('client_email')} error={errors.client_email} placeholder="client@company.com" />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
