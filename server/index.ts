import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { initDb, runMigrations, db, getCurrentUserId } from './db.js';
import { contactsRouter } from './routes/contacts.js';
import { financialRouter } from './routes/financial.js';
import { assistantRouter } from './routes/assistant.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: IS_PROD ? true : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ---- Health ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Current user (auth stub) ----
app.get('/api/me', (_req, res) => {
  const userId = getCurrentUserId();
  const user = db
    .prepare('SELECT id, email, display_name, plan_tier, ai_tokens_used_this_month FROM users WHERE id = ?')
    .get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ---- Feature route modules ----
app.use('/api/contacts', contactsRouter);             // Session 2 -- Personal CRM
app.use('/api/financial', financialRouter);           // Session 3 -- Financial Hub
app.use('/api/assistant', assistantRouter);           // Session 4 -- AI Assistant
// ---- Future route modules will be mounted here ----
// app.use('/api/assistant', assistantRouter);        // Session 4
// app.use('/api/dashboard', dashboardRouter);        // Session 5
// app.use('/api/documents', documentsRouter);        // Session 7
// app.use('/api/parental', parentalRouter);          // Session 9
// app.use('/api/health-hub', healthHubRouter);       // Session 10
// app.use('/api/snfs', snfsRouter);                  // Session 12
// app.use('/api/athlete', athleteRouter);            // Session 13

// ---- Static client (production only) ----
if (IS_PROD) {
  const clientDist = path.resolve(process.cwd(), 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
}

// ---- Error handler ----
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[server error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ---- Bootstrap ----
// sql.js needs one async step (WASM load) before the synchronous DB surface is usable.
initDb()
  .then(() => {
    runMigrations();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[server] failed to initialize database', err);
    process.exit(1);
  });
