import { Link } from 'react-router-dom';
import { useAuth, useFetch } from '../lib/hooks.jsx';
import {
  Avatar, Badge, Button, Card, CardHead, Empty, ErrorState, Loading, Progress, Skeleton,
  formatDate, isOverdue, label, STATUS_TONE, timeAgo,
} from '../components/ui.jsx';

/** Every tile below is rendered from a value the API computed from real rows. */
function StatTile({ title, value, tone, hint }) {
  return (
    <Card className="card-pad stack gap-8">
      <span className="small muted">{title}</span>
      <span className="stat-value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</span>
      {hint && <span className="tiny muted">{hint}</span>}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isClient = user.role === 'client';
  const summary = useFetch('/api/projects/stats/summary');
  const projects = useFetch('/api/projects');

  const stats = summary.data?.stats;
  const list = projects.data?.projects || [];
  const recent = list.slice(0, 6);

  const loading = summary.loading || projects.loading;
  const error = summary.error || projects.error;

  return (
    <main className="container page stack gap-24">
      <div className="row-between">
        <div className="stack gap-8">
          <h1 style={{ fontSize: 24 }}>
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="small muted">
            {isClient
              ? 'Progress on the work being delivered to you.'
              : 'A live view of your projects, tasks and client approvals.'}
          </p>
        </div>
        <div className="row gap-8">
          <Link className="btn secondary" to="/projects">All projects</Link>
          {!isClient && <Link className="btn" to="/projects?new=1">+ New project</Link>}
        </div>
      </div>

      {loading ? (
        <div className="stat-grid">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="card-pad stack gap-8">
              <Skeleton width="60%" height={12} />
              <Skeleton width="40%" height={26} />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={() => { summary.reload(); projects.reload(); }} /></Card>
      ) : (
        <>
          <div className="stat-grid">
            <StatTile title="Active projects" value={stats.projects_active} hint={`${stats.projects_total} total`} />
            <StatTile
              title="Tasks completed"
              value={`${stats.tasks_done}/${stats.tasks_total}`}
              hint={stats.tasks_overdue > 0 ? `${stats.tasks_overdue} overdue` : 'Nothing overdue'}
            />
            <StatTile
              title="Approvals pending"
              value={stats.approvals_pending}
              tone={stats.approvals_pending > 0 ? 'amber' : undefined}
              hint={isClient ? 'Waiting on you' : 'Waiting on your client'}
            />
            <StatTile
              title={isClient ? 'Projects overdue' : 'Open tasks assigned to me'}
              value={isClient ? stats.projects_overdue : stats.tasks_assigned_to_me_open}
              tone={(isClient ? stats.projects_overdue : 0) > 0 ? 'red' : undefined}
            />
          </div>

          {stats.approvals_pending > 0 && isClient && (
            <Card className="card-pad row-between">
              <div>
                <div style={{ fontWeight: 600 }}>
                  {stats.approvals_pending} item{stats.approvals_pending > 1 ? 's' : ''} need your review
                </div>
                <div className="small muted">Approve the work or request changes so the project can move forward.</div>
              </div>
              <Link className="btn" to="/projects">Review now</Link>
            </Card>
          )}

          <Card>
            <CardHead
              title="Recent projects"
              subtitle={list.length ? `${list.length} in total` : undefined}
              actions={list.length > 6 ? <Link className="btn secondary sm" to="/projects">View all</Link> : null}
            />
            {list.length === 0 ? (
              <Empty
                title={isClient ? 'No projects shared with you yet' : 'No projects yet'}
                hint={
                  isClient
                    ? 'When a freelancer adds you to a project, it will appear here.'
                    : 'Create your first project to capture requirements and invite your client.'
                }
                action={!isClient && <Link className="btn" to="/projects?new=1">Create your first project</Link>}
              />
            ) : (
              <div>
                {recent.map((p) => (
                  <div key={p.id} className="list-item">
                    <Avatar name={p.name} size={34} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                        <Link to={`/projects/${p.id}`} style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {p.name}
                        </Link>
                        <Badge tone={STATUS_TONE[p.status]}>{label(p.status)}</Badge>
                        {p.pending_approvals > 0 && <Badge tone="amber">{p.pending_approvals} to approve</Badge>}
                      </div>
                      <div className="stack gap-8" style={{ marginTop: 6 }}>
                        <Progress value={p.progress} />
                        <div className="row-between tiny muted">
                          <span>{p.task_done}/{p.task_total} tasks</span>
                          <span className={isOverdue(p.due_date, p.status) ? 'overdue' : ''}>
                            Due {formatDate(p.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link className="btn secondary sm hide-sm" to={`/projects/${p.id}`}>Open</Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
