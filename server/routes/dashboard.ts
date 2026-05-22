import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { complete } from '../ai-gateway.js';
import { rowToBill } from '../lib/financial.js';
import { productivityRouter } from './productivity.js';
import {
  captureSchema,
  logActivity,
  monthStartIso,
  newId,
  rowToActivity,
  rowToTask,
  todayIso,
  weekStartIso,
} from '../lib/dashboard.js';

/** Dashboard aggregation + quick capture (Session 5). */
export const dashboardRouter = Router();

// tasks / habits / notes live under the same /api/dashboard prefix
dashboardRouter.use('/', productivityRouter);

// ---- Stats summary ----
dashboardRouter.get('/summary', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const tasksDone = await db
    .prepare("SELECT COUNT(*) AS c FROM tasks WHERE user_id = ? AND completed_at IS NOT NULL AND substr(completed_at,1,10) >= ?")
    .get(userId, weekStartIso()) as { c: number };
  const nw = await db
    .prepare('SELECT net_worth FROM net_worth_snapshots WHERE user_id = ? ORDER BY snapshot_date DESC LIMIT 1')
    .get(userId) as { net_worth: number } | undefined;
  const user = await db.prepare('SELECT ai_tokens_used_this_month FROM users WHERE id = ?').get(userId) as { ai_tokens_used_this_month: number } | undefined;
  const contacts = await db
    .prepare('SELECT COUNT(*) AS c FROM contacts WHERE user_id = ? AND substr(created_at,1,10) >= ?')
    .get(userId, monthStartIso()) as { c: number };

  res.json({
    tasksCompletedThisWeek: tasksDone.c,
    netWorth: nw?.net_worth ?? 0,
    aiTokensUsed: user?.ai_tokens_used_this_month ?? 0,
    contactsAddedThisMonth: contacts.c,
  });
});

// ---- Today's agenda (tasks + bills due today or overdue) ----
dashboardRouter.get('/agenda', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const today = todayIso();
  const tasks = await db
    .prepare("SELECT * FROM tasks WHERE user_id = ? AND completed_at IS NULL AND due_date IS NOT NULL AND due_date <= ? ORDER BY due_date ASC")
    .all(userId, today);
  const bills = await db
    .prepare('SELECT * FROM bills WHERE user_id = ? AND is_paid = 0 AND due_date <= ? ORDER BY due_date ASC')
    .all(userId, today);
  res.json({ tasks: tasks.map(rowToTask), bills: bills.map(rowToBill) });
});

// ---- Recent activity ----
dashboardRouter.get('/activity', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db.prepare('SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(userId);
  res.json(rows.map(rowToActivity));
});

// ---- Weather (Open-Meteo, no key). Degrades gracefully if the network blocks it. ----
dashboardRouter.get('/weather', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.json({ available: false, reason: 'No coordinates' });
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return res.json({ available: false, reason: `HTTP ${r.status}` });
    const data = (await r.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    res.json({
      available: true,
      temperature: data.current?.temperature_2m ?? null,
      weatherCode: data.current?.weather_code ?? null,
    });
  } catch {
    res.json({ available: false, reason: 'Weather service unreachable' });
  }
});

// ---- AI morning brief ----
dashboardRouter.get('/brief', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const today = todayIso();
  const dueTasks = ((await db.prepare("SELECT COUNT(*) AS c FROM tasks WHERE user_id=? AND completed_at IS NULL AND due_date IS NOT NULL AND due_date <= ?").get(userId, today)) as { c: number }).c;
  const dueBills = ((await db.prepare('SELECT COUNT(*) AS c FROM bills WHERE user_id=? AND is_paid=0 AND due_date <= ?').get(userId, today)) as { c: number }).c;
  const overdueFollowUps = ((await db.prepare("SELECT COUNT(*) AS c FROM contacts WHERE user_id=? AND next_follow_up IS NOT NULL AND next_follow_up != '' AND next_follow_up <= ?").get(userId, today)) as { c: number }).c;

  const prompt = `Write a friendly good-morning brief in at most 4 sentences. Today is ${today}. The user has ${dueTasks} task(s) due, ${dueBills} bill(s) due, and ${overdueFollowUps} overdue contact follow-up(s). Be encouraging and concise.`;
  const result = complete({ prompt, mode: 'general' });
  res.json({ brief: result.text, stub: result.stub, generatedAt: new Date().toISOString(), counts: { dueTasks, dueBills, overdueFollowUps } });
});

// ---- Quick capture ----
dashboardRouter.post('/capture', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = captureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid capture' });
  const { kind, text, amount } = parsed.data;

  if (kind === 'task') {
    await db.prepare('INSERT INTO tasks (id, user_id, title) VALUES (?, ?, ?)').run(newId(), userId, text);
  } else if (kind === 'note') {
    await db.prepare('INSERT INTO notes (id, user_id, body) VALUES (?, ?, ?)').run(newId(), userId, text);
  } else if (kind === 'contact') {
    await db.prepare("INSERT INTO contacts (id, user_id, first_name, category, contact_type) VALUES (?, ?, ?, 'Personal', 'personal')").run(newId(), userId, text);
  } else {
    await db.prepare("INSERT INTO transactions (id, user_id, type, amount, description, occurred_at) VALUES (?, ?, 'expense', ?, ?, ?)").run(
      newId(), userId, Number(amount) || 0, text, todayIso(),
    );
  }
  logActivity(userId, kind, `Quick capture (${kind}): ${text.slice(0, 60)}`).catch(() => {});
  res.status(201).json({ ok: true, kind });
});
