import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { logActivity } from '../lib/dashboard.js';

/**
 * Parental Controls API — Session 9.
 * Child profiles are COPPA-compliant: no email, no DOB, no behavioral data.
 * All AI usage logs store category only (story/homework/game) — never message content.
 * Requires Family plan (plan_tier in: family | network | elite).
 */
export const parentalRouter = Router();

// ── helpers ────────────────────────────────────────────────────────────────

function newId(): string {
  return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function hashPin(pin: string): string {
  return createHash('sha256').update(`psai-pin-v1:${pin}`).digest('hex');
}

async function getChild(id: string, parentUserId: string) {
  return db.prepare(
    'SELECT * FROM child_profiles WHERE id = ? AND parent_user_id = ?',
  ).get(id, parentUserId);
}

const FAMILY_PLANS = new Set(['family', 'network', 'elite']);

async function assertFamilyPlan(userId: string, res: Response): Promise<boolean> {
  const user = await db.prepare('SELECT plan_tier FROM users WHERE id = ?').get(userId) as
    | { plan_tier: string }
    | undefined;
  if (!user || !FAMILY_PLANS.has(user.plan_tier)) {
    res.status(403).json({ error: 'Parental Controls require the Family plan or higher.' });
    return false;
  }
  return true;
}

// ── List children ───────────────────────────────────────────────────────────

parentalRouter.get('/children', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  if (!await assertFamilyPlan(userId, res)) return;
  const children = await db.prepare(
    `SELECT id, name, avatar_emoji, age_range, content_filter, ai_logging_enabled,
            screen_time_limit_minutes, app_sections_approved,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
            created_at
     FROM child_profiles WHERE parent_user_id = ? ORDER BY created_at ASC`,
  ).all(userId);
  res.json(children);
});

// ── Create child profile ────────────────────────────────────────────────────

parentalRouter.post('/children', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  if (!await assertFamilyPlan(userId, res)) return;
  const { name, avatarEmoji = '🧒', ageRange = 'child', screenTimeLimitMinutes = 60 } = req.body as {
    name?: string;
    avatarEmoji?: string;
    ageRange?: string;
    screenTimeLimitMinutes?: number;
  };
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Child name is required.' });
  }
  const id = newId();
  await db.prepare(
    `INSERT INTO child_profiles (id, parent_user_id, name, avatar_emoji, age_range, screen_time_limit_minutes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, name.trim(), avatarEmoji, ageRange, Number(screenTimeLimitMinutes));
  await logActivity(userId, 'parental', `Added child profile: ${name.trim()}`);
  res.status(201).json(await getChild(id, userId));
});

// ── Update child settings ───────────────────────────────────────────────────

parentalRouter.patch('/children/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  if (!await getChild(id, userId)) return res.status(404).json({ error: 'Not found' });

  const body = req.body as Record<string, unknown>;
  const updates: string[] = [];
  const values: unknown[] = [];

  const str = (k: string, col: string) => {
    if (body[k] !== undefined) { updates.push(`${col} = ?`); values.push(String(body[k]).trim()); }
  };
  const bool = (k: string, col: string) => {
    if (body[k] !== undefined) { updates.push(`${col} = ?`); values.push(body[k] ? 1 : 0); }
  };
  const num = (k: string, col: string) => {
    if (body[k] !== undefined) { updates.push(`${col} = ?`); values.push(Number(body[k])); }
  };

  str('name', 'name');
  str('avatarEmoji', 'avatar_emoji');
  str('ageRange', 'age_range');
  str('emergencyContactName', 'emergency_contact_name');
  str('emergencyContactPhone', 'emergency_contact_phone');
  str('emergencyContactRelation', 'emergency_contact_relation');
  bool('contentFilter', 'content_filter');
  bool('aiLoggingEnabled', 'ai_logging_enabled');
  num('screenTimeLimitMinutes', 'screen_time_limit_minutes');
  if (body['appSectionsApproved'] !== undefined) {
    updates.push('app_sections_approved = ?');
    values.push(JSON.stringify(body['appSectionsApproved']));
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  await db.prepare(`UPDATE child_profiles SET ${updates.join(', ')} WHERE id = ? AND parent_user_id = ?`)
    .run(...values, id, userId);
  res.json(await getChild(id, userId));
});

// ── Delete child profile ────────────────────────────────────────────────────

parentalRouter.delete('/children/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = await db.prepare('DELETE FROM child_profiles WHERE id = ? AND parent_user_id = ?')
    .run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ── Set parent override PIN ─────────────────────────────────────────────────

parentalRouter.post('/children/:id/pin', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { pin } = req.body as { pin?: string };
  if (!pin || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 6 digits.' });
  }
  if (!await getChild(req.params.id as string, userId)) return res.status(404).json({ error: 'Not found' });
  await db.prepare('UPDATE child_profiles SET pin_hash = ? WHERE id = ? AND parent_user_id = ?')
    .run(hashPin(pin), req.params.id as string, userId);
  res.json({ ok: true });
});

// ── Verify parent PIN (screen-time unlock) ──────────────────────────────────

parentalRouter.post('/children/:id/pin/verify', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { pin } = req.body as { pin?: string };
  if (!pin) return res.status(400).json({ error: 'PIN required' });
  const child = await db.prepare(
    'SELECT pin_hash FROM child_profiles WHERE id = ? AND parent_user_id = ?',
  ).get(req.params.id as string, userId) as { pin_hash: string | null } | undefined;
  if (!child) return res.status(404).json({ error: 'Not found' });
  if (!child.pin_hash) return res.json({ ok: true, note: 'No PIN set — access granted.' });
  if (child.pin_hash !== hashPin(pin)) return res.status(401).json({ error: 'Incorrect PIN.' });
  res.json({ ok: true });
});

// ── AI usage summary (category only — NEVER message content) ───────────────

parentalRouter.get('/children/:id/usage', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  if (!await getChild(req.params.id as string, userId)) return res.status(404).json({ error: 'Not found' });
  const childId = req.params.id as string;

  const summary = await db.prepare(`
    SELECT session_type,
           COUNT(*) AS session_count,
           SUM(interaction_count) AS interaction_count
    FROM kids_ai_sessions WHERE child_profile_id = ?
    GROUP BY session_type ORDER BY session_count DESC
  `).all(childId);

  const recent = await db.prepare(`
    SELECT session_type, created_at FROM kids_ai_sessions
    WHERE child_profile_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(childId);

  res.json({ summary, recent });
});

// ── Screen time status (today) ─────────────────────────────────────────────

parentalRouter.get('/children/:id/screen-time', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const child = await db.prepare(
    'SELECT screen_time_limit_minutes FROM child_profiles WHERE id = ? AND parent_user_id = ?',
  ).get(req.params.id as string, userId) as { screen_time_limit_minutes: number } | undefined;
  if (!child) return res.status(404).json({ error: 'Not found' });

  const today = new Date().toISOString().slice(0, 10);
  const row = await db.prepare(
    'SELECT minutes_used FROM child_screen_time WHERE child_profile_id = ? AND session_date = ?',
  ).get(req.params.id as string, today) as { minutes_used: number } | undefined;

  const used = row?.minutes_used ?? 0;
  const limit = child.screen_time_limit_minutes;
  res.json({ usedMinutes: used, limitMinutes: limit, remainingMinutes: Math.max(0, limit - used), allowed: used < limit });
});
