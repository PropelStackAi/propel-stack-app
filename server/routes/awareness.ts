/**
 * Awareness Hub — Daily Intentions, Gratitude, Mood, Breathing
 * Propel Stack AI, LLC
 */
import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { complete } from '../ai-gateway.js';
import { scrubPII } from '../middleware/piiScrubber.js';

export const awarenessRouter = Router();

function newId() { return crypto.randomUUID(); }

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** ISO date string for Monday of the current week */
function weekStartISO(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

// ---- Intentions ----

// GET /api/awareness/intention — today's intention
awarenessRouter.get('/intention', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const today = todayISO();
    const row = await db.prepare('SELECT * FROM daily_intentions WHERE user_id = $1 AND date = $2').get(userId, today);
    res.json(row ?? null);
  } catch {
    res.status(500).json({ error: 'Failed to fetch intention' });
  }
});

// POST /api/awareness/intention — upsert today's intention
awarenessRouter.post('/intention', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const today = todayISO();
    const { intention } = req.body as { intention: string };
    if (!intention?.trim()) return res.status(400).json({ error: 'intention required' });
    const id = newId();
    await db.prepare(`
      INSERT INTO daily_intentions (id, user_id, intention, date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, date) DO UPDATE SET intention = EXCLUDED.intention
    `).run(id, userId, intention.trim(), today);
    res.json({ date: today });
  } catch {
    res.status(500).json({ error: 'Failed to save intention' });
  }
});

// ---- Gratitude ----

// GET /api/awareness/gratitude — today's gratitude entry
awarenessRouter.get('/gratitude', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const today = todayISO();
    const row = await db.prepare('SELECT * FROM gratitude_entries WHERE user_id = $1 AND date = $2').get(userId, today) as any;
    if (!row) return res.json(null);
    res.json({ ...row, items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items });
  } catch {
    res.status(500).json({ error: 'Failed to fetch gratitude' });
  }
});

// POST /api/awareness/gratitude — upsert today's gratitude
awarenessRouter.post('/gratitude', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const today = todayISO();
    const { items } = req.body as { items: string[] };
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
    const itemsJson = JSON.stringify(items.filter(Boolean));
    const id = newId();
    await db.prepare(`
      INSERT INTO gratitude_entries (id, user_id, items, date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, date) DO UPDATE SET items = EXCLUDED.items
    `).run(id, userId, itemsJson, today);
    res.json({ date: today, items });
  } catch {
    res.status(500).json({ error: 'Failed to save gratitude' });
  }
});

// GET /api/awareness/gratitude/history — last 14 days
awarenessRouter.get('/gratitude/history', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT * FROM gratitude_entries
      WHERE user_id = $1 AND date >= (CURRENT_DATE - INTERVAL '14 days')::DATE
      ORDER BY date DESC
    `).all(userId) as any[];
    const parsed = rows.map((r) => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
    }));
    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Failed to fetch gratitude history' });
  }
});

// ---- Mood ----

// GET /api/awareness/mood — today's mood score
awarenessRouter.get('/mood', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const today = todayISO();
    const row = await db.prepare('SELECT * FROM mood_checkins WHERE user_id = $1 AND date = $2').get(userId, today);
    res.json(row ?? null);
  } catch {
    res.status(500).json({ error: 'Failed to fetch mood' });
  }
});

// POST /api/awareness/mood — upsert today's mood (score 1-5)
awarenessRouter.post('/mood', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const today = todayISO();
    const { score } = req.body as { score: number };
    if (typeof score !== 'number' || score < 1 || score > 5) {
      return res.status(400).json({ error: 'score must be 1-5' });
    }
    const id = newId();
    await db.prepare(`
      INSERT INTO mood_checkins (id, user_id, score, date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, date) DO UPDATE SET score = EXCLUDED.score
    `).run(id, userId, score, today);
    res.json({ date: today, score });
  } catch {
    res.status(500).json({ error: 'Failed to save mood' });
  }
});

// ---- Breathing ----

// POST /api/awareness/breathing — log a breathing session
awarenessRouter.post('/breathing', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { duration_seconds, exercise_type = '4-7-8' } = req.body as { duration_seconds: number; exercise_type?: string };
    if (typeof duration_seconds !== 'number' || duration_seconds <= 0) {
      return res.status(400).json({ error: 'duration_seconds must be a positive number' });
    }
    const id = newId();
    await db.prepare(`
      INSERT INTO breathing_sessions (id, user_id, duration_seconds, exercise_type)
      VALUES ($1, $2, $3, $4)
    `).run(id, userId, duration_seconds, exercise_type);
    res.json({ id, duration_seconds, exercise_type });
  } catch {
    res.status(500).json({ error: 'Failed to log breathing session' });
  }
});

// ---- Streak ----

// GET /api/awareness/streak — consecutive days with any awareness action
awarenessRouter.get('/streak', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    // Collect all distinct dates across intentions, gratitude, and mood
    const rows = await db.prepare(`
      SELECT DISTINCT date FROM (
        SELECT date FROM daily_intentions WHERE user_id = $1
        UNION ALL
        SELECT date FROM gratitude_entries WHERE user_id = $1
        UNION ALL
        SELECT date FROM mood_checkins WHERE user_id = $1
      ) combined
      ORDER BY date DESC
    `).all(userId) as { date: string }[];

    let streak = 0;
    let cursor = todayISO();
    for (const row of rows) {
      if (row.date === cursor) {
        streak++;
        // Decrement cursor by 1 day
        const d = new Date(cursor);
        d.setUTCDate(d.getUTCDate() - 1);
        cursor = d.toISOString().split('T')[0];
      } else if (row.date < cursor) {
        // Gap found — stop
        break;
      }
    }
    res.json({ streak_days: streak });
  } catch {
    res.status(500).json({ error: 'Failed to calculate streak' });
  }
});

// ---- AI Reflection Prompt ----

// GET /api/awareness/reflection-prompt — weekly AI-generated reflection question
awarenessRouter.get('/reflection-prompt', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const weekStart = weekStartISO();

    // Check cache: store in a simple daily_intentions-adjacent cache using a dedicated key pattern
    // We piggyback on a simple in-memory weekly cache keyed by userId + weekStart
    const cached = reflectionCache.get(`${userId}:${weekStart}`);
    if (cached) return res.json({ prompt: cached, week_start: weekStart });

    const prompt = scrubPII(
      `You are a mindfulness coach. Generate a single, open-ended, introspective reflection question ` +
      `for someone to journal about this week (week starting ${weekStart}). ` +
      `The question should invite deep self-examination, be specific enough to be actionable, ` +
      `and avoid yes/no answers. Return only the question, no preamble.`
    );

    const result = complete({ prompt, mode: 'general' });
    const questionText = result.text?.trim() || 'What is one belief you hold that, if released, would free you to live more fully?';

    reflectionCache.set(`${userId}:${weekStart}`, questionText);
    res.json({ prompt: questionText, week_start: weekStart });
  } catch {
    res.status(500).json({ error: 'Failed to generate reflection prompt' });
  }
});

// Simple in-process weekly cache (cleared on restart, acceptable for this use case)
const reflectionCache = new Map<string, string>();
