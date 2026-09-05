import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { validate } from '../util.js';

const router = Router();
router.use(requireAuth);

function fullProfile(userId) {
  return db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.created_at,
              p.avatar_color, p.job_title, p.company, p.phone, p.timezone, p.bio, p.notify_in_app
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ?`
    )
    .get(userId);
}

/* ---------------- Profile ---------------- */

router.get('/profile', (req, res) => {
  res.json({ profile: fullProfile(req.user.id) });
});

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
  job_title: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  timezone: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(1000).optional(),
  avatar_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a valid colour')
    .optional(),
  notify_in_app: z.boolean().optional(),
});

router.patch('/profile', (req, res) => {
  const data = validate(profileSchema, req.body, res);
  if (!data) return;

  db.prepare('INSERT OR IGNORE INTO profiles (user_id) VALUES (?)').run(req.user.id);

  if (data.name !== undefined) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(data.name, req.user.id);
  }

  const cols = ['job_title', 'company', 'phone', 'timezone', 'bio', 'avatar_color', 'notify_in_app'];
  const fields = [];
  const values = [];
  for (const c of cols) {
    if (data[c] !== undefined) {
      fields.push(`${c} = ?`);
      values.push(c === 'notify_in_app' ? (data[c] ? 1 : 0) : data[c]);
    }
  }
  if (fields.length) {
    db.prepare(`UPDATE profiles SET ${fields.join(', ')} WHERE user_id = ?`).run(...values, req.user.id);
  }
  if (!fields.length && data.name === undefined) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }
  res.json({ profile: fullProfile(req.user.id) });
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    new_password: z.string().min(8, 'New password must be at least 8 characters').max(200),
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

router.post('/password', (req, res) => {
  const data = validate(passwordSchema, req.body, res);
  if (!data) return;

  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(data.current_password, row.password_hash)) {
    return res
      .status(400)
      .json({ error: 'Your current password is incorrect.', fields: { current_password: 'Incorrect password' } });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    bcrypt.hashSync(data.new_password, 10),
    req.user.id
  );
  res.json({ ok: true });
});

/* ---------------- Notifications ---------------- */

router.get('/notifications', (req, res) => {
  const notifications = db
    .prepare(
      `SELECT n.*, u.name actor_name, p.name project_name
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       LEFT JOIN projects p ON p.id = n.project_id
       WHERE n.user_id = ? ORDER BY n.created_at DESC, n.rowid DESC LIMIT 50`
    )
    .all(req.user.id);
  const unread = db
    .prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at IS NULL')
    .get(req.user.id).c;
  res.json({ notifications, unread });
});

router.post('/notifications/:id/read', (req, res) => {
  const info = db
    .prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ? AND read_at IS NULL")
    .run(req.params.id, req.user.id);
  if (!info.changes) {
    const exists = db
      .prepare('SELECT 1 FROM notifications WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!exists) return res.status(404).json({ error: 'Notification not found' });
  }
  res.json({ ok: true });
});

router.post('/notifications/read-all', (req, res) => {
  const info = db
    .prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL")
    .run(req.user.id);
  res.json({ ok: true, updated: info.changes });
});

export default router;
