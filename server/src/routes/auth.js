import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { issueToken, clearToken, requireAuth } from '../auth.js';
import { newId, validate } from '../util.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  role: z.enum(['freelancer', 'client'], { message: 'Choose freelancer or client' }),
});

router.post('/register', (req, res) => {
  const data = validate(registerSchema, req.body, res);
  if (!data) return;

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (exists) {
    return res
      .status(409)
      .json({ error: 'That email is already registered.', fields: { email: 'Email already in use' } });
  }

  const user = {
    id: newId(),
    email: data.email,
    name: data.name,
    role: data.role,
    password_hash: bcrypt.hashSync(data.password, 10),
  };
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role) VALUES (@id,@email,@name,@password_hash,@role)'
  ).run(user);

  if (data.role === 'freelancer') {
    const wsId = newId();
    db.prepare('INSERT INTO workspaces (id, name, owner_id) VALUES (?,?,?)').run(
      wsId,
      `${data.name.split(' ')[0]}'s Workspace`,
      user.id
    );
    db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?,?,?)').run(
      wsId,
      user.id,
      'owner'
    );
  }

  issueToken(res, user);
  res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', (req, res) => {
  const data = validate(loginSchema, req.body, res);
  if (!data) return;

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);
  if (!row || !bcrypt.compareSync(data.password, row.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  issueToken(res, row);
  res.json({ user: { id: row.id, email: row.email, name: row.name, role: row.role } });
});

router.post('/logout', (req, res) => {
  clearToken(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

router.get('/stats', requireAuth, (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({
      users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
      projects: db.prepare('SELECT COUNT(*) c FROM projects').get().c,
    });
  }
  res.status(403).json({ error: 'Admin access required' });
});

export default router;
