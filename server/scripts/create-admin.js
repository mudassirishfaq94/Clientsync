/**
 * Create (or promote) the system owner account.
 * Usage: node server/scripts/create-admin.js <email> <password> "<Full Name>"
 */
import bcrypt from 'bcryptjs';
import { db } from '../src/db.js';
import { newId } from '../src/util.js';

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node server/scripts/create-admin.js <email> <password> "<Full Name>"');
  process.exit(1);
}
if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Error: invalid email address.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Error: password must be at least 8 characters.');
  process.exit(1);
}

const lower = email.toLowerCase();
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(lower);

if (existing) {
  db.prepare('UPDATE users SET role = ?, password_hash = ? WHERE id = ?').run(
    'admin',
    bcrypt.hashSync(password, 10),
    existing.id
  );
  console.log(`Promoted ${lower} to admin and reset the password.`);
} else {
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role) VALUES (?,?,?,?,?)'
  ).run(newId(), lower, name || 'System Owner', bcrypt.hashSync(password, 10), 'admin');
  console.log(`Created admin account ${lower}.`);
}
