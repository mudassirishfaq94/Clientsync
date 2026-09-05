import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../lib/hooks.jsx';
import { Badge, Card, ErrorState, Loading, formatDate, label, STATUS_TONE } from '../components/ui.jsx';
import Overview from '../components/project/Overview.jsx';
import Tasks from '../components/project/Tasks.jsx';
import Milestones from '../components/project/Milestones.jsx';
import Files from '../components/project/Files.jsx';
import Messages from '../components/project/Messages.jsx';
import Approvals from '../components/project/Approvals.jsx';

const TABS = [
  ['overview', 'Overview'],
  ['tasks', 'Tasks'],
  ['milestones', 'Milestones'],
  ['files', 'Files'],
  ['messages', 'Messages'],
  ['approvals', 'Approvals'],
];

export default function ProjectPage() {
  const { id } = useParams();
  const { data, loading, error, reload, setData } = useFetch(`/api/projects/${id}`);
  const [tab, setTab] = useState('overview');

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
        <Card>
          <ErrorState
            error={error.status === 404 ? { message: 'This project does not exist or you do not have access to it.' } : error}
            onRetry={error.status === 404 ? null : reload}
          />
          <div className="card-pad center">
            <Link className="btn secondary sm" to="/dashboard">Back to projects</Link>
          </div>
        </Card>
      </main>
    );
  }

  const { project, members, my_role: myRole } = data;
  const onProjectChange = (p) => setData((d) => ({ ...d, project: p }));
  const refreshProject = () => reload(true);

  return (
    <main className="container page stack gap-16">
      <div className="stack gap-8">
        <Link className="small muted" to="/dashboard">← All projects</Link>
        <div className="row-between">
          <div className="stack gap-8">
            <h1 style={{ fontSize: 22 }}>{project.name}</h1>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <Badge tone={STATUS_TONE[project.status]}>{label(project.status)}</Badge>
              <Badge tone={myRole === 'client' ? 'blue' : 'brand'}>You: {label(myRole)}</Badge>
              <span className="tiny muted">Due {formatDate(project.due_date)}</span>
              {project.pending_approvals > 0 && <Badge tone="amber">{project.pending_approvals} pending approval</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([key, title]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {title}
            {key === 'approvals' && project.pending_approvals > 0 ? ` (${project.pending_approvals})` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <Overview project={project} members={members} myRole={myRole} reload={reload} onProjectChange={onProjectChange} />
      )}
      {tab === 'tasks' && <Tasks project={project} members={members} myRole={myRole} onChanged={refreshProject} />}
      {tab === 'milestones' && <Milestones project={project} myRole={myRole} />}
      {tab === 'files' && <Files project={project} myRole={myRole} />}
      {tab === 'messages' && <Messages project={project} />}
      {tab === 'approvals' && <Approvals project={project} myRole={myRole} onChanged={refreshProject} />}
    </main>
  );
}
