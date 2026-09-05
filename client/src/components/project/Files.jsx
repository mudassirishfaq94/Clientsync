import { useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth, useFetch, useToast } from '../../lib/hooks.jsx';
import { useConfirm } from '../../lib/useConfirm.jsx';
import { Alert, Button, Card, CardHead, Empty, ErrorState, Loading, formatBytes, formatDateTime } from '../ui.jsx';

export default function Files({ project, myRole }) {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(`/api/projects/${project.id}/files`);
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { confirm, dialog } = useConfirm();
  const files = data?.files || [];

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File is too large (max 20 MB).');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      await api.upload(`/api/projects/${project.id}/files`, fd);
      toast.success(`${file.name} uploaded.`);
      await reload(true);
    } catch (err) {
      setUploadError(err.message);
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  function remove(f) {
    confirm({
      title: 'Delete file',
      message: `Delete "${f.filename}"? This permanently removes it for everyone on the project.`,
      confirmLabel: 'Delete file',
      onConfirm: async () => {
        await api.del(`/api/projects/${project.id}/files/${f.id}`);
        toast.success('File deleted.');
        await reload(true);
      },
    });
  }

  const canDelete = (f) => f.uploader_id === user.id || myRole === 'freelancer';

  return (
    <Card>
      <CardHead
        title="Files"
        subtitle="Deliverables and assets shared on this project. Max 20 MB per file."
        actions={
          <>
            <input ref={inputRef} type="file" onChange={onPick} style={{ display: 'none' }} aria-hidden="true" />
            <Button size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? 'Uploading…' : 'Upload file'}
            </Button>
          </>
        }
      />
      {uploadError && <div className="card-pad" style={{ paddingBottom: 0 }}><Alert type="error">{uploadError}</Alert></div>}
      {loading ? (
        <Loading rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : files.length === 0 ? (
        <Empty
          title="No files yet"
          hint="Upload designs, documents or deliverables — everyone on the project can download them."
          action={<Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>Upload a file</Button>}
        />
      ) : (
        <div>
          {files.map((f) => (
            <div key={f.id} className="list-item" style={{ opacity: busyId === f.id ? 0.6 : 1 }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="small truncate" style={{ fontWeight: 600 }}>{f.filename}</div>
                <div className="tiny muted">
                  {formatBytes(f.size)} · {f.uploader_name} · {formatDateTime(f.created_at)}
                </div>
              </div>
              <a className="btn secondary sm" href={`/api/projects/${project.id}/files/${f.id}/download`}>
                Download
              </a>
              {canDelete(f) && (
                <button className="btn ghost sm" onClick={() => remove(f)} aria-label={`Delete ${f.filename}`}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
      {dialog}
    </Card>
  );
}
