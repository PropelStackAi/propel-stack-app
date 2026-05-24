// ─── Streaks & Life Wins Routes ───────────────────────────────────────────────
// Session 16 — Propel Stack AI, LLC

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import {
  touchStreak,
  resetExpiredStreaks,
  logLifeWin,
  type StreakType,
} from '../lib/streaks.js';

export const streaksRouter = Router();
export const lifeWinsRouter = Router();

// ─── Streak labels & emojis ──────────────────────────────────────────────────

const STREAK_META: Record<string, { label: string; emoji: string; unit: string }> = {
  daily_login:  { label: 'Daily Login',   emoji: '🔥', unit: 'days' },
  mood:         { label: 'Mood Logging',  emoji: '😊', unit: 'days' },
  habit:        { label: 'Habit',         emoji: '✅', unit: 'days' },
  goal:         { label: 'Goal Progress', emoji: '🎯', unit: 'days' },
  life_score:   { label: 'Life Score',    emoji: '⭐', unit: 'days' },
  finance:      { label: 'Finance Log',   emoji: '💰', unit: 'days' },
  weekly_recap: { label: 'Weekly Recap',  emoji: '📋', unit: 'weeks' },
};

// ─── Streaks Routes ───────────────────────────────────────────────────────────

// GET /api/streaks — all streaks for user (runs reset check first)
streaksRouter.get('/', async (_req, res) => {
  try {
    const userId = getCurrentUserId();

    // Lazy reset check before returning
    await resetExpiredStreaks(userId);

    const rows = await db.prepare(
      'SELECT * FROM streaks WHERE user_id = ? ORDER BY current_len DESC'
    ).all(userId);

    // Enrich with metadata
    const enriched = (rows as Record<string, unknown>[]).map((r) => ({
      ...r,
      ...STREAK_META[r.streak_type as string] ?? { label: r.streak_type, emoji: '🔥', unit: 'days' },
      grace_used: r.grace_used === 1,
    }));

    res.json({ streaks: enriched });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/streaks/touch — increment a streak (client-callable)
streaksRouter.post('/touch', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { streak_type, habit_id } = req.body as { streak_type: string; habit_id?: string };

    if (!streak_type) return res.status(400).json({ error: 'streak_type required' });

    const updated = await touchStreak(userId, streak_type as StreakType, habit_id ?? '');
    const meta = STREAK_META[streak_type] ?? { label: streak_type, emoji: '🔥', unit: 'days' };

    res.json({ streak: { ...updated, ...meta, grace_used: updated.grace_used === 1 } });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/streaks/badges — earned badges from life_wins
streaksRouter.get('/badges', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT * FROM life_wins
      WHERE user_id = ? AND win_type = 'badge'
      ORDER BY occurred_on DESC
    `).all(userId);
    res.json({ badges: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Life Wins Routes ─────────────────────────────────────────────────────────

// GET /api/life-wins — paginated feed
lifeWinsRouter.get('/', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);
    const hub = req.query.hub as string | undefined;

    const where = hub
      ? 'WHERE user_id = ? AND source_hub = ?'
      : 'WHERE user_id = ?';
    const params = hub ? [userId, hub, limit, offset] : [userId, limit, offset];

    const rows = await db.prepare(
      `SELECT * FROM life_wins ${where} ORDER BY occurred_on DESC, created_at DESC LIMIT ? OFFSET ?`
    ).all(...params);

    const countRow = await db.prepare(
      `SELECT COUNT(*) as n FROM life_wins ${where.replace('LIMIT ? OFFSET ?', '')}`
    ).get(...(hub ? [userId, hub] : [userId])) as { n: number };

    res.json({
      wins: rows,
      total: countRow.n,
      hasMore: offset + limit < countRow.n,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/life-wins — manual entry
lifeWinsRouter.post('/', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { title, detail, occurred_on } = req.body as {
      title: string;
      detail?: string;
      occurred_on?: string;
    };

    if (!title?.trim()) return res.status(400).json({ error: 'title required' });

    const today = new Date().toISOString().slice(0, 10);
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO life_wins (id, user_id, win_type, title, detail, source_hub, is_shared, occurred_on)
      VALUES (?, ?, 'manual', ?, ?, 'manual', 0, ?)
    `).run(id, userId, title.trim(), detail?.trim() ?? '', occurred_on ?? today);

    const row = await db.prepare('SELECT * FROM life_wins WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/life-wins/:id/share — toggle is_shared
lifeWinsRouter.patch('/:id/share', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { is_shared } = req.body as { is_shared: boolean };

    await db.prepare(`
      UPDATE life_wins SET is_shared = ? WHERE id = ? AND user_id = ?
    `).run(is_shared ? 1 : 0, req.params.id, userId);

    const row = await db.prepare('SELECT * FROM life_wins WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/life-wins/:id — delete a manual win
lifeWinsRouter.delete('/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(
      "DELETE FROM life_wins WHERE id = ? AND user_id = ? AND win_type = 'manual'"
    ).run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/life-wins/hubs — distinct source hubs for filter tabs
lifeWinsRouter.get('/hubs', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT DISTINCT source_hub FROM life_wins
      WHERE user_id = ? AND source_hub != ''
      ORDER BY source_hub
    `).all(userId) as { source_hub: string }[];
    res.json({ hubs: rows.map((r) => r.source_hub) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
