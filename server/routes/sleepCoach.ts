/**
 * Enhancement 39 — AI Sleep Coach
 * Propel Stack AI, LLC
 *
 * Sleep logging, wearable sync, cross-hub correlation, weekly AI coaching report.
 * Morning Readiness Score = sleep_score * 0.5 + (100 - resting_hr * 0.5) + HRV * 0.3
 * Coach report requires 7+ days of sleep data.
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';
import { randomUUID } from 'node:crypto';

export const sleepCoachRouter = Router();
const ai = new Anthropic();

// GET /api/sleep/logs — fetch sleep log history (last 90 days)
sleepCoachRouter.get('/logs', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const days = Number((req.query as any).days ?? 30);
    const logs = await db.prepare(`
      SELECT * FROM sleep_logs WHERE user_id = $1
        AND date >= CURRENT_DATE - INTERVAL '${Math.min(days, 90)} days'
      ORDER BY date DESC
    `).all(userId);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sleep logs' });
  }
});

// POST /api/sleep/log — manual sleep entry
sleepCoachRouter.post('/log', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { date, total_minutes, deep_minutes, rem_minutes, light_minutes, awake_minutes, hrv_avg, resting_hr, sleep_score, source = 'manual' } = req.body as {
      date: string; total_minutes?: number; deep_minutes?: number; rem_minutes?: number;
      light_minutes?: number; awake_minutes?: number; hrv_avg?: number;
      resting_hr?: number; sleep_score?: number; source?: string;
    };
    if (!date) return res.status(400).json({ error: 'date required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO sleep_logs (id, user_id, date, total_minutes, deep_minutes, rem_minutes, light_minutes, awake_minutes, hrv_avg, resting_hr, sleep_score, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (user_id, date) DO UPDATE SET
        total_minutes=EXCLUDED.total_minutes, deep_minutes=EXCLUDED.deep_minutes,
        rem_minutes=EXCLUDED.rem_minutes, light_minutes=EXCLUDED.light_minutes,
        awake_minutes=EXCLUDED.awake_minutes, hrv_avg=EXCLUDED.hrv_avg,
        resting_hr=EXCLUDED.resting_hr, sleep_score=EXCLUDED.sleep_score, source=EXCLUDED.source
    `).run(id, userId, date, total_minutes ?? null, deep_minutes ?? null, rem_minutes ?? null, light_minutes ?? null, awake_minutes ?? null, hrv_avg ?? null, resting_hr ?? null, sleep_score ?? null, source);

    res.status(201).json({ id, date });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log sleep' });
  }
});

// POST /api/sleep/sync — stub for wearable OAuth sync (Oura, Garmin, etc.)
sleepCoachRouter.post('/sync', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    // In production, this pulls from Credential Bridge connections
    // For now returns guidance
    res.json({
      message: 'Connect your wearable via App Connections (Credential Bridge) to enable automatic sleep sync. Supported: Oura, Garmin, Whoop, Fitbit.',
      synced: 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

// POST /api/sleep/environment — log sleep environment factors
sleepCoachRouter.post('/environment', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { date, room_temp_f, alcohol_drinks, caffeine_mg, screen_time_min, stress_level, notes } = req.body as {
      date: string; room_temp_f?: number; alcohol_drinks?: number;
      caffeine_mg?: number; screen_time_min?: number; stress_level?: number; notes?: string;
    };
    if (!date) return res.status(400).json({ error: 'date required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO sleep_environment_logs (id, user_id, date, room_temp_f, alcohol_drinks, caffeine_mg, screen_time_min, stress_level, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_id, date) DO UPDATE SET
        room_temp_f=EXCLUDED.room_temp_f, alcohol_drinks=EXCLUDED.alcohol_drinks,
        caffeine_mg=EXCLUDED.caffeine_mg, screen_time_min=EXCLUDED.screen_time_min,
        stress_level=EXCLUDED.stress_level, notes=EXCLUDED.notes
    `).run(id, userId, date, room_temp_f ?? null, alcohol_drinks ?? null, caffeine_mg ?? null, screen_time_min ?? null, stress_level ?? null, notes ?? null);

    res.status(201).json({ logged: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log environment' });
  }
});

// GET /api/sleep/coach-report — weekly AI sleep coaching report
sleepCoachRouter.get('/coach-report', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    // Gate: need 7+ days of data
    const countRow = await db.prepare(`
      SELECT COUNT(*) AS cnt FROM sleep_logs WHERE user_id = $1
    `).get(userId) as any;
    const cnt = Number(countRow?.cnt ?? 0);
    if (cnt < 7) {
      return res.json({ message: `Log ${7 - cnt} more nights of sleep data to unlock your AI Sleep Coach report.`, report: null });
    }

    const [sleepLogs, envLogs, moodLogs] = await Promise.all([
      db.prepare(`SELECT date, total_minutes, deep_minutes, rem_minutes, hrv_avg, resting_hr, sleep_score FROM sleep_logs WHERE user_id=$1 ORDER BY date DESC LIMIT 7`).all(userId),
      db.prepare(`SELECT date, alcohol_drinks, caffeine_mg, screen_time_min, stress_level FROM sleep_environment_logs WHERE user_id=$1 ORDER BY date DESC LIMIT 7`).all(userId),
      db.prepare(`SELECT score, logged_at FROM mood_entries WHERE user_id=$1 ORDER BY logged_at DESC LIMIT 14`).all(userId),
    ]);

    const prompt = scrubPII(`You are an expert sleep coach. Analyze this person's sleep data and provide a coaching report.

Sleep logs (last 7 nights): ${JSON.stringify(sleepLogs)}
Environment factors: ${JSON.stringify(envLogs)}
Mood data: ${JSON.stringify(moodLogs)}

Provide:
(a) 3 root causes of poor sleep this week (specific, data-backed)
(b) 3 specific actions for next week (concrete and achievable)
(c) One encouraging observation about what's going well

Keep it personal and actionable. Under 250 words. No medical advice.`);

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const report = (completion.content[0] as any).text || '';

    // Calculate readiness score for today
    const todayLog = sleepLogs[0] as any;
    let readiness = 70; // default
    if (todayLog) {
      const scoreContrib = (todayLog.sleep_score ?? 70) * 0.5;
      const hrContrib = todayLog.resting_hr ? Math.max(0, 100 - todayLog.resting_hr) * 0.3 : 15;
      const hrvContrib = todayLog.hrv_avg ? Math.min(todayLog.hrv_avg * 0.5, 20) : 10;
      readiness = Math.min(100, Math.round(scoreContrib + hrContrib + hrvContrib));
    }

    res.json({ report, readiness_score: readiness, data_days: cnt });
  } catch (err) {
    console.error('[sleepCoach] report error', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/sleep/correlations — cross-hub sleep correlations
sleepCoachRouter.get('/correlations', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const [sleepLogs, moodLogs] = await Promise.all([
      db.prepare(`SELECT date, sleep_score FROM sleep_logs WHERE user_id=$1 AND sleep_score IS NOT NULL ORDER BY date DESC LIMIT 30`).all(userId),
      db.prepare(`SELECT DATE(logged_at) as date, score FROM mood_entries WHERE user_id=$1 ORDER BY logged_at DESC LIMIT 30`).all(userId),
    ]);

    if ((sleepLogs as any[]).length < 7) {
      return res.json({ message: 'Need 7+ sleep logs for correlations', correlations: [] });
    }

    // Simple correlation analysis
    const sleepMap = new Map((sleepLogs as any[]).map((s: any) => [s.date, s.sleep_score]));
    const moodMap = new Map((moodLogs as any[]).map((m: any) => [m.date, m.score]));

    const paired: Array<{date: string; sleep: number; mood: number}> = [];
    sleepMap.forEach((sleep, date) => {
      const mood = moodMap.get(date);
      if (mood !== undefined) paired.push({ date, sleep, mood });
    });

    const correlations: string[] = [];
    if (paired.length >= 5) {
      const avgSleep = paired.reduce((a, b) => a + b.sleep, 0) / paired.length;
      const avgMood = paired.reduce((a, b) => a + b.mood, 0) / paired.length;
      const goodSleepMood = paired.filter(p => p.sleep >= avgSleep).map(p => p.mood);
      const badSleepMood = paired.filter(p => p.sleep < avgSleep).map(p => p.mood);
      if (goodSleepMood.length && badSleepMood.length) {
        const goodAvg = goodSleepMood.reduce((a, b) => a + b, 0) / goodSleepMood.length;
        const badAvg = badSleepMood.reduce((a, b) => a + b, 0) / badSleepMood.length;
        const diff = Math.round((goodAvg - badAvg) * 10) / 10;
        if (Math.abs(diff) > 0.3) {
          correlations.push(`Your mood scores are ${diff > 0 ? diff : Math.abs(diff)} points ${diff > 0 ? 'higher' : 'lower'} on nights with above-average sleep.`);
        }
      }
    }

    if (correlations.length === 0) {
      correlations.push('Keep logging — correlations appear after 2 weeks of consistent data.');
    }

    res.json({ correlations, paired_days: paired.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate correlations' });
  }
});
