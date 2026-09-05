import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tableExists = (db, name) =>
  !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(name);

const columns = (db, table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

function addColumn(db, table, column, definition) {
  if (!tableExists(db, table)) return;
  if (columns(db, table).includes(column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/** Tables that get an auto-maintained updated_at column. */
const TIMESTAMPED = [
  'users', 'profiles', 'workspaces', 'projects',
  'milestones', 'tasks', 'messages', 'approvals',
];

export function migrate(db) {
  // 1. Create anything missing from the canonical schema.
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

  // 2. Backfill columns onto pre-existing tables.
  //    SQLite disallows non-constant defaults in ALTER TABLE, so add the column
  //    nullable, backfill from created_at, then keep it current via triggers.
  for (const table of TIMESTAMPED) {
    addColumn(db, table, 'updated_at', 'TEXT');
    if (tableExists(db, table) && columns(db, table).includes('updated_at')) {
      db.exec(`UPDATE ${table} SET updated_at = COALESCE(updated_at, created_at, datetime('now')) WHERE updated_at IS NULL`);
    }
  }
  addColumn(db, 'project_members', 'created_at', 'TEXT');
  db.exec("UPDATE project_members SET created_at = datetime('now') WHERE created_at IS NULL");
  addColumn(db, 'activity_logs', 'entity_type', "TEXT NOT NULL DEFAULT 'project'");
  addColumn(db, 'activity_logs', 'entity_id', 'TEXT');

  // 3. Rename the legacy `activity` table into `activity_logs`, preserving rows.
  if (tableExists(db, 'activity')) {
    db.exec(`
      INSERT OR IGNORE INTO activity_logs (id, project_id, actor_id, entity_type, action, created_at)
      SELECT id, project_id, actor_id, 'project', action, created_at FROM activity;
      DROP TABLE activity;
    `);
  }

  // 4. Every user must have a profile row.
  db.exec(`
    INSERT INTO profiles (user_id)
    SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM profiles)
  `);

  // 5. updated_at triggers (idempotent: dropped and recreated).
  for (const table of TIMESTAMPED) {
    if (!tableExists(db, table)) continue;
    const pk = table === 'profiles' ? 'user_id' : 'id';
    db.exec(`
      DROP TRIGGER IF EXISTS trg_${table}_updated_at;
      CREATE TRIGGER trg_${table}_updated_at AFTER UPDATE ON ${table}
      FOR EACH ROW BEGIN
        UPDATE ${table} SET updated_at = datetime('now') WHERE ${pk} = NEW.${pk};
      END;
    `);
  }
}
