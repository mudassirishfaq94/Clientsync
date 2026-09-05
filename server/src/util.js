import { customAlphabet } from 'nanoid';
import { db } from './db.js';

export const newId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);

export function validate(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fields[key]) fields[key] = issue.message;
    }
    res.status(400).json({ error: 'Please correct the highlighted fields.', fields });
    return null;
  }
  return parsed.data;
}

export function logActivity(projectId, actorId, action, entityType = 'project', entityId = null) {
  db.prepare(
    `INSERT INTO activity_logs (id, project_id, actor_id, entity_type, entity_id, action)
     VALUES (?,?,?,?,?,?)`
  ).run(newId(), projectId, actorId, entityType, entityId, action);
}

/**
 * Notify every project member except the actor.
 * Respects each recipient's notify_in_app preference.
 */
export function notifyProject({ projectId, actorId, type, title, body = '', link = '' }) {
  const recipients = db
    .prepare(
      `SELECT pm.user_id FROM project_members pm
       LEFT JOIN profiles p ON p.user_id = pm.user_id
       WHERE pm.project_id = ? AND pm.user_id != ? AND COALESCE(p.notify_in_app, 1) = 1`
    )
    .all(projectId, actorId);

  const insert = db.prepare(
    `INSERT INTO notifications (id, user_id, project_id, actor_id, type, title, body, link)
     VALUES (?,?,?,?,?,?,?,?)`
  );
  const tx = db.transaction((rows) => {
    for (const r of rows) insert.run(newId(), r.user_id, projectId, actorId, type, title, body, link);
  });
  tx(recipients);
}

export const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
