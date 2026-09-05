import jwt from 'jsonwebtoken';
import { db } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'clientsync-dev-secret-change-me';
const COOKIE = 'cs_token';

export function issueToken(res, user) {
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 3600 * 1000,
    path: '/',
  });
}

export function clearToken(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

export function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      const { sub } = jwt.verify(token, JWT_SECRET);
      req.user = db
        .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
        .get(sub);
    } catch {
      /* invalid token -> anonymous */
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

/** Attaches req.project and req.membership; 404s for non-members so data is never leaked. */
export function projectAccess(options = {}) {
  return (req, res, next) => {
    const id = req.params.projectId || req.params.id;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const member = db
      .prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?')
      .get(project.id, req.user.id);

    if (!member && req.user.role !== 'admin') {
      return res.status(404).json({ error: 'Project not found' });
    }
    req.project = project;
    req.membership = member || { role: 'freelancer', project_id: project.id, user_id: req.user.id };
    req.isAdmin = req.user.role === 'admin';

    if (options.freelancerOnly && req.membership.role !== 'freelancer' && !req.isAdmin) {
      return res.status(403).json({ error: 'Only the project freelancer can do this' });
    }
    if (options.clientOnly && req.membership.role !== 'client' && !req.isAdmin) {
      return res.status(403).json({ error: 'Only the project client can do this' });
    }
    next();
  };
}
