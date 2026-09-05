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

export function logActivity(projectId, actorId, action) {
  db.prepare('INSERT INTO activity (id, project_id, actor_id, action) VALUES (?,?,?,?)').run(
    newId(),
    projectId,
    actorId,
    action
  );
}

export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
