import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/hooks.jsx';
import Topbar from './components/Topbar.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectPage from './pages/ProjectPage.jsx';
import Admin from './pages/Admin.jsx';

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
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/projects/:id" element={<Protected><ProjectPage /></Protected>} />
        <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
