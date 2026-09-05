import { Link, Navigate, useParams } from 'react-router-dom';
import { useFetch } from '../lib/hooks.jsx';
import Approvals from '../components/project/Approvals.jsx';
import Messages from '../components/project/Messages.jsx';
import {
  Badge, Card, CardHead, Empty, ErrorState, Loading, Progress,
  formatDate, isOverdue, label, STATUS_TONE, timeAgo,
} from '../components/ui.jsx';

/**
 * /client/[projectId] — a focused, low-noise view for clients:
 * what is happening, what needs their decision, and how to reach the freelancer.
 */
export default function ClientPortal() {
  const { projectId } = useParams();
  const { data, loading, error, reload, setData } = useFetch(`/api/projects/${projectId}`);
  const milestones = useFetch(`/api/projects/${projectId}/milestones`);
  const activity = useFetch(`/api/projects/${projectId}/activity`);

  if (loading) {
    return (
      <main className="container page">
        <Card><Loading rows={6} /></Card>
      </main>
    );
  }

  if (error) {
    const notFound = error.status === 404;
    return (
      <main className="container page">
        <Card>
          <ErrorState
            title={notFound ? 'Project not available' : 'Couldn’t load this project'}
            error={notFound ? { message: 'This project does not exist, or you do not have access to it.' } : error}
            onRetry={notFound ? null : reload}
          />
          <div className="card-pad center">
            <Link className="btn secondary sm" to="/dashboard">Back to dashboard</Link>
          </div>
        </Card>
      </main>
    );
  }

  const { project, members, my_role: myRole } = data;

  // The portal is for clients; anyone else belongs in the full workspace.
  if (myRole !== 'client') return <Navigate to={`/projects/${projectId}`} replace />;

  const freelancers = members.filter((m) => m.role === 'freelancer');
  const ms = milestones.data?.milestones || [];

  return (
    <main className="container page stack gap-16">
      <Link className="small muted" to="/dashboard">← Back to dashboard</Link>

      <div className="portal-banner row-between">
        <div>
          <h1>{project.name}</h1>
          <p>
            {project.description || 'Your project workspace.'}
          </p>
        </div>
        <Link className="btn secondary sm" to={`/projects/${project.id}`}>Full workspace</Link>
      </div>

      <div className="split">
        <div className="stack gap-16">
          {project.pending_approvals > 0 && (
            <Card className="card-pad">
              <div className="row-between">
                <div>
                  <div style={{ fontWeight: 650 }}>
                    {project.pending_approvals} item{project.pending_approvals > 1 ? 's' : ''} awaiting your decision
                  </div>
                  <div className="small muted">Review below and approve or request changes.</div>
                </div>
                <Badge tone="amber">Action needed</Badge>
              </div>
            </Card>
          )}

          <Approvals project={project} myRole={myRole} onChanged={() => reload(true)} />
          <Messages project={project} />
        </div>

        <div className="stack gap-16">
          <Card className="card-pad stack gap-12">
            <div className="row-between">
              <span className="card-title">Progress</span>
              <Badge tone={STATUS_TONE[project.status]}>{label(project.status)}</Badge>
            </div>
            <Progress value={project.progress} />
            <div className="row-between tiny muted">
              <span>{project.task_done}/{project.task_total} tasks complete</span>
              <span>{project.progress}%</span>
            </div>
            <div className="row-between small">
              <span className="muted">Due date</span>
              <span className={isOverdue(project.due_date, project.status) ? 'overdue' : ''}>
                {formatDate(project.due_date)}
              </span>
            </div>
          </Card>

          <Card>
            <CardHead title="Milestones" />
            {milestones.loading ? (
              <Loading rows={2} />
            ) : ms.length === 0 ? (
              <Empty title="No milestones yet" hint="Your freelancer has not set phases." />
            ) : (
              ms.map((m) => (
                <div key={m.id} className="list-item">
                  <div className="grow">
                    <div className="small" style={{ fontWeight: 600 }}>{m.title}</div>
                    <div className="tiny muted">Due {formatDate(m.due_date)}</div>
                  </div>
                  <Badge tone={STATUS_TONE[m.status]}>{label(m.status)}</Badge>
                </div>
              ))
            )}
          </Card>

          <Card>
            <CardHead title="Your team" />
            {freelancers.map((m) => (
              <div key={m.id} className="list-item">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="small" style={{ fontWeight: 600 }}>{m.name}</div>
                  <div className="tiny muted truncate">{m.email}</div>
                </div>
                <Badge tone="brand">{label(m.role)}</Badge>
              </div>
            ))}
          </Card>

          <Card>
            <CardHead title="Latest updates" />
            {activity.loading ? (
              <Loading rows={2} />
            ) : (activity.data?.activity || []).length === 0 ? (
              <Empty title="No activity yet" />
            ) : (
              activity.data.activity.slice(0, 8).map((a) => (
                <div key={a.id} className="list-item">
                  <div className="grow">
                    <div className="small"><strong>{a.actor_name || 'Someone'}</strong> {a.action}</div>
                    <div className="tiny muted">{timeAgo(a.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
