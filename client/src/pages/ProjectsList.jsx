import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth, useFetch } from '../lib/hooks.jsx';
import NewProjectModal from '../components/NewProjectModal.jsx';
import {
  Badge, Button, Card, Empty, ErrorState, Input, Progress, Select, SkeletonCard,
  formatDate, isOverdue, label, STATUS_TONE,
} from '../components/ui.jsx';

function ProjectCard({ p }) {
  return (
    <Card className="card-pad stack gap-12">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <Link to={`/projects/${p.id}`} style={{ fontWeight: 650, color: 'var(--text)', fontSize: 15 }}>
          {p.name}
        </Link>
        <Badge tone={STATUS_TONE[p.status]}>{label(p.status)}</Badge>
      </div>
      <p className="small muted" style={{ minHeight: 20 }}>{p.description || 'No description yet.'}</p>
      <div className="stack gap-8">
        <div className="row-between tiny muted">
          <span>{p.task_done}/{p.task_total} tasks done</span>
          <span>{p.progress}%</span>
        </div>
        <Progress value={p.progress} />
      </div>
      <div className="row-between">
        <span className={`tiny ${isOverdue(p.due_date, p.status) ? 'overdue' : 'muted'}`}>
          Due {formatDate(p.due_date)}
        </span>
        {p.pending_approvals > 0 && <Badge tone="amber">{p.pending_approvals} awaiting approval</Badge>}
      </div>
      <Link className="btn secondary sm" to={`/projects/${p.id}`}>Open workspace</Link>
    </Card>
  );
}

export default function ProjectsList() {
  const { user } = useAuth();
  const isClient = user.role === 'client';
  const { data, loading, error, reload, setData } = useFetch('/api/projects');
  const [params, setParams] = useSearchParams();
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  // Support /projects?new=1 deep link from the dashboard.
  useEffect(() => {
    if (params.get('new') === '1' && !isClient) {
      setShowNew(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, isClient]);

  const projects = data?.projects || [];
  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          (filter === 'all' || p.status === filter) &&
          (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
      ),
    [projects, filter, q]
  );

  return (
    <main className="container page stack gap-24">
      <div className="row-between">
        <div className="stack gap-8">
          <h1 style={{ fontSize: 24 }}>Projects</h1>
          <p className="small muted">
            {isClient ? 'Everything being delivered to you.' : 'Your client workspaces, from brief to completion.'}
          </p>
        </div>
        {!isClient && <Button onClick={() => setShowNew(true)}>+ New project</Button>}
      </div>

      <Card>
        <div className="card-head">
          <div className="row gap-8 grow" style={{ flexWrap: 'wrap' }}>
            <Input
              placeholder="Search projects…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 260 }}
              aria-label="Search projects"
            />
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 170 }} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
          {!loading && !error && (
            <span className="tiny muted">{visible.length} of {projects.length}</span>
          )}
        </div>

        {loading ? (
          <div className="card-pad grid grid-cards">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : projects.length === 0 ? (
          <Empty
            title={isClient ? 'No projects shared with you yet' : 'No projects yet'}
            hint={
              isClient
                ? 'Once a freelancer adds you to a project, it will appear here.'
                : 'Create your first project to capture requirements and invite your client.'
            }
            action={!isClient && <Button onClick={() => setShowNew(true)}>Create your first project</Button>}
          />
        ) : visible.length === 0 ? (
          <Empty
            title="No matching projects"
            hint="Try a different search term or status filter."
            action={<Button variant="secondary" size="sm" onClick={() => { setQ(''); setFilter('all'); }}>Clear filters</Button>}
          />
        ) : (
          <div className="card-pad grid grid-cards">
            {visible.map((p) => <ProjectCard key={p.id} p={p} />)}
          </div>
        )}
      </Card>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={(p) => setData((d) => ({ projects: [p, ...(d?.projects || [])] }))}
        />
      )}
    </main>
  );
}
