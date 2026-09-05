import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch, useToast } from '../../lib/hooks.jsx';
import {
  Alert, Badge, Button, Card, CardHead, Empty, ErrorState, Field, Input, Loading, Modal,
  Select, Textarea, formatDateTime, label, STATUS_TONE,
} from '../ui.jsx';

function RequestModal({ projectId, milestones, files, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', notes: '', milestone_id: '', file_id: '' });
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
    try {
      await api.post(`/api/projects/${projectId}/approvals`, {
        title: form.title.trim(),
        notes: form.notes.trim(),
        milestone_id: form.milestone_id || '',
        file_id: form.file_id || '',
      });
      toast.success('Approval requested. Your client has been notified in the workspace.');
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
      title="Request approval"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Send request</Button>
        </>
      }
    >
      <form className="modal-body" onSubmit={submit} noValidate>
        <Alert type="error">{formError}</Alert>
        <Field label="What needs approval?" error={errors.title}>
          <Input value={form.title} onChange={set('title')} error={errors.title} placeholder="Homepage design v2" autoFocus />
        </Field>
        <Field label="Notes for the client" error={errors.notes}>
          <Textarea value={form.notes} onChange={set('notes')} placeholder="Anything they should look at closely…" style={{ minHeight: 70 }} />
        </Field>
        <Field label="Related milestone" hint="Approving this will complete the milestone." error={errors.milestone_id}>
          <Select value={form.milestone_id} onChange={set('milestone_id')} error={errors.milestone_id}>
            <option value="">None</option>
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </Select>
        </Field>
        <Field label="Attach a file" error={errors.file_id}>
          <Select value={form.file_id} onChange={set('file_id')} error={errors.file_id}>
            <option value="">None</option>
            {files.map((f) => <option key={f.id} value={f.id}>{f.filename}</option>)}
          </Select>
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function DecisionModal({ projectId, approval, decision, onClose, onSaved }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const isChanges = decision === 'changes_requested';

  async function submit(ev) {
    ev.preventDefault();
    setFormError('');
    if (isChanges && !note.trim()) return setErrors({ decision_note: 'Please explain what needs to change' });
    setBusy(true);
    try {
      await api.post(`/api/projects/${projectId}/approvals/${approval.id}/decision`, {
        decision,
        decision_note: note.trim(),
      });
      toast.success(isChanges ? 'Change request sent.' : 'Approved. Nice!');
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
      title={isChanges ? 'Request changes' : 'Approve deliverable'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={isChanges ? 'danger' : 'success'} onClick={submit} loading={busy}>
            {isChanges ? 'Send change request' : 'Approve'}
          </Button>
        </>
      }
    >
      <form className="modal-body" onSubmit={submit} noValidate>
        <Alert type="error">{formError}</Alert>
        <p className="small muted">
          {isChanges ? 'Requesting changes on' : 'Approving'} <strong>{approval.title}</strong>.
        </p>
        <Field
          label={isChanges ? 'What needs to change?' : 'Note (optional)'}
          error={errors.decision_note}
        >
          <Textarea
            value={note}
            onChange={(e) => { setNote(e.target.value); setErrors({}); }}
            error={errors.decision_note}
            placeholder={isChanges ? 'Be specific so it can be fixed in one pass…' : 'Looks great, ship it.'}
            autoFocus
          />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Approvals({ project, myRole, onChanged }) {
  const { data, loading, error, reload } = useFetch(`/api/projects/${project.id}/approvals`);
  const ms = useFetch(`/api/projects/${project.id}/milestones`);
  const files = useFetch(`/api/projects/${project.id}/files`);
  const [requesting, setRequesting] = useState(false);
  const [decision, setDecision] = useState(null);
  const isFreelancer = myRole === 'freelancer';
  const isClient = myRole === 'client';
  const approvals = data?.approvals || [];

  const refresh = async () => {
    await reload(true);
    ms.reload(true);
    onChanged?.();
  };

  return (
    <Card>
      <CardHead
        title="Approvals"
        subtitle={isClient ? 'Review deliverables and record your decision.' : 'Ask your client to sign off on work.'}
        actions={isFreelancer && <Button size="sm" onClick={() => setRequesting(true)}>+ Request approval</Button>}
      />
      {loading ? (
        <Loading rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : approvals.length === 0 ? (
        <Empty
          title="No approval requests"
          hint={isFreelancer ? 'When a deliverable is ready, request client sign-off here.' : 'Nothing is waiting on you right now.'}
          action={isFreelancer && <Button size="sm" onClick={() => setRequesting(true)}>Request approval</Button>}
        />
      ) : (
        <div>
          {approvals.map((a) => (
            <div key={a.id} className="list-item">
              <div className="grow stack gap-8">
                <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14 }}>{a.title}</strong>
                  <Badge tone={STATUS_TONE[a.status]}>{label(a.status)}</Badge>
                </div>
                {a.notes && <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{a.notes}</p>}
                <div className="tiny muted">
                  Requested by {a.requested_by_name} · {formatDateTime(a.created_at)}
                  {a.milestone_title && ` · Milestone: ${a.milestone_title}`}
                </div>
                {a.file_id && (
                  <a className="tiny" href={`/api/projects/${project.id}/files/${a.file_id}/download`}>
                    ⬇ {a.filename}
                  </a>
                )}
                {a.status !== 'pending' && (
                  <div className={`alert ${a.status === 'approved' ? 'success' : 'error'}`}>
                    <strong>{a.status === 'approved' ? 'Approved' : 'Changes requested'}</strong> by {a.decided_by_name} on{' '}
                    {formatDateTime(a.decided_at)}
                    {a.decision_note && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.decision_note}</div>}
                  </div>
                )}
                {a.status === 'pending' && isClient && (
                  <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                    <Button size="sm" variant="success" onClick={() => setDecision({ a, d: 'approved' })}>Approve</Button>
                    <Button size="sm" variant="secondary" onClick={() => setDecision({ a, d: 'changes_requested' })}>
                      Request changes
                    </Button>
                  </div>
                )}
                {a.status === 'pending' && isFreelancer && (
                  <span className="tiny muted">Waiting on your client’s decision.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {requesting && (
        <RequestModal
          projectId={project.id}
          milestones={ms.data?.milestones || []}
          files={files.data?.files || []}
          onClose={() => setRequesting(false)}
          onSaved={refresh}
        />
      )}
      {decision && (
        <DecisionModal
          projectId={project.id}
          approval={decision.a}
          decision={decision.d}
          onClose={() => setDecision(null)}
          onSaved={refresh}
        />
      )}
    </Card>
  );
}
