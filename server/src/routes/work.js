import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, projectAccess } from '../auth.js';
import { newId, validate, logActivity } from '../util.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

const dateStr = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD')
  .optional()
  .or(z.literal('').transform(() => undefined));

/* ---------------- Milestones ---------------- */

router.get('/:projectId/milestones', projectAccess(), (req, res) => {
  const milestones = db
    .prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY position, created_at')
    .all(req.project.id);
  res.json({ milestones });
});

const milestoneSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(140),
  description: z.string().trim().max(2000).optional().default(''),
  due_date: dateStr,
});

router.post('/:projectId/milestones', projectAccess({ freelancerOnly: true }), (req, res) => {
  const data = validate(milestoneSchema, req.body, res);
  if (!data) return;
  const id = newId();
  const pos = db.prepare('SELECT COUNT(*) c FROM milestones WHERE project_id = ?').get(req.project.id).c;
  db.prepare(
    'INSERT INTO milestones (id, project_id, title, description, due_date, position) VALUES (?,?,?,?,?,?)'
  ).run(id, req.project.id, data.title, data.description, data.due_date || null, pos);
  logActivity(req.project.id, req.user.id, `added milestone "${data.title}"`);
  res.status(201).json({ milestone: db.prepare('SELECT * FROM milestones WHERE id = ?').get(id) });
});

router.patch('/:projectId/milestones/:mid', projectAccess({ freelancerOnly: true }), (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(2, 'Title must be at least 2 characters').max(140).optional(),
    description: z.string().trim().max(2000).optional(),
    due_date: z.string().trim().optional(),
    status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  }).refine((v) => !v.due_date || /^\d{4}-\d{2}-\d{2}$/.test(v.due_date), {
    message: 'Use format YYYY-MM-DD', path: ['due_date'],
  });
  const data = validate(schema, req.body, res);
  if (!data) return;
  const m = db
    .prepare('SELECT * FROM milestones WHERE id = ? AND project_id = ?')
    .get(req.params.mid, req.project.id);
  if (!m) return res.status(404).json({ error: 'Milestone not found' });

  const fields = [];
  const values = [];
  for (const k of ['title', 'description', 'due_date', 'status']) {
    if (data[k] !== undefined) {
      fields.push(`${k} = ?`);
      values.push(k === 'due_date' && data[k] === '' ? null : data[k]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update.' });
  db.prepare(`UPDATE milestones SET ${fields.join(', ')} WHERE id = ?`).run(...values, m.id);
  if (data.status) logActivity(req.project.id, req.user.id, `marked milestone "${m.title}" as ${data.status}`);
  res.json({ milestone: db.prepare('SELECT * FROM milestones WHERE id = ?').get(m.id) });
});

router.delete('/:projectId/milestones/:mid', projectAccess({ freelancerOnly: true }), (req, res) => {
  const info = db
    .prepare('DELETE FROM milestones WHERE id = ? AND project_id = ?')
    .run(req.params.mid, req.project.id);
  if (!info.changes) return res.status(404).json({ error: 'Milestone not found' });
  res.json({ ok: true });
});

/* ---------------- Tasks ---------------- */

router.get('/:projectId/tasks', projectAccess(), (req, res) => {
  const tasks = db
    .prepare(
      `SELECT t.*, u.name assignee_name FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.project_id = ? ORDER BY t.created_at DESC`
    )
    .all(req.project.id);
  res.json({ tasks });
});

const taskSchema = z.object({
  title: z.string().trim().min(2, 'Task title must be at least 2 characters').max(160),
  description: z.string().trim().max(4000).optional().default(''),
  milestone_id: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
  assignee_id: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  due_date: dateStr,
});

function assertRelations(projectId, data, res) {
  if (data.milestone_id) {
    const ok = db
      .prepare('SELECT 1 FROM milestones WHERE id = ? AND project_id = ?')
      .get(data.milestone_id, projectId);
    if (!ok) {
      res.status(400).json({ error: 'Invalid milestone.', fields: { milestone_id: 'Milestone not in this project' } });
      return false;
    }
  }
  if (data.assignee_id) {
    const ok = db
      .prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?')
      .get(projectId, data.assignee_id);
    if (!ok) {
      res.status(400).json({ error: 'Invalid assignee.', fields: { assignee_id: 'Not a project member' } });
      return false;
    }
  }
  return true;
}

router.post('/:projectId/tasks', projectAccess({ freelancerOnly: true }), (req, res) => {
  const data = validate(taskSchema, req.body, res);
  if (!data) return;
  if (!assertRelations(req.project.id, data, res)) return;

  const id = newId();
  db.prepare(
    `INSERT INTO tasks (id, project_id, milestone_id, title, description, priority, assignee_id, due_date, created_by)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    req.project.id,
    data.milestone_id || null,
    data.title,
    data.description,
    data.priority,
    data.assignee_id || null,
    data.due_date || null,
    req.user.id
  );
  logActivity(req.project.id, req.user.id, `created task "${data.title}"`);
  res.status(201).json({ task: db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) });
});

router.patch('/:projectId/tasks/:tid', projectAccess({ freelancerOnly: true }), (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(2, 'Task title must be at least 2 characters').max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    milestone_id: z.string().trim().optional(),
    assignee_id: z.string().trim().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    due_date: z.string().trim().optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  }).refine((v) => !v.due_date || /^\d{4}-\d{2}-\d{2}$/.test(v.due_date), {
    message: 'Use format YYYY-MM-DD', path: ['due_date'],
  });
  const data = validate(schema, req.body, res);
  if (!data) return;
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.tid, req.project.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  if (!assertRelations(req.project.id, data, res)) return;

  const fields = [];
  const values = [];
  for (const k of ['title', 'description', 'milestone_id', 'assignee_id', 'priority', 'due_date', 'status']) {
    if (data[k] !== undefined) {
      const nullable = k === 'milestone_id' || k === 'assignee_id' || k === 'due_date';
      fields.push(`${k} = ?`);
      values.push(nullable && data[k] === '' ? null : data[k]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update.' });
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values, t.id);
  if (data.status && data.status !== t.status) {
    logActivity(req.project.id, req.user.id, `moved task "${t.title}" to ${data.status.replace('_', ' ')}`);
  }
  res.json({ task: db.prepare('SELECT * FROM tasks WHERE id = ?').get(t.id) });
});

router.delete('/:projectId/tasks/:tid', projectAccess({ freelancerOnly: true }), (req, res) => {
  const info = db.prepare('DELETE FROM tasks WHERE id = ? AND project_id = ?').run(req.params.tid, req.project.id);
  if (!info.changes) return res.status(404).json({ error: 'Task not found' });
  res.json({ ok: true });
});

/* ---------------- Messages ---------------- */

router.get('/:projectId/messages', projectAccess(), (req, res) => {
  const messages = db
    .prepare(
      `SELECT m.*, u.name author_name, u.role author_role FROM messages m
       JOIN users u ON u.id = m.author_id WHERE m.project_id = ?
       ORDER BY m.created_at ASC, m.rowid ASC`
    )
    .all(req.project.id);
  res.json({ messages });
});

router.post('/:projectId/messages', projectAccess(), (req, res) => {
  const data = validate(
    z.object({ body: z.string().trim().min(1, 'Message cannot be empty').max(5000) }),
    req.body,
    res
  );
  if (!data) return;
  const id = newId();
  db.prepare('INSERT INTO messages (id, project_id, author_id, body) VALUES (?,?,?,?)').run(
    id,
    req.project.id,
    req.user.id,
    data.body
  );
  const msg = db
    .prepare(
      `SELECT m.*, u.name author_name, u.role author_role FROM messages m
       JOIN users u ON u.id = m.author_id WHERE m.id = ?`
    )
    .get(id);
  res.status(201).json({ message: msg });
});

/* ---------------- Approvals ---------------- */

router.get('/:projectId/approvals', projectAccess(), (req, res) => {
  const approvals = db
    .prepare(
      `SELECT a.*, r.name requested_by_name, d.name decided_by_name, f.filename, m.title milestone_title
       FROM approvals a
       JOIN users r ON r.id = a.requested_by
       LEFT JOIN users d ON d.id = a.decided_by
       LEFT JOIN files f ON f.id = a.file_id
       LEFT JOIN milestones m ON m.id = a.milestone_id
       WHERE a.project_id = ? ORDER BY a.created_at DESC`
    )
    .all(req.project.id);
  res.json({ approvals });
});

router.post('/:projectId/approvals', projectAccess({ freelancerOnly: true }), (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(2, 'Title must be at least 2 characters').max(160),
    notes: z.string().trim().max(2000).optional().default(''),
    milestone_id: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
    file_id: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
  });
  const data = validate(schema, req.body, res);
  if (!data) return;

  const hasClient = db
    .prepare("SELECT 1 FROM project_members WHERE project_id = ? AND role = 'client'")
    .get(req.project.id);
  if (!hasClient) {
    return res.status(409).json({ error: 'Add a client to this project before requesting approval.' });
  }
  if (data.milestone_id && !db.prepare('SELECT 1 FROM milestones WHERE id = ? AND project_id = ?').get(data.milestone_id, req.project.id)) {
    return res.status(400).json({ error: 'Invalid milestone.', fields: { milestone_id: 'Not in this project' } });
  }
  if (data.file_id && !db.prepare('SELECT 1 FROM files WHERE id = ? AND project_id = ?').get(data.file_id, req.project.id)) {
    return res.status(400).json({ error: 'Invalid file.', fields: { file_id: 'Not in this project' } });
  }

  const id = newId();
  db.prepare(
    'INSERT INTO approvals (id, project_id, milestone_id, file_id, title, notes, requested_by) VALUES (?,?,?,?,?,?,?)'
  ).run(id, req.project.id, data.milestone_id || null, data.file_id || null, data.title, data.notes, req.user.id);
  logActivity(req.project.id, req.user.id, `requested approval for "${data.title}"`);
  res.status(201).json({ approval: db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) });
});

router.post('/:projectId/approvals/:aid/decision', projectAccess({ clientOnly: true }), (req, res) => {
  const schema = z.object({
    decision: z.enum(['approved', 'changes_requested'], { message: 'Choose approve or request changes' }),
    decision_note: z.string().trim().max(2000).optional().default(''),
  });
  const data = validate(schema, req.body, res);
  if (!data) return;

  const a = db.prepare('SELECT * FROM approvals WHERE id = ? AND project_id = ?').get(req.params.aid, req.project.id);
  if (!a) return res.status(404).json({ error: 'Approval request not found' });
  if (a.status !== 'pending') return res.status(409).json({ error: 'This request has already been decided.' });
  if (data.decision === 'changes_requested' && !data.decision_note) {
    return res
      .status(400)
      .json({ error: 'Please explain what needs to change.', fields: { decision_note: 'Required when requesting changes' } });
  }

  db.prepare(
    "UPDATE approvals SET status = ?, decided_by = ?, decision_note = ?, decided_at = datetime('now') WHERE id = ?"
  ).run(data.decision, req.user.id, data.decision_note, a.id);
  if (data.decision === 'approved' && a.milestone_id) {
    db.prepare("UPDATE milestones SET status = 'completed' WHERE id = ?").run(a.milestone_id);
  }
  logActivity(
    req.project.id,
    req.user.id,
    data.decision === 'approved' ? `approved "${a.title}"` : `requested changes on "${a.title}"`
  );
  res.json({ approval: db.prepare('SELECT * FROM approvals WHERE id = ?').get(a.id) });
});

export default router;
