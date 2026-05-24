/**
 * Enhancement 44 — Life OS Widget Layer
 * Propel Stack AI, LLC
 *
 * All endpoints MUST respond in <200ms — no heavy joins.
 * Pre-compute and serve lightweight widget payloads.
 * Payload: small widget <2KB JSON, medium widget <5KB JSON.
 */

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';

export const widgetsRouter = Router();

// GET /api/widgets/life-score — Life Score + 7-day trend for widget
widgetsRouter.get('/life-score', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    // Get latest life score signal
    const latest = await db.prepare(`
      SELECT score, hub, logged_at FROM life_signals WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1
    `).get(userId) as any;

    // 7-day trend from life_signals
    const trend7 = await db.prepare(`
      SELECT DATE(logged_at) AS day, AVG(score) AS avg_score
      FROM life_signals WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '7 days'
      GROUP BY day ORDER BY day ASC
    `).all(userId) as any[];

    const currentScore = latest?.score ?? 72;
    const direction = trend7.length >= 2
      ? (trend7[trend7.length - 1].avg_score > trend7[0].avg_score ? 'up' : 'down')
      : 'flat';

    const statusLabel = currentScore >= 80 ? 'Thriving' : currentScore >= 60 ? 'On Track' : 'Needs Focus';

    res.json({
      score: currentScore,
      trend_7day: trend7.map(t => Math.round(t.avg_score)),
      direction,
      status_label: statusLabel,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get life score widget data' });
  }
});

// GET /api/widgets/morning-briefing — top priorities + companion + weather stub
widgetsRouter.get('/morning-briefing', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    // Top 3 active goals
    const goals = await db.prepare(`
      SELECT title, progress_pct FROM goals WHERE user_id = $1 AND status = 'active'
      ORDER BY updated_at DESC LIMIT 3
    `).all(userId) as any[];

    // Latest life score
    const scoreRow = await db.prepare(`
      SELECT score FROM life_signals WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1
    `).get(userId) as any;

    // Latest companion message
    const companion = await db.prepare(`
      SELECT content FROM companion_conversations WHERE user_id = $1 AND role = 'assistant'
      ORDER BY created_at DESC LIMIT 1
    `).get(userId) as any;

    res.json({
      top_3_priorities: goals.map(g => g.title),
      life_score: scoreRow?.score ?? 72,
      companion_message: companion?.content ?? 'Good morning! Ready to make today great?',
      weather_summary: 'Connect your location for weather.', // stub — requires location permission
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get morning briefing data' });
  }
});

// GET /api/widgets/streaks — active streak summary for widget
widgetsRouter.get('/streaks', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const streaks = await db.prepare(`
      SELECT streak_type, current_len, longest_ever FROM streaks WHERE user_id = $1 ORDER BY current_len DESC LIMIT 3
    `).all(userId) as any[];

    const active_streaks_count = streaks.filter(s => s.current_len > 0).length;
    const longest = streaks[0] ?? null;
    const at_risk = streaks.some(s => s.current_len > 0 && s.current_len < 3);

    res.json({
      active_streaks_count,
      longest_streak_days: longest?.current_len ?? 0,
      longest_streak_type: longest?.streak_type ?? null,
      at_risk,
      streaks: streaks.map(s => ({ type: s.streak_type, days: s.current_len })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get streaks widget data' });
  }
});

// GET /api/widgets/goals — top 3 goals with progress bars
widgetsRouter.get('/goals', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const goals = await db.prepare(`
      SELECT id, title, progress_pct FROM goals WHERE user_id = $1 AND status = 'active'
      ORDER BY updated_at DESC LIMIT 3
    `).all(userId) as any[];

    res.json({
      goals: goals.map(g => ({
        title: g.title,
        progress_pct: g.progress_pct ?? 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get goals widget data' });
  }
});

// GET /api/widgets/credits — AI token budget status
widgetsRouter.get('/credits', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const user = await db.prepare('SELECT ai_tokens_used_this_month, plan_tier FROM users WHERE id = $1').get(userId) as any;
    const used = user?.ai_tokens_used_this_month ?? 0;
    const limits: Record<string, number> = { spark: 10000, solo: 50000, family: 150000, network: 500000, elite: 999999 };
    const total = limits[(user?.plan_tier ?? 'solo').toLowerCase()] ?? 50000;
    const pct_remaining = Math.max(0, Math.round(((total - used) / total) * 100));

    res.json({ used, total, pct_remaining, status: pct_remaining < 10 ? 'critical' : pct_remaining < 20 ? 'low' : 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get credits widget data' });
  }
});

// PUT /api/widgets/preferences — update widget settings
widgetsRouter.put('/preferences', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { enabled_widgets, widget_refresh_hour } = req.body as {
      enabled_widgets?: string[]; widget_refresh_hour?: number;
    };

    const existing = await db.prepare('SELECT id FROM widget_preferences WHERE user_id = $1').get(userId);
    if (existing) {
      await db.prepare(`
        UPDATE widget_preferences SET
          enabled_widgets = COALESCE($1, enabled_widgets),
          widget_refresh_hour = COALESCE($2, widget_refresh_hour),
          updated_at = NOW()
        WHERE user_id = $3
      `).run(enabled_widgets ? JSON.stringify(enabled_widgets) : null, widget_refresh_hour ?? null, userId);
    } else {
      await db.prepare(`
        INSERT INTO widget_preferences (id, user_id, enabled_widgets, widget_refresh_hour)
        VALUES ($1,$2,$3,$4)
      `).run(randomUUID(), userId, JSON.stringify(enabled_widgets ?? ['life_score', 'morning_briefing', 'streaks']), widget_refresh_hour ?? 6);
    }

    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update widget preferences' });
  }
});

// GET /api/widgets/preferences — get widget settings
widgetsRouter.get('/preferences', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const prefs = await db.prepare('SELECT * FROM widget_preferences WHERE user_id = $1').get(userId);
    res.json(prefs ?? {
      enabled_widgets: ['life_score', 'morning_briefing', 'streaks'],
      widget_refresh_hour: 6,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch widget preferences' });
  }
});
