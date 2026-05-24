import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import { athleteRouter } from './routes/athlete.js';
import { socialRouter } from './routes/social.js';
import { recapRouter } from './routes/recap.js';
import { streaksRouter, lifeWinsRouter } from './routes/streaks.js';
import { studentRouter } from './routes/student.js';
import { businessRouter } from './routes/business.js';
import { notificationsRouter } from './routes/notifications.js';
import { personalFinanceRouter } from './routes/personalFinance.js';
import { relationshipsRouter } from './routes/relationships.js';
import { learningRouter }       from './routes/learning.js';
import { homePropertyRouter }   from './routes/homeProperty.js';
import { coachingRouter }        from './routes/coaching.js';
import { docIntelligenceRouter } from './routes/docIntelligence.js';
import { securityRouter }        from './routes/security.js';       // Enhancement 41
import { credentialBridgeRouter } from './routes/credentialBridge.js'; // Enhancement 26
import { agentTasksRouter }       from './routes/agentTasks.js';       // Enhancement 27
import { voiceAIRouter }          from './routes/voiceAI.js';          // Enhancement 28
import { timelineRouter }         from './routes/timeline.js';         // Enhancement 29
import { estateVaultRouter }      from './routes/estateVault.js';      // Enhancement 30
import { travelRouter }           from './routes/travel.js';            // Enhancement 31
import { groceryRouter }          from './routes/grocery.js';           // Enhancement 32
import { careerRouter }           from './routes/career.js';            // Enhancement 33
import { predictionsRouter }      from './routes/predictions.js';       // Enhancement 34
import { advisorPlatformRouter }  from './routes/advisorPlatform.js';   // Enhancement 35
import { digitalTwinRouter }      from './routes/digitalTwin.js';        // Enhancement 36
import { companionRouter }        from './routes/companion.js';           // Enhancement 37
import { petHubRouter }           from './routes/petHub.js';              // Enhancement 38
import { sleepCoachRouter }       from './routes/sleepCoach.js';          // Enhancement 39
import { legalHubRouter }         from './routes/legalHub.js';            // Enhancement 40
import { circlesRouter }          from './routes/circles.js';             // Enhancement 42
import { billsRouter }            from './routes/bills.js';               // Enhancement 43
import { widgetsRouter }          from './routes/widgets.js';             // Enhancement 44
import { calendarHubRouter }      from './routes/calendarHub.js';         // Enhancement 45
import { financialScoreRouter }   from './routes/financialScore.js';      // Enhancement 46
import { touchStreak } from './lib/streaks.js';

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

// Security headers — Enhancement 41
// crossOriginEmbedderPolicy: false keeps iframe PDF preview working
app.use(helmet({ crossOriginEmbedderPolicy: false }));

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
  // Touch daily_login streak on every app open (Session 16)
  touchStreak(userId, 'daily_login').catch(() => {/* non-fatal */});
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
app.use('/api/athlete', athleteRouter);               // Session 13 -- Athlete Performance Hub
app.use('/api/social', socialRouter);                 // Session 14 -- Social & Media Hub
app.use('/api/recap', recapRouter);                   // Session 15 -- AI Weekly Life Recap
app.use('/api/streaks', streaksRouter);               // Session 16 -- Streaks & Life Wins
app.use('/api/life-wins', lifeWinsRouter);            // Session 16 -- Life Wins Feed
app.use('/api/student', studentRouter);               // Session 14 Bug Fix -- Student Mode
app.use('/api/business', businessRouter);             // Session 15 -- Business Hub
app.use('/api/notifications', notificationsRouter);   // Enhancement 17 -- Smart Notification Intelligence
app.use('/api/personal-finance', personalFinanceRouter); // Enhancement 18 -- Personal Finance Hub
app.use('/api/relationships', relationshipsRouter);      // Enhancement 19 -- Relationships & People Hub
app.use('/api/learning',       learningRouter);          // Enhancement 20 -- Learning Hub
app.use('/api/home-property',  homePropertyRouter);      // Enhancement 21 -- Home & Property Hub
app.use('/api/coaching',       coachingRouter);          // Enhancement 22 -- AI Life Coach Mode
app.use('/api/doc-intelligence', docIntelligenceRouter); // Enhancement 23 -- Smart Document Intelligence
app.use('/api/security',          securityRouter);          // Enhancement 41 -- Security & Compliance
app.use('/api/credential-bridge', credentialBridgeRouter); // Enhancement 26 -- Credential Bridge
app.use('/api/agent-tasks',       agentTasksRouter);       // Enhancement 27 -- AI Agent Tasks
app.use('/api/voice',             voiceAIRouter);          // Enhancement 28 -- Voice AI
app.use('/api/timeline',          timelineRouter);         // Enhancement 29 -- Life Timeline
app.use('/api/estate-vault',      estateVaultRouter);      // Enhancement 30
app.use('/api/travel',           travelRouter);           // Enhancement 31
app.use('/api/grocery',          groceryRouter);          // Enhancement 32
app.use('/api/career',           careerRouter);           // Enhancement 33
app.use('/api/predictions',      predictionsRouter);      // Enhancement 34
app.use('/api/advisor',          advisorPlatformRouter);  // Enhancement 35
app.use('/api/twin',             digitalTwinRouter);      // Enhancement 36 -- AI Digital Twin
app.use('/api/companion',        companionRouter);         // Enhancement 37 -- AI Companion Mode
app.use('/api/pets',             petHubRouter);            // Enhancement 38 -- Pet Hub
app.use('/api/sleep',            sleepCoachRouter);        // Enhancement 39 -- AI Sleep Coach
app.use('/api/legal',            legalHubRouter);          // Enhancement 40 -- Consumer Legal Hub
app.use('/api/circles',         circlesRouter);            // Enhancement 42 -- Social Circles
app.use('/api/bills',           billsRouter);              // Enhancement 43 -- Bill Negotiation
app.use('/api/widgets',         widgetsRouter);            // Enhancement 44 -- Widget Layer
app.use('/api/calendar',        calendarHubRouter);        // Enhancement 45 -- Calendar Intelligence
app.use('/api/finance',         financialScoreRouter);     // Enhancement 46 -- Financial Life Score

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
