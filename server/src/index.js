import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadUser } from './auth.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import workRoutes from './routes/work.js';
import fileRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';
import meRoutes from './routes/me.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(loadUser);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', workRoutes);
app.use('/api/projects', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/me', meRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found' }));

const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => console.log(`ClientSync API listening on ${port}`));
