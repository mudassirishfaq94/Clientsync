import { useFetch } from '../lib/hooks.jsx';
import { Badge, Card, CardHead, Empty, ErrorState, Loading, formatDate, label, STATUS_TONE } from '../components/ui.jsx';

export default function Admin() {
  const { data, loading, error, reload } = useFetch('/api/admin/overview');

  if (loading) {
    return (
      <main className="container page">
        <Card><Loading rows={6} /></Card>
      </main>
    );
  }
  if (error) {
    return (
      <main className="container page">
        <Card><ErrorState error={error} onRetry={reload} /></Card>
      </main>
    );
  }

  const { stats, users, projects } = data;
  const tiles = [
    ['Users', stats.users],
    ['Freelancers', stats.freelancers],
    ['Clients', stats.clients],
    ['Projects', stats.projects],
    ['Active projects', stats.active_projects],
    ['Completed', stats.completed_projects],
    ['Pending approvals', stats.pending_approvals],
    ['Files stored', stats.files],
  ];

  return (
    <main className="container page stack gap-24">
      <div className="stack gap-8">
        <h1 style={{ fontSize: 24 }}>System overview</h1>
        <p className="small muted">Platform-wide metrics. Project contents remain private to their members.</p>
      </div>

      <div className="grid grid-cards">
        {tiles.map(([t, v]) => (
          <Card key={t} className="card-pad stack gap-8">
            <span className="small muted">{t}</span>
            <span style={{ fontSize: 24, fontWeight: 700 }}>{v}</span>
          </Card>
        ))}
      </div>

      <Card>
        <CardHead title="Users" subtitle={`${users.length} most recent`} />
        {users.length === 0 ? (
          <Empty title="No users yet" />
        ) : (
          users.map((u) => (
            <div key={u.id} className="list-item">
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="small" style={{ fontWeight: 600 }}>{u.name}</div>
                <div className="tiny muted truncate">{u.email}</div>
              </div>
              <Badge tone={u.role === 'client' ? 'blue' : u.role === 'admin' ? 'red' : 'brand'}>{label(u.role)}</Badge>
              <span className="tiny muted hide-sm">{formatDate(u.created_at)}</span>
            </div>
          ))
        )}
      </Card>

      <Card>
        <CardHead title="Projects" subtitle={`${projects.length} most recent`} />
        {projects.length === 0 ? (
          <Empty title="No projects yet" />
        ) : (
          projects.map((p) => (
            <div key={p.id} className="list-item">
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="small truncate" style={{ fontWeight: 600 }}>{p.name}</div>
                <div className="tiny muted">Owner: {p.owner_name}</div>
              </div>
              <Badge tone={STATUS_TONE[p.status]}>{label(p.status)}</Badge>
            </div>
          ))
        )}
      </Card>
    </main>
  );
}
