import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, projectAccess } from '../auth.js';
import { newId, validate, logActivity } from '../util.js';

const router = Router();
router.use(requireAuth);

const dateStr = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD')
  .optional()
  .or(z.literal('').transform(() => undefined));

function projectSummary(p, userId) {
  const counts = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM tasks WHERE project_id = ?) total,
         (SELECT COUNT(*) FROM tasks WHERE project_id = ? AND status = 'done') done,
         (SELECT COUNT(*) FROM approvals WHERE project_id = ? AND status = 'pending') pending_approvals`
    )
    .get(p.id, p.id, p.id);
  const role = db
    .prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(p.id, userId)?.role;
  return {
    ...p,
    task_total: counts.total,
    task_done: counts.done,
    pending_approvals: counts.pending_approvals,
    progress: counts.total ? Math.round((counts.done / counts.total) * 100) : 0,
    my_role: role || 'admin',
  };
}

router.get('/', (req, res) => {
  const rows =
    req.user.role === 'admin'
      ? db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all()
      : db
          .prepare(
            `SELECT p.* FROM projects p
             JOIN project_members m ON m.project_id = p.id
             WHERE m.user_id = ? ORDER BY p.created_at DESC`
          )
          .all(req.user.id);
  res.json({ projects: rows.map((p) => projectSummary(p, req.user.id)) });
});

const createSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(120),
  description: z.string().trim().max(2000).optional().default(''),
  requirements: z.string().trim().max(10000).optional().default(''),
  due_date: dateStr,
  client_email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid client email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

router.post('/', (req, res) => {
  if (req.user.role === 'client') {
    return res.status(403).json({ error: 'Clients cannot create projects.' });
  }
  const data = validate(createSchema, req.body, res);
  if (!data) return;

  let ws = db.prepare('SELECT * FROM workspaces WHERE owner_id = ?').get(req.user.id);
  if (!ws) {
    const id = newId();
    db.prepare('INSERT INTO workspaces (id, name, owner_id) VALUES (?,?,?)').run(
      id,
      `${req.user.name.split(' ')[0]}'s Workspace`,
      req.user.id
    );
    db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?,?,?)').run(
      id,
      req.user.id,
      'owner'
    );
    ws = { id };
  }

  let client = null;
  if (data.client_email) {
    client = db.prepare('SELECT * FROM users WHERE email = ?').get(data.client_email);
    if (!client) {
      return res.status(400).json({
        error: 'No client account found with that email. Ask them to sign up first.',
        fields: { client_email: 'No registered user with this email' },
      });
    }
    if (client.role !== 'client') {
      return res
        .status(400)
        .json({ error: 'That user is not a client account.', fields: { client_email: 'Not a client account' } });
    }
  }

  const id = newId();
  db.prepare(
    `INSERT INTO projects (id, workspace_id, name, description, requirements, due_date, created_by)
     VALUES (?,?,?,?,?,?,?)`
  ).run(id, ws.id, data.name, data.description, data.requirements, data.due_date || null, req.user.id);
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?)').run(
    id,
    req.user.id,
    'freelancer'
  );
  if (client) {
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?)').run(
      id,
      client.id,
      'client'
    );
  }
  logActivity(id, req.user.id, `created the project`);
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json({ project: projectSummary(p, req.user.id) });
});

router.get('/:projectId', projectAccess(), (req, res) => {
  const members = db
    .prepare(
      `SELECT u.id, u.name, u.email, m.role FROM project_members m
       JOIN users u ON u.id = m.user_id WHERE m.project_id = ?`
    )
    .all(req.project.id);
  res.json({
    project: projectSummary(req.project, req.user.id),
    members,
    my_role: req.isAdmin && !members.find((m) => m.id === req.user.id) ? 'admin' : req.membership.role,
  });
});

const updateSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  requirements: z.string().trim().max(10000).optional(),
  due_date: dateStr.nullable(),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']).optional(),
});

router.patch('/:projectId', projectAccess({ freelancerOnly: true }), (req, res) => {
  const data = validate(updateSchema, req.body, res);
  if (!data) return;

  if (data.status === 'completed') {
    const pending = db
      .prepare("SELECT COUNT(*) c FROM approvals WHERE project_id = ? AND status = 'pending'")
      .get(req.project.id).c;
    if (pending > 0) {
      return res.status(409).json({
        error: `Cannot complete: ${pending} approval${pending > 1 ? 's are' : ' is'} still pending client review.`,
      });
    }
    const openTasks = db
      .prepare("SELECT COUNT(*) c FROM tasks WHERE project_id = ? AND status != 'done'").get(req.project.id).c;
    if (openTasks > 0) {
      return res.status(409).json({ error: `Cannot complete: ${openTasks} task(s) are not done yet.` });
    }
  }

  const fields = [];
  const values = [];
  for (const k of ['name', 'description', 'requirements', 'due_date', 'status']) {
    if (k in data && data[k] !== undefined) {
      fields.push(`${k} = ?`);
      values.push(data[k]);
    }
  }
  if (data.status === 'completed') {
    fields.push('completed_at = datetime(\'now\')');
  } else if (data.status) {
    fields.push('completed_at = NULL');
  }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update.' });

  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values, req.project.id);
  if (data.status) logActivity(req.project.id, req.user.id, `set project status to ${data.status}`);
  else logActivity(req.project.id, req.user.id, 'updated project details');

  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.project.id);
  res.json({ project: projectSummary(p, req.user.id) });
});

router.delete('/:projectId', projectAccess({ freelancerOnly: true }), (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.project.id);
  res.json({ ok: true });
});

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

router.post('/:projectId/members', projectAccess({ freelancerOnly: true }), (req, res) => {
  const data = validate(inviteSchema, req.body, res);
  if (!data) return;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);
  if (!user) {
    return res
      .status(404)
      .json({ error: 'No account with that email.', fields: { email: 'User not found — ask them to sign up' } });
  }
  const existing = db
    .prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(req.project.id, user.id);
  if (existing) return res.status(409).json({ error: 'That person is already on this project.' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?)').run(
    req.project.id,
    user.id,
    user.role === 'client' ? 'client' : 'freelancer'
  );
  logActivity(req.project.id, req.user.id, `added ${user.name} to the project`);
  res.status(201).json({ member: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.delete('/:projectId/members/:userId', projectAccess({ freelancerOnly: true }), (req, res) => {
  if (req.params.userId === req.project.created_by) {
    return res.status(400).json({ error: 'The project owner cannot be removed.' });
  }
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(
    req.project.id,
    req.params.userId
  );
  res.json({ ok: true });
});

router.get('/:projectId/activity', projectAccess(), (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, u.name actor_name FROM activity a LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.project_id = ? ORDER BY a.created_at DESC, a.rowid DESC LIMIT 50`
    )
    .all(req.project.id);
  res.json({ activity: rows });
});

export default router;
