import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/overview', (_req, res) => {
  const stats = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) users,
        (SELECT COUNT(*) FROM users WHERE role='freelancer') freelancers,
        (SELECT COUNT(*) FROM users WHERE role='client') clients,
        (SELECT COUNT(*) FROM projects) projects,
        (SELECT COUNT(*) FROM projects WHERE status='active') active_projects,
        (SELECT COUNT(*) FROM projects WHERE status='completed') completed_projects,
        (SELECT COUNT(*) FROM approvals WHERE status='pending') pending_approvals,
        (SELECT COUNT(*) FROM files) files`
    )
    .get();

  const users = db
    .prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 100')
    .all();

  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.status, p.created_at, u.name owner_name
       FROM projects p JOIN users u ON u.id = p.created_by
       ORDER BY p.created_at DESC LIMIT 100`
    )
    .all();

  res.json({ stats, users, projects });
});

export default router;
