// ─── Burnout Pattern Detection — Enhancement 26 ──────────────────────────────
// Propel Stack AI, LLC
//
// Multi-signal rule engine: work hours spike + sleep drops + self-care disappears
// over 2+ weeks → AI flags gently and suggests intervention.

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import { complete } from '../ai-gateway.js';

export const burnoutRouter = Router();

// ─── GET /api/burnout/status — current burnout risk score ─────────────────────
burnoutRouter.get('/status', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();

  const riskScore = await computeBurnoutRisk(userId);

  // Check for recent intervention
  const lastIntervention = await db.prepare(`
    SELECT id, intervention_text, risk_score, created_at, dismissed
    FROM burnout_interventions
    WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(userId) as Record<string, unknown> | undefined;

  // Only show if risk is significant and we haven't shown recently (within 7 days)
  const shouldIntervene = riskScore >= 60 && (
    !lastIntervention ||
    (lastIntervention.dismissed as boolean) ||
    (Date.now() - new Date(lastIntervention.created_at as string).getTime()) > 7 * 86400000
  );

  let intervention: Record<string, unknown> | null = null;
  if (shouldIntervene) {
    intervention = await generateIntervention(userId, riskScore);
  } else if (lastIntervention && !(lastIntervention.dismissed as boolean) && riskScore >= 40) {
    intervention = lastIntervention;
  }

  res.json({
    risk_score: riskScore,
    risk_level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'moderate' : 'low',
    intervention,
  });
});

// ─── POST /api/burnout/dismiss — dismiss intervention ────────────────────────
burnoutRouter.post('/dismiss', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { id } = req.body ?? {};
  if (!id) return res.status(400).json({ error: 'id required' });

  await db.prepare(
    'UPDATE burnout_interventions SET dismissed = true WHERE id = ? AND user_id = ?'
  ).run(id, userId);

  res.json({ ok: true });
});

// ─── POST /api/burnout/signal — log a burnout signal ─────────────────────────
burnoutRouter.post('/signal', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { signal_type, value, raw_data = {} } = req.body ?? {};

  const VALID_TYPES = ['work_hours', 'sleep_hours', 'self_care_skipped', 'mood_low_streak', 'task_completion_drop'];
  if (!VALID_TYPES.includes(signal_type)) {
    return res.status(400).json({ error: 'invalid signal_type' });
  }

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO burnout_signals (id, user_id, signal_type, value, raw_data)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, signal_type, value, JSON.stringify(raw_data));

  res.status(201).json({ id, ok: true });
});

// ─── GET /api/burnout/signals — recent signal history ─────────────────────────
burnoutRouter.get('/signals', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db.prepare(`
    SELECT signal_type, value, signal_date, raw_data, created_at
    FROM burnout_signals
    WHERE user_id = ? AND signal_date >= CURRENT_DATE - INTERVAL '14 days'
    ORDER BY created_at DESC
  `).all(userId);
  res.json(rows);
});

// ─── Internal: burnout risk computation ───────────────────────────────────────

async function computeBurnoutRisk(userId: string): Promise<number> {
  // Pull last 14 days of signals from multiple sources
  const [
    moodData,
    taskData,
    energyData,
    journalData,
  ] = await Promise.all([
    db.prepare(`
      SELECT AVG(mood_score) AS avg_mood, COUNT(*) AS entries
      FROM journal_entries
      WHERE user_id = ? AND entry_date >= CURRENT_DATE - INTERVAL '14 days'
    `).get(userId).catch(() => null),

    db.prepare(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) AS total
      FROM tasks
      WHERE user_id = ? AND due_date >= CURRENT_DATE - INTERVAL '14 days'
    `).get(userId).catch(() => null),

    db.prepare(`
      SELECT AVG(energy_level) AS avg_energy, COUNT(*) AS entries
      FROM energy_ratings
      WHERE user_id = ? AND noted_at >= NOW() - INTERVAL '14 days'
    `).get(userId).catch(() => null),

    db.prepare(`
      SELECT COUNT(*) AS entries
      FROM journal_entries
      WHERE user_id = ? AND entry_date >= CURRENT_DATE - INTERVAL '14 days'
    `).get(userId).catch(() => null),
  ]);

  let score = 0;
  let signals = 0;

  // Mood signal (low mood = burnout risk)
  const mood = moodData as { avg_mood: number; entries: number } | null;
  if (mood && mood.entries >= 5) {
    signals++;
    if (mood.avg_mood < 2.5) score += 35;
    else if (mood.avg_mood < 3.0) score += 20;
    else if (mood.avg_mood < 3.5) score += 10;
  }

  // Task completion drop
  const tasks = taskData as { completed: number; total: number } | null;
  if (tasks && tasks.total >= 5) {
    signals++;
    const completionRate = tasks.completed / tasks.total;
    if (completionRate < 0.3) score += 30;
    else if (completionRate < 0.5) score += 15;
    else if (completionRate < 0.7) score += 5;
  }

  // Energy drop
  const energy = energyData as { avg_energy: number; entries: number } | null;
  if (energy && energy.entries >= 5) {
    signals++;
    if (energy.avg_energy < 2.0) score += 35;
    else if (energy.avg_energy < 2.5) score += 20;
    else if (energy.avg_energy < 3.0) score += 10;
  }

  // Self-care: journaling drop (proxy for self-care neglect)
  const journal = journalData as { entries: number } | null;
  if (journal) {
    signals++;
    const entryRate = journal.entries / 14;
    if (entryRate < 0.2) score += 15; // less than 3 entries in 14 days
    else if (entryRate < 0.4) score += 8;
  }

  // Normalize if we have few signals
  if (signals === 0) return 0;
  return Math.min(100, Math.round(score));
}

async function generateIntervention(userId: string, riskScore: number): Promise<Record<string, unknown>> {
  let text = `Your patterns over the past two weeks suggest you might be running low on fuel. Want to schedule some recovery time this week?`;

  try {
    const result = complete({
      prompt: `User burnout risk score: ${riskScore}/100. Generate a gentle, non-alarming 1-2 sentence check-in message. Ask one optional question. Never diagnose or alarm.`,
      systemPrompt: 'You are a warm, supportive wellness companion. Speak like a caring friend, not a clinician. Keep it under 40 words.',
      mode: 'general',
      maxTokens: 80,
    });
    if (result.text) text = result.text.trim();
  } catch { /* use default */ }

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO burnout_interventions (id, user_id, risk_score, intervention_text)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, riskScore, text);

  return { id, risk_score: riskScore, intervention_text: text, dismissed: false };
}
