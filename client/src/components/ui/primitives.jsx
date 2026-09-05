import { useEffect, useId, useRef, useState } from 'react';

/* ---------------- Card ---------------- */
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

/* ---------------- Button ---------------- */
export function Button({ children, loading, variant, size, className = '', ...rest }) {
  const dark = variant && !['secondary', 'ghost'].includes(variant);
  return (
    <button className={`btn ${variant || ''} ${size || ''} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className={`spinner ${dark || !variant ? 'on-dark' : ''}`} />}
      {children}
    </button>
  );
}

/* ---------------- Form controls ---------------- */
export function Field({ label, error, hint, children, id, required }) {
  return (
    <div className="field">
      {label && (
        <label className="label" htmlFor={id}>
          {label}
          {required && <span style={{ color: 'var(--red)' }}> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="error-text" role="alert">{error}</span>
      ) : hint ? (
        <span className="tiny muted">{hint}</span>
      ) : null}
    </div>
  );
}

export function Input({ error, ...rest }) {
  return <input className={`input ${error ? 'invalid' : ''}`} aria-invalid={!!error} {...rest} />;
}
export function Textarea({ error, ...rest }) {
  return <textarea className={`textarea ${error ? 'invalid' : ''}`} aria-invalid={!!error} {...rest} />;
}
export function Select({ error, children, ...rest }) {
  return (
    <select className={`select ${error ? 'invalid' : ''}`} aria-invalid={!!error} {...rest}>
      {children}
    </select>
  );
}

/* ---------------- Alert / Badge ---------------- */
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

/* ---------------- Avatar ---------------- */
const AVATAR_PALETTE = ['#4f46e5', '#0e7490', '#b45309', '#be123c', '#15803d', '#7c3aed', '#0f766e', '#c2410c'];

export function avatarColorFor(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function Avatar({ name, color, size = 32, title }) {
  const bg = color || avatarColorFor(name || '');
  return (
    <span
      className="avatar"
      title={title || name}
      aria-label={name}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.4) }}
    >
      {initials(name)}
    </span>
  );
}

export { AVATAR_PALETTE };

/* ---------------- Tabs ---------------- */
export function Tabs({ items, value, onChange, ariaLabel = 'Sections' }) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          className={`tab ${value === it.value ? 'active' : ''}`}
          onClick={() => onChange(it.value)}
        >
          {it.label}
          {it.count > 0 && <span className="tab-count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Dropdown ---------------- */
export function Dropdown({ trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <span onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-controls={id}>
        {trigger}
      </span>
      {open && (
        <div className={`dropdown-menu ${align}`} id={id} role="menu">
          {items.map((it, i) =>
            it.separator ? (
              <div key={`sep-${i}`} className="dropdown-sep" role="separator" />
            ) : (
              <button
                key={it.label}
                role="menuitem"
                type="button"
                className={`dropdown-item ${it.danger ? 'danger' : ''}`}
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect?.();
                }}
              >
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ title, onClose, children, footer, size }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('input, textarea, select, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'lg' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h3 style={{ fontSize: 16 }}>{title}</h3>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close dialog" type="button">
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Confirm dialog ---------------- */
export function ConfirmDialog({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  loading,
  error,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : undefined} onClick={onConfirm} loading={loading} type="button">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="modal-body">
        {error && <Alert type="error">{error}</Alert>}
        <p className="small">{message}</p>
      </div>
    </Modal>
  );
}

/* ---------------- States ---------------- */
export function Empty({ title, hint, action, icon = '◍' }) {
  return (
    <div className="empty stack gap-12">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <div>
        <h4>{title}</h4>
        {hint && <div className="small">{hint}</div>}
      </div>
      {action && <div className="row" style={{ justifyContent: 'center' }}>{action}</div>}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function Loading({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="card-pad stack gap-12" aria-busy="true" aria-label={label} role="status">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width={`${90 - i * 12}%`} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card card-pad stack gap-12" aria-busy="true">
      <Skeleton width="60%" height={18} />
      <Skeleton width="90%" height={12} />
      <Skeleton width="100%" height={6} radius={99} />
      <Skeleton width="40%" height={12} />
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Couldn’t load this' }) {
  return (
    <div className="empty stack gap-12">
      <div className="empty-icon" aria-hidden="true">⚠</div>
      <div>
        <h4>{title}</h4>
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

export function Progress({ value }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ---------------- Formatting helpers ---------------- */
export const STATUS_TONE = {
  active: 'blue', on_hold: 'amber', completed: 'green', archived: '',
  todo: '', in_progress: 'blue', review: 'amber', done: 'green',
  pending: 'amber', approved: 'green', changes_requested: 'red',
  low: '', medium: 'blue', high: 'red',
};

export const label = (s) => (s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const toDate = (v) =>
  new Date(v.includes('T') ? v : v.includes(' ') ? `${v.replace(' ', 'T')}Z` : v);

export function formatDate(v) {
  if (!v) return '—';
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(v) {
  if (!v) return '—';
  const d = toDate(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(v) {
  if (!v) return '';
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return '';
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(v);
}

export function formatBytes(n) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function isOverdue(due, status) {
  if (!due || status === 'done' || status === 'completed' || status === 'archived') return false;
  return due < new Date().toISOString().slice(0, 10);
}
