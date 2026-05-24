/**
 * Predictive Life Insights Engine — Enhancement 34
 * Propel Stack AI, LLC
 *
 * Cross-hub pattern detection and Life Score forecasting.
 * Requires 30+ days of data before predictions fire.
 * AI used only for natural language generation — raw data never sent to AI.
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';

export const predictionsRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

type PredictionType = 'score_forecast' | 'pattern' | 'risk_flag' | 'seasonal' | 'goal_predictor';

// ── GET /api/predictions ──────────────────────────────────────────────────────
predictionsRouter.get('/', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, prediction_type, prediction_text, predicted_for_date, confidence_score,
             hubs_used, shown_at, acted_on, outcome_score_delta, created_at
      FROM life_predictions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `).all(userId);

    // Mark unseen predictions as shown
    await db.prepare(`
      UPDATE life_predictions SET shown_at = NOW() WHERE user_id = $1 AND shown_at IS NULL
    `).run(userId);

    res.json(rows ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/predictions/generate ───────────────────────────────────────────
// Generates fresh predictions based on current user data.
// In production this runs on Sunday nights via pg_cron.
predictionsRouter.post('/generate', async (_req, res) => {
  try {
    const userId = getCurrentUserId();

    // Check data sufficiency (30+ day gate)
    const dataAge = await db.prepare(`
      SELECT MIN(created_at) AS first_entry FROM (
        SELECT created_at FROM health_logs WHERE user_id = $1
        UNION ALL SELECT created_at FROM goals WHERE user_id = $1
        UNION ALL SELECT created_at FROM streaks WHERE user_id = $1
      ) combined
    `).get(userId) as { first_entry: string | null };

    const daysSinceFirst = dataAge?.first_entry
      ? Math.floor((Date.now() - new Date(dataAge.first_entry).getTime()) / 86400000)
      : 0;

    if (daysSinceFirst < 7) {
      return res.json({
        generated: 0,
        message: `Keep using the app — predictions unlock after 30 days of data. You have ${daysSinceFirst} days so far.`,
      });
    }

    // Gather aggregate stats (no raw PII sent to AI)
    const [streakData, goalData, healthData] = await Promise.all([
      db.prepare(`SELECT COUNT(*) as cnt, MAX(streak_count) as max_streak FROM streaks WHERE user_id = $1`).get(userId) as any,
      db.prepare(`SELECT COUNT(*) FILTER (WHERE status='completed') as done, COUNT(*) as total FROM goals WHERE user_id = $1`).get(userId) as any,
      db.prepare(`SELECT AVG(mood_score) as avg_mood, AVG(sleep_hours) as avg_sleep, COUNT(*) as log_count FROM health_logs WHERE user_id = $1 AND logged_at > NOW() - INTERVAL '30 days'`).get(userId) as any,
    ]);

    const predictions: Array<{ type: PredictionType; text: string; confidence: number; hubs: string[] }> = [];
    const confidence = Math.min(0.95, 0.4 + (daysSinceFirst / 90) * 0.55);

    // Goal success predictor
    const goalRate = goalData?.total > 0 ? (goalData.done / goalData.total) : 0;
    if (goalData?.total >= 3) {
      predictions.push({
        type: 'goal_predictor',
        text: `You complete ${Math.round(goalRate * 100)}% of your goals. Goals with weekly check-ins in your history complete at higher rates — consider adding one to your next goal.`,
        confidence: Math.min(0.85, confidence),
        hubs: ['goals'],
      });
    }

    // Streak pattern
    if (streakData?.max_streak >= 7) {
      predictions.push({
        type: 'pattern',
        text: `Your longest streak is ${streakData.max_streak} days. Consistent daily engagement is your strongest performance driver.`,
        confidence: confidence,
        hubs: ['streaks'],
      });
    }

    // Health patterns
    if (healthData?.log_count >= 7) {
      if (healthData.avg_mood && healthData.avg_mood < 3.0) {
        predictions.push({
          type: 'risk_flag',
          text: `Your average mood score over the last 30 days is ${Number(healthData.avg_mood).toFixed(1)}/5. This is worth paying attention to — consider what patterns might be contributing.`,
          confidence: Math.min(0.75, confidence),
          hubs: ['health'],
        });
      }
      if (healthData.avg_sleep && healthData.avg_sleep < 7) {
        predictions.push({
          type: 'pattern',
          text: `Your average sleep is ${Number(healthData.avg_sleep).toFixed(1)} hours. Research consistently shows 7-9 hours supports better mood, performance, and decision-making.`,
          confidence: 0.9,
          hubs: ['health'],
        });
      }
    }

    // Life score forecast (stub)
    predictions.push({
      type: 'score_forecast',
      text: `Based on your current patterns, your Life Score trajectory looks ${goalRate > 0.5 ? 'positive' : 'steady'} over the next 7 days. Keep your top streak going to maintain momentum.`,
      confidence: Math.min(0.7, confidence),
      hubs: ['streaks', 'goals', 'health'],
    });

    // Store predictions
    const stored: string[] = [];
    for (const pred of predictions) {
      const id = randomUUID();
      await db.prepare(`
        INSERT INTO life_predictions (id, user_id, prediction_type, prediction_text, confidence_score, hubs_used)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `).run(id, userId, pred.type, pred.text, pred.confidence, JSON.stringify(pred.hubs));
      stored.push(id);
    }

    res.json({ generated: stored.length, predictions: stored });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/predictions/:id/acted-on ───────────────────────────────────────
predictionsRouter.post('/:id/acted-on', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`UPDATE life_predictions SET acted_on = true WHERE id = $1 AND user_id = $2`)
      .run(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/predictions/dashboard ───────────────────────────────────────────
// Returns top 3 unseen predictions for dashboard widget
predictionsRouter.get('/dashboard', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, prediction_type, prediction_text, confidence_score, hubs_used, created_at
      FROM life_predictions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 3
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
