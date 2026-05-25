// ─── Feature Flags & A/B Testing Scaffold — Enhancement 32 ──────────────────
// Propel Stack AI, LLC

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';

export const featureFlagsRouter = Router();

// ─── GET /api/flags — get all feature flags for current user ──────────────────
featureFlagsRouter.get('/', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();

  const flags = await db.prepare(
    'SELECT flag_key, enabled, rollout_pct, description FROM feature_flags ORDER BY flag_key ASC'
  ).all() as Array<{ flag_key: string; enabled: boolean; rollout_pct: number; description: string }>;

  // Apply user-level overrides / rollout sampling
  const assignments = await db.prepare(
    'SELECT flag_key, variant FROM user_flag_assignments WHERE user_id = ?'
  ).all(userId) as Array<{ flag_key: string; variant: string }>;

  const assignMap = new Map(assignments.map((a) => [a.flag_key, a.variant]));

  const result: Record<string, boolean | string> = {};
  for (const flag of flags) {
    const override = assignMap.get(flag.flag_key);
    if (override) {
      result[flag.flag_key] = override !== 'control';
    } else if (!flag.enabled) {
      result[flag.flag_key] = false;
    } else if (flag.rollout_pct >= 100) {
      result[flag.flag_key] = true;
    } else {
      // Deterministic rollout based on userId hash
      const hash = simpleHash(userId + flag.flag_key) % 100;
      result[flag.flag_key] = hash < flag.rollout_pct;
    }
  }

  res.json(result);
});

// ─── GET /api/flags/:key — check a specific flag ─────────────────────────────
featureFlagsRouter.get('/:key', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { key } = req.params;

  const flag = await db.prepare(
    'SELECT enabled, rollout_pct FROM feature_flags WHERE flag_key = ?'
  ).get(key) as { enabled: boolean; rollout_pct: number } | undefined;

  if (!flag) return res.json({ enabled: false });

  const override = await db.prepare(
    'SELECT variant FROM user_flag_assignments WHERE user_id = ? AND flag_key = ?'
  ).get(userId, key) as { variant: string } | undefined;

  if (override) return res.json({ enabled: override.variant !== 'control' });
  if (!flag.enabled) return res.json({ enabled: false });
  if (flag.rollout_pct >= 100) return res.json({ enabled: true });

  const hash = simpleHash(userId + key) % 100;
  return res.json({ enabled: hash < flag.rollout_pct });
});

// ─── PUT /api/flags/:key — admin: update a flag ───────────────────────────────
featureFlagsRouter.put('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const { enabled, rollout_pct, description } = req.body ?? {};

  const updates: string[] = [];
  const values: unknown[] = [];
  if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled); }
  if (rollout_pct !== undefined) { updates.push('rollout_pct = ?'); values.push(rollout_pct); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (updates.length === 0) return res.status(400).json({ error: 'no updates provided' });

  updates.push('updated_at = NOW()');
  values.push(key);

  await db.prepare(
    `INSERT INTO feature_flags (flag_key, enabled, rollout_pct, description)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (flag_key) DO UPDATE SET ${updates.join(', ')}`
  ).run(key, enabled ?? true, rollout_pct ?? 100, description ?? '', ...values);

  res.json({ ok: true });
});

// ─── GET /api/flags/experiments/list — list A/B experiments ──────────────────
featureFlagsRouter.get('/experiments/list', async (_req: Request, res: Response) => {
  const experiments = await db.prepare(
    'SELECT * FROM ab_experiments ORDER BY started_at DESC'
  ).all();
  res.json(experiments);
});

// ─── POST /api/flags/experiments — create experiment ─────────────────────────
featureFlagsRouter.post('/experiments', async (req: Request, res: Response) => {
  const { exp_key, variant_a, variant_b, traffic_split = 50 } = req.body ?? {};
  if (!exp_key || !variant_a || !variant_b) {
    return res.status(400).json({ error: 'exp_key, variant_a, variant_b required' });
  }

  await db.prepare(`
    INSERT INTO ab_experiments (exp_key, variant_a, variant_b, traffic_split)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (exp_key) DO UPDATE SET
      variant_a = EXCLUDED.variant_a,
      variant_b = EXCLUDED.variant_b,
      traffic_split = EXCLUDED.traffic_split
  `).run(exp_key, variant_a, variant_b, traffic_split);

  res.status(201).json({ ok: true });
});

// ─── GET /api/flags/experiment/:key/variant — get user's variant ──────────────
featureFlagsRouter.get('/experiment/:key/variant', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { key } = req.params;

  const existing = await db.prepare(
    'SELECT variant FROM user_flag_assignments WHERE user_id = ? AND flag_key = ?'
  ).get(userId, key) as { variant: string } | undefined;

  if (existing) return res.json({ variant: existing.variant });

  // Assign variant deterministically
  const exp = await db.prepare(
    'SELECT variant_a, variant_b, traffic_split FROM ab_experiments WHERE exp_key = ?'
  ).get(key) as { variant_a: string; variant_b: string; traffic_split: number } | undefined;

  if (!exp) return res.json({ variant: 'control' });

  const hash = simpleHash(userId + key) % 100;
  const variant = hash < exp.traffic_split ? exp.variant_a : exp.variant_b;

  await db.prepare(
    'INSERT INTO user_flag_assignments (user_id, flag_key, variant) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
  ).run(userId, key, variant);

  res.json({ variant });
});

// ─── Utility ─────────────────────────────────────────────────────────────────

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
