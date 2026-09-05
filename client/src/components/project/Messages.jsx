import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth, useFetch, useToast } from '../../lib/hooks.jsx';
import { Alert, Button, Card, CardHead, Empty, ErrorState, Loading, Textarea, formatDateTime } from '../ui.jsx';

export default function Messages({ project }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/api/projects/${project.id}/messages`);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef(null);
  const messages = data?.messages || [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const t = setInterval(() => reload(true), 10000);
    return () => clearInterval(t);
  }, [reload]);

  async function send(ev) {
    ev.preventDefault();
    setSendError('');
    if (!body.trim()) {
      setSendError('Write a message before sending.');
      return;
    }
    setSending(true);
    try {
      await api.post(`/api/projects/${project.id}/messages`, { body: body.trim() });
      setBody('');
      await reload(true);
    } catch (err) {
      setSendError(err.message);
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHead title="Messages" subtitle="Project conversation — everyone on the project can see it." />
      {loading ? (
        <Loading rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : messages.length === 0 ? (
        <Empty title="No messages yet" hint="Start the conversation — questions, updates, feedback." />
      ) : (
        <div className="chat-scroll" ref={scrollRef}>
          {messages.map((m) => {
            const mine = m.author_id === user.id;
            return (
              <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
                <span className="tiny muted">
                  {mine ? 'You' : m.author_name} · {formatDateTime(m.created_at)}
                </span>
                <div className={`bubble ${mine ? 'mine' : ''}`}>{m.body}</div>
              </div>
            );
          })}
        </div>
      )}
      <form className="card-pad stack gap-8" onSubmit={send} style={{ borderTop: '1px solid var(--border)' }} noValidate>
        {sendError && <Alert type="error">{sendError}</Alert>}
        <Textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); setSendError(''); }}
          placeholder="Write a message…"
          style={{ minHeight: 68 }}
          maxLength={5000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e);
          }}
        />
        <div className="row-between">
          <span className="tiny muted">{body.length}/5000 · Ctrl+Enter to send</span>
          <Button type="submit" size="sm" loading={sending} disabled={sending || !body.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
