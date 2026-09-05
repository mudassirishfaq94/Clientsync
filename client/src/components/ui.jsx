import { useEffect } from 'react';

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHead({ title, subtitle, actions }) {
  return (
    <div className="card-head">
      <div>
        <div className="card-title">{title}</div>
        {subtitle && <div className="small muted">{subtitle}</div>}
      </div>
      {actions && <div className="row gap-8">{actions}</div>}
    </div>
  );
}

export function Button({ children, loading, variant, size, className = '', ...rest }) {
  return (
    <button
      className={`btn ${variant || ''} ${size || ''} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <span className={`spinner ${variant && variant !== 'secondary' && variant !== 'ghost' ? 'on-dark' : ''}`} />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children, id }) {
  return (
    <div className="field">
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="tiny muted">{hint}</span> : null}
    </div>
  );
}

export function Input({ error, ...rest }) {
  return <input className={`input ${error ? 'invalid' : ''}`} {...rest} />;
}
export function Textarea({ error, ...rest }) {
  return <textarea className={`textarea ${error ? 'invalid' : ''}`} {...rest} />;
}
export function Select({ error, children, ...rest }) {
  return (
    <select className={`select ${error ? 'invalid' : ''}`} {...rest}>
      {children}
    </select>
  );
}

export function Alert({ type = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`alert ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = '' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Empty({ title, hint, action }) {
  return (
    <div className="empty stack gap-12">
      <div>
        <h4>{title}</h4>
        {hint && <div className="small">{hint}</div>}
      </div>
      {action && <div className="row" style={{ justifyContent: 'center' }}>{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="card-pad stack gap-12" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 16, width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty stack gap-12">
      <div>
        <h4>Couldn’t load this</h4>
        <div className="small">{error?.message || 'Unexpected error.'}</div>
      </div>
      {onRetry && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <Button variant="secondary" size="sm" onClick={() => onRetry()}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3 style={{ fontSize: 16 }}>{title}</h3>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Progress({ value }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export const STATUS_TONE = {
  active: 'blue', on_hold: 'amber', completed: 'green', archived: '',
  todo: '', in_progress: 'blue', review: 'amber', done: 'green',
  pending: 'amber', approved: 'green', changes_requested: 'red',
  low: '', medium: 'blue', high: 'red',
};

export const label = (s) => (s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v.includes('T') || v.includes(' ') ? v.replace(' ', 'T') + (v.includes('Z') ? '' : 'Z') : v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(v) {
  if (!v) return '—';
  const d = new Date(v.replace(' ', 'T') + (v.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatBytes(n) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}
