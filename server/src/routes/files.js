import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { db, UPLOAD_DIR } from '../db.js';
import { requireAuth, projectAccess } from '../auth.js';
import { newId, logActivity } from '../util.js';

const router = Router();
router.use(requireAuth);

const MAX_SIZE = 20 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${newId()}${path.extname(file.originalname).slice(0, 12)}`),
});
const upload = multer({ storage, limits: { fileSize: MAX_SIZE, files: 1 } });

router.get('/:projectId/files', projectAccess(), (req, res) => {
  const files = db
    .prepare(
      `SELECT f.*, u.name uploader_name FROM files f JOIN users u ON u.id = f.uploader_id
       WHERE f.project_id = ? ORDER BY f.created_at DESC`
    )
    .all(req.project.id);
  res.json({ files });
});

router.post(
  '/:projectId/files',
  projectAccess(),
  (req, res, next) =>
    upload.single('file')(req, res, (err) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 20 MB).' : 'Upload failed.';
        return res.status(400).json({ error: msg });
      }
      next();
    }),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Choose a file to upload.', fields: { file: 'Required' } });
    const id = newId();
    db.prepare(
      'INSERT INTO files (id, project_id, uploader_id, filename, stored_name, mime, size) VALUES (?,?,?,?,?,?,?)'
    ).run(
      id,
      req.project.id,
      req.user.id,
      req.file.originalname.slice(0, 200),
      req.file.filename,
      req.file.mimetype || '',
      req.file.size
    );
    logActivity(req.project.id, req.user.id, `uploaded ${req.file.originalname}`);
    const file = db
      .prepare('SELECT f.*, u.name uploader_name FROM files f JOIN users u ON u.id = f.uploader_id WHERE f.id = ?')
      .get(id);
    res.status(201).json({ file });
  }
);

router.get('/:projectId/files/:fid/download', projectAccess(), (req, res) => {
  const f = db.prepare('SELECT * FROM files WHERE id = ? AND project_id = ?').get(req.params.fid, req.project.id);
  if (!f) return res.status(404).json({ error: 'File not found' });
  const full = path.join(UPLOAD_DIR, path.basename(f.stored_name));
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'File data missing on server' });
  res.download(full, f.filename);
});

router.delete('/:projectId/files/:fid', projectAccess(), (req, res) => {
  const f = db.prepare('SELECT * FROM files WHERE id = ? AND project_id = ?').get(req.params.fid, req.project.id);
  if (!f) return res.status(404).json({ error: 'File not found' });
  if (f.uploader_id !== req.user.id && req.membership.role !== 'freelancer' && !req.isAdmin) {
    return res.status(403).json({ error: 'You can only delete files you uploaded.' });
  }
  db.prepare('DELETE FROM files WHERE id = ?').run(f.id);
  fs.rm(path.join(UPLOAD_DIR, path.basename(f.stored_name)), { force: true }, () => {});
  res.json({ ok: true });
});

export default router;
