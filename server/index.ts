import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { initDb, runMigrations, db, getCurrentUserId } from './db.js';
import { contactsRouter } from './routes/contacts.js';
import { financialRouter } from './routes/financial.js';
import { assistantRouter } from './routes/assistant.js';
import { dashboardRouter } from './routes/dashboard.js';
import { documentsRouter } from './routes/documents.js';
import { healthRouter } from './routes/health.js';
import { parentalRouter } from './routes/parental.js';
import { kidsRouter } from './routes/kids.js';
import { snfsRouter } from './routes/snfs.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Allow the Vercel frontend + local dev. In production VERCEL_URL is set by Vercel;
// alternatively set ALLOWED_ORIGIN in Railway env vars.
const allowedOrigins = IS_PROD
  ? [process.env.ALLOWED_ORIGIN, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`].filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: IS_PROD ? (o, cb) => cb(null, !o || (allowedOrigins as string[]).some((a) => o.startsWith(a))) : allowedOrigins,
  credentials: true,
}));

// Raw body for Stripe webhooks must come before express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// ---- Health ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Current user (auth stub) ----
app.get('/api/me', async (_req, res) => {
  const userId = getCurrentUserId();
  const user = await db
    .prepare('SELECT id, email, display_name, plan_tier, ai_tokens_used_this_month FROM users WHERE id = ?')
    .get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ---- Feature route modules ----
app.use('/api/contacts', contactsRouter);             // Session 2 -- Personal CRM
app.use('/api/financial', financialRouter);           // Session 3 -- Financial Hub
app.use('/api/assistant', assistantRouter);           // Session 4 -- AI Assistant
app.use('/api/dashboard', dashboardRouter);           // Session 5 -- Dashboard
app.use('/api/documents', documentsRouter);           // Session 7 -- Document Vault
app.use('/api/health', healthRouter);                 // Session 10 -- Health Hub + Emergency Mode
app.use('/api/parental', parentalRouter);             // Session 9 -- Parental Controls
app.use('/api/kids', kidsRouter);                     // Session 9 -- Kids Zone
app.use('/api/snfs', snfsRouter);                     // Session 12 -- Special Needs Family Support

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
  console.error('[server error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ---- Bootstrap ----
initDb()
  .then(() => runMigrations())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[server] failed to initialize database', err);
    process.exit(1);
  });
