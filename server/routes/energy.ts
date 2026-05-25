// ─── Energy-Aware Scheduling — Enhancement 25 ────────────────────────────────
// Propel Stack AI, LLC

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import { complete } from '../ai-gateway.js';

export const energyRouter = Router();

// ─── POST /api/energy/log — log an energy check-in ────────────────────────────
energyRouter.post('/log', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { energy_level = 3, energy_type = 'general' } = req.body ?? {};

  if (energy_level < 1 || energy_level > 5) {
    return res.status(400).json({ error: 'energy_level must be 1-5' });
  }

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO energy_ratings (id, user_id, energy_level, energy_type)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, energy_level, energy_type);

  // Recompute energy profile after each log (async, non-blocking)
  recomputeEnergyProfile(userId).catch(() => {});

  res.status(201).json({ id, energy_level, energy_type, ok: true });
});

// ─── GET /api/energy/today — today's energy log ────────────────────────────────
energyRouter.get('/today', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.prepare(`
    SELECT id, energy_level, energy_type, noted_at
    FROM energy_ratings
    WHERE user_id = ? AND noted_at::date = ?
    ORDER BY noted_at ASC
  `).all(userId, today);
  res.json(rows);
});

// ─── GET /api/energy/profile — user's energy profile ─────────────────────────
energyRouter.get('/profile', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const profile = await db.prepare(
    'SELECT * FROM energy_profiles WHERE user_id = ?'
  ).get(userId) as Record<string, unknown> | undefined;

  if (!profile) {
    return res.json({
      peak_hours: [],
      low_hours: [],
      dominant_type: 'general',
      has_enough_data: false,
    });
  }

  res.json({
    peak_hours: JSON.parse(profile.peak_hours as string || '[]'),
    low_hours: JSON.parse(profile.low_hours as string || '[]'),
    dominant_type: profile.dominant_type,
    last_computed: profile.last_computed,
    has_enough_data: true,
  });
});

// ─── GET /api/energy/schedule — AI-powered scheduling suggestions ─────────────
energyRouter.get('/schedule', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();

  // Get energy profile + recent ratings
  const [profile, recentRatings] = await Promise.all([
    db.prepare('SELECT * FROM energy_profiles WHERE user_id = ?').get(userId).catch(() => null),
    db.prepare(`
      SELECT energy_level, energy_type, noted_at
      FROM energy_ratings WHERE user_id = ?
      ORDER BY noted_at DESC LIMIT 14
    `).all(userId).catch(() => []),
  ]);

  const peakHours = profile ? JSON.parse((profile as Record<string, unknown>).peak_hours as string || '[]') : [];
  const avgEnergy = recentRatings.length > 0
    ? (recentRatings as { energy_level: number }[]).reduce((sum, r) => sum + r.energy_level, 0) / recentRatings.length
    : 3;

  // Generate scheduling suggestion
  let suggestion = 'Log your energy 3× today (morning, afternoon, evening) to unlock personalized scheduling.';
  if (recentRatings.length >= 5) {
    try {
      const result = complete({
        prompt: `User energy profile: peak hours ${JSON.stringify(peakHours)}, avg energy ${avgEnergy.toFixed(1)}/5. Recent pattern: ${JSON.stringify(recentRatings.slice(0, 7))}. Give one scheduling suggestion (1-2 sentences). No diagnoses. Forward-looking only.`,
        systemPrompt: 'You are a supportive productivity coach. Give one brief, actionable scheduling suggestion based on the user\'s energy patterns.',
        mode: 'general',
        maxTokens: 80,
      });
      suggestion = result.text.trim();
    } catch { /* use default */ }
  }

  res.json({
    suggestion,
    peak_hours: peakHours,
    avg_energy: Number(avgEnergy.toFixed(1)),
    data_points: recentRatings.length,
    has_profile: recentRatings.length >= 5,
  });
});

// ─── GET /api/energy/history — 30-day energy history ─────────────────────────
energyRouter.get('/history', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db.prepare(`
    SELECT
      noted_at::date AS day,
      ROUND(AVG(energy_level)::numeric, 1) AS avg_energy,
      COUNT(*) AS entries
    FROM energy_ratings
    WHERE user_id = ? AND noted_at >= NOW() - INTERVAL '30 days'
    GROUP BY noted_at::date
    ORDER BY day ASC
  `).all(userId);
  res.json(rows);
});

// ─── Internal: recompute energy profile ──────────────────────────────────────

async function recomputeEnergyProfile(userId: string): Promise<void> {
  const ratings = await db.prepare(`
    SELECT energy_level, energy_type, noted_at
    FROM energy_ratings
    WHERE user_id = ? AND noted_at >= NOW() - INTERVAL '14 days'
  `).all(userId) as Array<{ energy_level: number; energy_type: string; noted_at: string }>;

  if (ratings.length < 5) return;

  // Compute hourly averages
  const byHour: Record<number, number[]> = {};
  for (const r of ratings) {
    const h = new Date(r.noted_at).getHours();
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(r.energy_level);
  }

  const hourAvgs = Object.entries(byHour).map(([h, vals]) => ({
    hour: Number(h),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));

  hourAvgs.sort((a, b) => b.avg - a.avg);
  const peakHours = hourAvgs.filter((h) => h.avg >= 3.5).map((h) => h.hour);
  const lowHours = hourAvgs.filter((h) => h.avg < 2.5).map((h) => h.hour);

  // Dominant energy type
  const typeCounts: Record<string, number> = {};
  for (const r of ratings) {
    typeCounts[r.energy_type] = (typeCounts[r.energy_type] || 0) + 1;
  }
  const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'general';

  await db.prepare(`
    INSERT INTO energy_profiles (user_id, peak_hours, low_hours, dominant_type, last_computed)
    VALUES (?, ?, ?, ?, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      peak_hours = EXCLUDED.peak_hours,
      low_hours = EXCLUDED.low_hours,
      dominant_type = EXCLUDED.dominant_type,
      last_computed = EXCLUDED.last_computed
  `).run(userId, JSON.stringify(peakHours), JSON.stringify(lowHours), dominantType);
}
