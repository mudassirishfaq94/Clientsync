import { Link, Navigate, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useFetch } from '../../lib/hooks.jsx';
import {
  Avatar, Badge, Button, Card, ErrorState, Loading, Tabs,
  formatDate, isOverdue, label, STATUS_TONE,
} from '../../components/ui.jsx';

const SECTIONS = ['', 'tasks', 'milestones', 'files', 'messages', 'approvals'];

export function useProject() {
  return useOutletContext();
}

export default function ProjectLayout() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, loading, error, reload, setData } = useFetch(`/api/projects/${id}`);

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
            <Link className="btn secondary sm" to="/projects">Back to projects</Link>
          </div>
        </Card>
      </main>
    );
  }

  const { project, members, my_role: myRole } = data;

  // Clients get the streamlined portal for this project.
  if (myRole === 'client' && !location.pathname.startsWith('/client/')) {
    // still allow full workspace, but offer the portal link below
  }

  const sub = location.pathname.split('/')[3] || '';
  if (!SECTIONS.includes(sub)) return <Navigate to={`/projects/${id}`} replace />;

  const ctx = {
    project,
    members,
    myRole,
    reload,
    onProjectChange: (p) => setData((d) => ({ ...d, project: p })),
    refreshProject: () => reload(true),
  };

  const tabItems = [
    { value: '', label: 'Overview' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'milestones', label: 'Milestones' },
    { value: 'files', label: 'Files' },
    { value: 'messages', label: 'Messages' },
    { value: 'approvals', label: 'Approvals', count: project.pending_approvals },
  ];

  return (
    <main className="container page stack gap-16">
      <div className="stack gap-8">
        <Link className="small muted" to="/projects">← All projects</Link>
        <div className="row-between">
          <div className="stack gap-8">
            <h1 style={{ fontSize: 22 }}>{project.name}</h1>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <Badge tone={STATUS_TONE[project.status]}>{label(project.status)}</Badge>
              <Badge tone={myRole === 'client' ? 'blue' : 'brand'}>You: {label(myRole)}</Badge>
              <span className={`tiny ${isOverdue(project.due_date, project.status) ? 'overdue' : 'muted'}`}>
                Due {formatDate(project.due_date)}
                {isOverdue(project.due_date, project.status) ? ' · overdue' : ''}
              </span>
            </div>
          </div>
          <div className="row gap-8">
            <div className="avatar-stack">
              {members.slice(0, 4).map((m) => (
                <Avatar key={m.id} name={m.name} size={30} title={`${m.name} (${label(m.role)})`} />
              ))}
            </div>
            {myRole === 'client' && (
              <Link className="btn secondary sm" to={`/client/${project.id}`}>Simple view</Link>
            )}
          </div>
        </div>
      </div>

      <Tabs
        items={tabItems}
        value={sub}
        ariaLabel="Project sections"
        onChange={(v) => navigate(v ? `/projects/${id}/${v}` : `/projects/${id}`)}
      />

      <Outlet context={ctx} />
    </main>
  );
}
