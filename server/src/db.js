import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrate } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });

export const UPLOAD_DIR = path.join(dataDir, 'uploads');

export const db = new Database(path.join(dataDir, 'clientsync.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

migrate(db);
