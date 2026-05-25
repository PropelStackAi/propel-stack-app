// ─── AI Daily Briefing (Cross-Hub) ───────────────────────────────────────────
// Session 14 Enhancement 2 — Propel Stack AI, LLC

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import { complete } from '../ai-gateway.js';
import { buildMemoryContext } from '../lib/memoryStore.js';

export const dailyBriefingRouter = Router();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── GET /api/daily-briefing/today — cached or generate ──────────────────────
dailyBriefingRouter.get('/today', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const date = today();

  const existing = await db
    .prepare('SELECT * FROM daily_briefings WHERE user_id = ? AND briefing_date = ?')
    .get(userId, date) as Record<string, unknown> | undefined;

  if (existing) {
    const content = JSON.parse(existing.content as string || '{}');
    return res.json({ ...content, cached: true, briefing_date: date, read_at: existing.read_at });
  }

  return res.json(await generateDailyBriefing(userId, date));
});

// ─── POST /api/daily-briefing/generate — force regenerate ────────────────────
dailyBriefingRouter.post('/generate', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const date = today();
  await db.prepare('DELETE FROM daily_briefings WHERE user_id = ? AND briefing_date = ?').run(userId, date);
  return res.json(await generateDailyBriefing(userId, date));
});

// ─── GET /api/daily-briefing/history — past 30 days ──────────────────────────
dailyBriefingRouter.get('/history', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare('SELECT briefing_date, content, tokens_used, created_at FROM daily_briefings WHERE user_id = ? ORDER BY briefing_date DESC LIMIT 30')
    .all(userId);
  res.json(rows.map((r) => {
    const content = JSON.parse(r.content as string || '{}');
    return { ...content, briefing_date: r.briefing_date, created_at: r.created_at };
  }));
});

// ─── POST /api/daily-briefing/mark-read — mark opened ────────────────────────
dailyBriefingRouter.post('/mark-read', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const date = today();
  await db.prepare('UPDATE daily_briefings SET read_at = NOW() WHERE user_id = ? AND briefing_date = ?').run(userId, date);
  res.json({ ok: true });
});

// ─── Generator ───────────────────────────────────────────────────────────────

async function generateDailyBriefing(userId: string, date: string) {
  // Gather hub snapshots
  const [score, tasks, events, goals] = await Promise.all([
    db.prepare('SELECT total_score, finance_score, health_score FROM life_scores WHERE user_id = ? ORDER BY score_date DESC LIMIT 1').get(userId).catch(() => null),
    db.prepare("SELECT COUNT(*) AS cnt FROM tasks WHERE user_id = ? AND due_date = ? AND status != 'completed'").get(userId, date).catch(() => ({ cnt: 0 })),
    db.prepare('SELECT title, event_date FROM life_events WHERE user_id = ? AND event_date >= ? ORDER BY event_date ASC LIMIT 3').all(userId, date).catch(() => []),
    db.prepare("SELECT title, current_value, target_value, unit FROM goals WHERE user_id = ? AND status = 'active' LIMIT 3").all(userId).catch(() => []),
  ]);

  const memCtx = await buildMemoryContext(userId).catch(() => '');

  const hubSnapshot = { score, tasks, events, goals };
  const snapshotStr = JSON.stringify(hubSnapshot);

  const systemPrompt = `${memCtx}
You are a warm, supportive life OS assistant for Propel Stack AI. Generate a personalized daily briefing.
IMPORTANT: Respond ONLY with valid JSON matching this exact shape:
{
  "greeting": "string",
  "sections": [
    {"hub": "string", "headline": "string", "detail": "string", "cta_url": "string"}
  ],
  "actions": ["string"]
}
Keep the tone warm and conversational. Never robotic. greeting should use the provided salutation.`.trim();

  const userMsg = `Greeting: "${getGreeting()}". Hub data: ${snapshotStr}. Date: ${date}.`;

  let content: Record<string, unknown> = {
    greeting: `${getGreeting()}! Here's your Life OS briefing for today.`,
    sections: [
      { hub: 'Life Score', headline: score ? `Your life score is ${(score as { total_score: number }).total_score}/100` : 'No score yet today', detail: 'Tap to see your full breakdown.', cta_url: '/lifescore' },
      { hub: 'Tasks', headline: `${(tasks as { cnt: number }).cnt} tasks due today`, detail: 'Stay on track to hit your goals.', cta_url: '/streaks' },
    ],
    actions: ['Review your goals', 'Log your mood', 'Check today\'s events'],
  };
  let tokensUsed = 0;

  try {
    const result = complete({
      model: 'claude-sonnet-4-5',
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
      maxTokens: 800,
    });
    tokensUsed = result.inputTokens + result.outputTokens;
    const parsed = JSON.parse(result.text);
    if (parsed?.greeting && parsed?.sections) content = parsed;
  } catch { /* use default */ }

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO daily_briefings (id, user_id, briefing_date, content, hub_snapshot, model_used, tokens_used)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id, briefing_date) DO UPDATE SET
      content = EXCLUDED.content,
      hub_snapshot = EXCLUDED.hub_snapshot,
      tokens_used = EXCLUDED.tokens_used
  `).run(id, userId, date, JSON.stringify(content), snapshotStr, 'claude-sonnet-4-5', tokensUsed);

  return { ...content, briefing_date: date, cached: false };
}
