// ─── Life Score / Wellness Dashboard ─────────────────────────────────────────
// Session 14 Enhancement 1 — Propel Stack AI, LLC

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import { complete } from '../ai-gateway.js';

export const lifescoreRouter = Router();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Default weights
const DEFAULT_WEIGHTS = { finance: 0.25, health: 0.25, social: 0.20, tasks: 0.15, mood: 0.15 };

// ─── GET /api/lifescore/:userId — today's score (cached) or generate new ─────
lifescoreRouter.get('/:userId', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const scoreDate = today();

  const existing = await db
    .prepare('SELECT * FROM life_scores WHERE user_id = ? AND score_date = ?')
    .get(userId, scoreDate) as Record<string, unknown> | undefined;

  if (existing) {
    return res.json({ ...existing, cached: true });
  }

  // Generate new score
  return res.json(await generateLifeScore(userId, scoreDate));
});

// ─── GET /api/lifescore/history/:userId — score history ──────────────────────
lifescoreRouter.get('/history/:userId', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const days = Number(req.query.days ?? 30);
  const rows = await db
    .prepare('SELECT * FROM life_scores WHERE user_id = ? ORDER BY score_date DESC LIMIT ?')
    .all(userId, days);
  res.json(rows);
});

// ─── POST /api/lifescore/generate — force regenerate ─────────────────────────
lifescoreRouter.post('/generate', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const scoreDate = today();
  // Delete cached score
  await db.prepare('DELETE FROM life_scores WHERE user_id = ? AND score_date = ?').run(userId, scoreDate);
  return res.json(await generateLifeScore(userId, scoreDate));
});

// ─── GET /api/lifescore/weights/:userId — get category weights ────────────────
lifescoreRouter.get('/weights/:userId', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const row = await db
    .prepare('SELECT * FROM score_weights WHERE user_id = ?')
    .get(userId) as Record<string, unknown> | undefined;
  res.json(row ?? { user_id: userId, ...DEFAULT_WEIGHTS });
});

// ─── PUT /api/lifescore/weights — update weights ──────────────────────────────
lifescoreRouter.put('/weights', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { finance_weight = 0.25, health_weight = 0.25, social_weight = 0.20, tasks_weight = 0.15, mood_weight = 0.15 } = req.body ?? {};
  await db.prepare(`
    INSERT INTO score_weights (user_id, finance_weight, health_weight, social_weight, tasks_weight, mood_weight)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id) DO UPDATE SET
      finance_weight = EXCLUDED.finance_weight,
      health_weight = EXCLUDED.health_weight,
      social_weight = EXCLUDED.social_weight,
      tasks_weight = EXCLUDED.tasks_weight,
      mood_weight = EXCLUDED.mood_weight
  `).run(userId, finance_weight, health_weight, social_weight, tasks_weight, mood_weight);
  res.json({ ok: true });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateLifeScore(userId: string, scoreDate: string) {
  // Pull data snapshots from various hubs
  const [finances, tasks, journals, streaks] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS cnt FROM transactions WHERE user_id = ?').get(userId).catch(() => ({ cnt: 0 })),
    db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS done FROM tasks WHERE user_id = ? AND due_date = ?").get(userId, scoreDate).catch(() => ({ total: 0, done: 0 })),
    db.prepare("SELECT mood_score FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC LIMIT 1").get(userId).catch(() => null),
    db.prepare("SELECT COUNT(*) AS cnt FROM streaks WHERE user_id = ? AND is_active = true").get(userId).catch(() => ({ cnt: 0 })),
  ]);

  // Rule-based scoring (each dimension 0–100)
  const financeScore  = Math.min(100, 50 + ((finances as { cnt: number }).cnt > 0 ? 30 : 0));
  const healthScore   = Math.min(100, 50 + Number((streaks as { cnt: number }).cnt) * 10);
  const socialScore   = 65; // placeholder until social data populates
  const tasksRow      = tasks as { total: number; done: number };
  const tasksScore    = tasksRow.total > 0 ? Math.round((tasksRow.done / tasksRow.total) * 100) : 70;
  const moodScore     = journals ? Math.round(((journals as { mood_score: number }).mood_score / 5) * 100) : 65;

  const weights = await db.prepare('SELECT * FROM score_weights WHERE user_id = ?').get(userId).catch(() => null) as Record<string, number> | null;
  const w = weights ?? { finance_weight: 0.25, health_weight: 0.25, social_weight: 0.20, tasks_weight: 0.15, mood_weight: 0.15 };

  const totalScore = Math.round(
    financeScore  * w.finance_weight +
    healthScore   * w.health_weight  +
    socialScore   * w.social_weight  +
    tasksScore    * w.tasks_weight   +
    moodScore     * w.mood_weight
  );

  // AI summary sentence
  let aiSummary = `Your life score today is ${totalScore}/100.`;
  try {
    const result = complete({
      model: 'claude-haiku-4-5',
      system: 'You are a supportive life coach. Give a single encouraging sentence summarizing the user\'s life score.',
      messages: [{ role: 'user', content: `Life score: ${totalScore}/100. Finance: ${financeScore}, Health: ${healthScore}, Social: ${socialScore}, Tasks: ${tasksScore}, Mood: ${moodScore}.` }],
      maxTokens: 80,
    });
    if (result.text) aiSummary = result.text.trim();
  } catch { /* use default */ }

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO life_scores (id, user_id, score_date, total_score, finance_score, health_score, social_score, tasks_score, mood_score, ai_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id, score_date) DO UPDATE SET
      total_score = EXCLUDED.total_score,
      finance_score = EXCLUDED.finance_score,
      health_score = EXCLUDED.health_score,
      social_score = EXCLUDED.social_score,
      tasks_score = EXCLUDED.tasks_score,
      mood_score = EXCLUDED.mood_score,
      ai_summary = EXCLUDED.ai_summary
  `).run(id, userId, scoreDate, totalScore, financeScore, healthScore, socialScore, tasksScore, moodScore, aiSummary);

  return { id, user_id: userId, score_date: scoreDate, total_score: totalScore, finance_score: financeScore, health_score: healthScore, social_score: socialScore, tasks_score: tasksScore, mood_score: moodScore, ai_summary: aiSummary, cached: false };
}
