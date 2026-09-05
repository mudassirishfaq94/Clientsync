import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/hooks.jsx';
import Topbar from './components/Topbar.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectsList from './pages/ProjectsList.jsx';
import ProjectLayout from './pages/project/ProjectLayout.jsx';
import ProjectOverview from './pages/project/ProjectOverview.jsx';
import ProjectTasks from './pages/project/ProjectTasks.jsx';
import ProjectMilestones from './pages/project/ProjectMilestones.jsx';
import ProjectFiles from './pages/project/ProjectFiles.jsx';
import ProjectMessages from './pages/project/ProjectMessages.jsx';
import ProjectApprovals from './pages/project/ProjectApprovals.jsx';
import ClientPortal from './pages/ClientPortal.jsx';
import Settings from './pages/Settings.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

function FullPageSpinner() {
  return (
    <div className="page container center" style={{ paddingTop: 80 }}>
      <div className="row" style={{ justifyContent: 'center' }}>
        <span className="spinner" />
        <span className="muted">Loading ClientSync…</span>
      </div>
    </div>
  );
}

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/auth/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <Topbar />
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* /auth */}
        <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/auth/register" element={<GuestOnly><Register /></GuestOnly>} />
        {/* legacy paths */}
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/register" replace />} />

        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/projects" element={<Protected><ProjectsList /></Protected>} />

        {/* /projects/[id] with nested sections */}
        <Route path="/projects/:id" element={<Protected><ProjectLayout /></Protected>}>
          <Route index element={<ProjectOverview />} />
          <Route path="tasks" element={<ProjectTasks />} />
          <Route path="milestones" element={<ProjectMilestones />} />
          <Route path="files" element={<ProjectFiles />} />
          <Route path="messages" element={<ProjectMessages />} />
          <Route path="approvals" element={<ProjectApprovals />} />
        </Route>

        {/* /client/[projectId] — simplified client-facing portal */}
        <Route path="/client/:projectId" element={<Protected><ClientPortal /></Protected>} />

        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/settings/:section" element={<Protected><Settings /></Protected>} />
        <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
