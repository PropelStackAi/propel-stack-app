/**
 * Settings API — Propel Stack AI, LLC
 *
 * Enhancement 17: "Not Now" Mode — user-controlled do-not-disturb
 * Suppresses briefings, notifications, and re-engagement messages.
 */
import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';

export const settingsRouter = Router();

// ─── Not Now Mode (Enhancement 17) ───────────────────────────────────────────

type NotNowDuration = '1h' | '4h' | '8h' | 'tomorrow' | 'indefinite';

function calcNotNowUntil(duration: NotNowDuration): string | null {
  const now = new Date();
  switch (duration) {
    case '1h':         { const d = new Date(now.getTime() + 60 * 60_000); return d.toISOString(); }
    case '4h':         { const d = new Date(now.getTime() + 4 * 60 * 60_000); return d.toISOString(); }
    case '8h':         { const d = new Date(now.getTime() + 8 * 60 * 60_000); return d.toISOString(); }
    case 'tomorrow': {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0); // Resume at 9 AM tomorrow
      return d.toISOString();
    }
    case 'indefinite':
    default:           return null; // null = on indefinitely until manually cleared
  }
}

// GET /api/settings/not-now — check current status
settingsRouter.get('/not-now', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const user = await db
    .prepare('SELECT not_now_until FROM users WHERE id = ?')
    .get(userId) as { not_now_until: string | null } | undefined;

  const notNowUntil = user?.not_now_until ?? null;
  const isActive = notNowUntil === null
    ? false  // no value = not active
    : notNowUntil > new Date().toISOString(); // null not_now_until means NOT set

  // If expired, auto-clear it
  if (notNowUntil && !isActive) {
    await db.prepare("UPDATE users SET not_now_until = NULL WHERE id = ?").run(userId);
  }

  res.json({
    active: isActive,
    until: isActive ? notNowUntil : null,
    untilFormatted: isActive && notNowUntil
      ? new Date(notNowUntil).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
      : null,
  });
});

// POST /api/settings/not-now — activate Not Now mode
settingsRouter.post('/not-now', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { duration = '4h' } = req.body ?? {};

  const until = calcNotNowUntil(duration as NotNowDuration);

  // For indefinite: store a far-future timestamp so NULL stays as "unset"
  const storedUntil = until ?? new Date(Date.now() + 365 * 24 * 60 * 60_000).toISOString();

  await db.prepare("UPDATE users SET not_now_until = ? WHERE id = ?").run(storedUntil, userId);

  res.json({
    active: true,
    until: storedUntil,
    duration,
    message: until
      ? `Not Now mode active until ${new Date(storedUntil).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      : 'Not Now mode active indefinitely',
  });
});

// DELETE /api/settings/not-now — clear Not Now mode
settingsRouter.delete('/not-now', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  await db.prepare("UPDATE users SET not_now_until = NULL WHERE id = ?").run(userId);
  res.json({ active: false, message: 'Not Now mode cleared' });
});

// ─── Family Sharing Toggle (Enhancement 22) ──────────────────────────────────

settingsRouter.get('/family-sharing', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const user = await db
    .prepare('SELECT family_sharing_enabled, plan_tier FROM users WHERE id = ?')
    .get(userId) as { family_sharing_enabled: boolean; plan_tier: string } | undefined;

  const isFamilyPlan = ['family', 'network', 'elite'].includes(user?.plan_tier ?? '');

  res.json({
    enabled: !!user?.family_sharing_enabled,
    available: isFamilyPlan,
    planTier: user?.plan_tier ?? 'spark',
  });
});

settingsRouter.post('/family-sharing', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { enabled } = req.body ?? {};
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled (boolean) required' });

  // Check plan tier
  const user = await db
    .prepare('SELECT plan_tier FROM users WHERE id = ?')
    .get(userId) as { plan_tier: string } | undefined;
  const isFamilyPlan = ['family', 'network', 'elite'].includes(user?.plan_tier ?? '');

  if (!isFamilyPlan) {
    return res.status(403).json({ error: 'Family sharing requires a Family, Network, or Elite plan' });
  }

  await db
    .prepare('UPDATE users SET family_sharing_enabled = ? WHERE id = ?')
    .run(enabled, userId);

  res.json({ enabled, ok: true });
});

// ─── Theme Preference (Enhancement 27 — Dark Mode) ───────────────────────────

settingsRouter.get('/theme', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const user = await db
    .prepare('SELECT theme_preference FROM users WHERE id = ?')
    .get(userId) as { theme_preference: string } | undefined;
  res.json({ theme: user?.theme_preference ?? 'system' });
});

settingsRouter.post('/theme', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { theme } = req.body ?? {};
  const VALID_THEMES = ['light', 'dark', 'system'];
  if (!VALID_THEMES.includes(theme)) {
    return res.status(400).json({ error: 'theme must be light, dark, or system' });
  }
  await db.prepare('UPDATE users SET theme_preference = ? WHERE id = ?').run(theme, userId);
  res.json({ theme, ok: true });
});

// ─── Utility: check if user is in Not Now mode (used by jobs) ────────────────

export async function isUserInNotNowMode(userId: string): Promise<boolean> {
  const user = await db
    .prepare('SELECT not_now_until FROM users WHERE id = ?')
    .get(userId) as { not_now_until: string | null } | undefined;

  const until = user?.not_now_until;
  if (!until) return false;
  return until > new Date().toISOString();
}
