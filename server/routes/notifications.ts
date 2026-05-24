// ─── Smart Notification Intelligence ─────────────────────────────────────────
// Enhancement 17 — Propel Stack AI, LLC
//
// Contextual nudge system with adaptive timing, fatigue rules, and preferences.

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';

export const notificationsRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerKey =
  | 'no_mood_log'
  | 'streak_at_risk'
  | 'recap_unread'
  | 'life_score_drop'
  | 'goal_deadline'
  | 'finance_spike'
  | 'absence';

interface TriggerDef {
  key: TriggerKey;
  notif_type: string;
  label: string;
  cooldown_hours: number; // min hours between same trigger firing
  max_per_day: number;    // max fires per day per trigger (bounded by global 3/day cap)
  mental_health: boolean; // requires explicit opt-in
}

const TRIGGERS: TriggerDef[] = [
  { key: 'no_mood_log',     notif_type: 'nudge',    label: 'Mood check-in reminders',         cooldown_hours: 72,  max_per_day: 1, mental_health: true  },
  { key: 'streak_at_risk',  notif_type: 'streak',   label: 'Streak at-risk alerts',           cooldown_hours: 20,  max_per_day: 2, mental_health: false },
  { key: 'recap_unread',    notif_type: 'recap',    label: 'Weekly recap reminders',           cooldown_hours: 168, max_per_day: 1, mental_health: false },
  { key: 'life_score_drop', notif_type: 'coach',    label: 'Life Score drop alerts',          cooldown_hours: 168, max_per_day: 1, mental_health: true  },
  { key: 'goal_deadline',   notif_type: 'coach',    label: 'Goal deadline nudges',            cooldown_hours: 72,  max_per_day: 1, mental_health: false },
  { key: 'finance_spike',   notif_type: 'reminder', label: 'Spending spike alerts',           cooldown_hours: 168, max_per_day: 1, mental_health: false },
  { key: 'absence',         notif_type: 'nudge',    label: 'Re-engagement nudges (absence)',  cooldown_hours: 168, max_per_day: 1, mental_health: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowHour(): number {
  return new Date().getHours();
}

function isQuietHours(): boolean {
  const h = nowHour();
  return h >= 22 || h < 7;
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity;
  const ms = Date.now() - new Date(dateStr).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

// Check if user has this trigger enabled (default: enabled, except mental_health defaults off)
async function isTriggerEnabled(userId: string, key: TriggerKey, mental_health: boolean): Promise<boolean> {
  const row = await db
    .prepare('SELECT enabled FROM notification_preferences WHERE user_id = ? AND trigger_key = ?')
    .get(userId, key);
  if (row) return Boolean(row.enabled);
  // Default: mental_health triggers are opt-in (disabled by default)
  return !mental_health;
}

// Check cooldown — returns true if OK to send
async function passesCooldown(userId: string, key: TriggerKey, cooldownHours: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
  const row = await db
    .prepare(`SELECT id FROM notification_events WHERE user_id = ? AND trigger_key = ? AND sent_at > ? LIMIT 1`)
    .get(userId, key, cutoff);
  return !row;
}

// Check daily cap — max 3/day global, drop to 1/day if open rate < 20%
async function passesDailyCap(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const todayRows = await db
    .prepare(`SELECT id FROM notification_events WHERE user_id = ? AND sent_at >= ?`)
    .all(userId, todayIso) as Record<string, unknown>[];

  // Check open rate of last 10
  const last10 = await db
    .prepare(`SELECT opened_at FROM notification_events WHERE user_id = ? ORDER BY sent_at DESC LIMIT 10`)
    .all(userId) as Record<string, unknown>[];

  let cap = 3;
  if (last10.length >= 10) {
    const opened = last10.filter((r) => r.opened_at).length;
    if (opened / last10.length < 0.2) cap = 1;
  }

  return todayRows.length < cap;
}

// Create a notification event
async function sendNotification(
  userId: string,
  trigger: TriggerDef,
  title: string,
  body: string,
): Promise<Record<string, unknown>> {
  const id = randomUUID();
  const now = new Date();
  const hour_of_day = now.getHours();
  const day_of_week = now.getDay(); // 0=Sun..6=Sat

  await db.prepare(`
    INSERT INTO notification_events (id, user_id, notif_type, trigger_key, title, body, sent_at, hour_of_day, day_of_week)
    VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
  `).run(id, userId, trigger.notif_type, trigger.key, title, body, hour_of_day, day_of_week);

  return { id, notif_type: trigger.notif_type, trigger_key: trigger.key, title, body, sent_at: now.toISOString(), opened_at: null };
}

// ─── Trigger Evaluators ───────────────────────────────────────────────────────

async function evalNoMoodLog(userId: string): Promise<{ title: string; body: string } | null> {
  try {
    const row = await db
      .prepare(`SELECT log_date FROM mood_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 1`)
      .get(userId) as Record<string, unknown> | undefined;
    if (daysSince(row?.log_date as string) >= 3) {
      return {
        title: 'Check-in time 👋',
        body: "You haven't checked in for a few days. No pressure — just here when you're ready.",
      };
    }
  } catch { /* table may not have data */ }
  return null;
}

async function evalStreakAtRisk(userId: string): Promise<{ title: string; body: string } | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .prepare(`SELECT streak_type, current_len FROM streaks WHERE user_id = ? AND current_len > 0 AND (last_logged IS NULL OR last_logged < ?)`)
      .all(userId, today) as Record<string, unknown>[];
    if (rows.length > 0) {
      const top = rows[0];
      return {
        title: `Streak at risk ⚡`,
        body: `Your ${top.current_len}-day ${top.streak_type} streak is still alive. Log today to keep it going.`,
      };
    }
  } catch { /* non-fatal */ }
  return null;
}

async function evalRecapUnread(userId: string): Promise<{ title: string; body: string } | null> {
  try {
    const row = await db
      .prepare(`SELECT id FROM weekly_recaps WHERE user_id = ? AND opened_at IS NULL ORDER BY created_at DESC LIMIT 1`)
      .get(userId) as Record<string, unknown> | undefined;
    if (row) {
      return {
        title: 'Your weekly recap is waiting 📋',
        body: "Your weekly recap is ready. 2-minute read before your week kicks off.",
      };
    }
  } catch { /* non-fatal */ }
  return null;
}

async function evalAbsence(userId: string): Promise<{ title: string; body: string } | null> {
  try {
    const row = await db
      .prepare(`SELECT sent_at FROM notification_events WHERE user_id = ? ORDER BY sent_at DESC LIMIT 1`)
      .get(userId) as Record<string, unknown> | undefined;
    // If we've never sent a notification but user exists, check if they've been inactive
    // We check last notification send as a proxy for app activity
    if (!row || daysSince(row.sent_at as string) >= 7) {
      // Also verify no recent mood logs, streaks, etc. as proxy for absence
      const recentStreak = await db
        .prepare(`SELECT updated_at FROM streaks WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`)
        .get(userId) as Record<string, unknown> | undefined;
      if (!recentStreak || daysSince(recentStreak.updated_at as string) >= 7) {
        return {
          title: 'We miss you 👋',
          body: "Life got busy — totally get it. Your streaks are paused, not gone. Come back.",
        };
      }
    }
  } catch { /* non-fatal */ }
  return null;
}

async function evalFinanceSpike(userId: string): Promise<{ title: string; body: string } | null> {
  try {
    // Compare this week's spending to 4-week average
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const fourWeekStart = new Date();
    fourWeekStart.setDate(fourWeekStart.getDate() - 35);

    const thisWeek = await db
      .prepare(`SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = ? AND occurred_at >= ? AND type = 'expense'`)
      .get(userId, thisWeekStart.toISOString().slice(0, 10)) as Record<string, unknown> | undefined;
    const prevFourWeeks = await db
      .prepare(`SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = ? AND occurred_at >= ? AND occurred_at < ? AND type = 'expense'`)
      .get(userId, fourWeekStart.toISOString().slice(0, 10), thisWeekStart.toISOString().slice(0, 10)) as Record<string, unknown> | undefined;

    const weeklyAvg = Number(prevFourWeeks?.total ?? 0) / 4;
    const thisWeekTotal = Number(thisWeek?.total ?? 0);

    if (weeklyAvg > 0 && thisWeekTotal > weeklyAvg * 1.4) {
      return {
        title: 'Spending spike detected 💸',
        body: `Heads up — your spending is running about ${Math.round(((thisWeekTotal / weeklyAvg) - 1) * 100)}% over your usual this week.`,
      };
    }
  } catch { /* non-fatal */ }
  return null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/notifications — notification feed (last 50)
notificationsRouter.get('/', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare(`SELECT * FROM notification_events WHERE user_id = ? ORDER BY sent_at DESC LIMIT 50`)
      .all(userId);
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/notifications/unread-count
notificationsRouter.get('/unread-count', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const row = await db
      .prepare(`SELECT COUNT(*) as count FROM notification_events WHERE user_id = ? AND opened_at IS NULL`)
      .get(userId) as Record<string, unknown> | undefined;
    res.json({ count: Number(row?.count ?? 0) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/notifications/:id/open — mark as opened
notificationsRouter.post('/:id/open', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db
      .prepare(`UPDATE notification_events SET opened_at = NOW() WHERE id = ? AND user_id = ? AND opened_at IS NULL`)
      .run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/notifications/open-all — mark all as opened
notificationsRouter.post('/open-all', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    await db
      .prepare(`UPDATE notification_events SET opened_at = NOW() WHERE user_id = ? AND opened_at IS NULL`)
      .run(userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/notifications/preferences — all per-type settings
notificationsRouter.get('/preferences', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare(`SELECT trigger_key, enabled FROM notification_preferences WHERE user_id = ?`)
      .all(userId) as Record<string, unknown>[];

    const map = new Map(rows.map((r) => [r.trigger_key as string, Boolean(r.enabled)]));

    // Return all triggers with their current enabled state (defaults applied)
    const prefs = TRIGGERS.map((t) => ({
      key: t.key,
      notif_type: t.notif_type,
      label: t.label,
      mental_health: t.mental_health,
      enabled: map.has(t.key) ? map.get(t.key)! : !t.mental_health,
    }));

    res.json({ preferences: prefs });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/notifications/preferences — update a preference
notificationsRouter.patch('/preferences', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { trigger_key, enabled } = req.body as { trigger_key: string; enabled: boolean };
    const id = randomUUID();

    await db.prepare(`
      INSERT INTO notification_preferences (id, user_id, trigger_key, enabled)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, trigger_key) DO UPDATE SET enabled = EXCLUDED.enabled
    `).run(id, userId, trigger_key, enabled ? 1 : 0);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/notifications/window — best delivery hour for this user
notificationsRouter.get('/window', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    // Find hour with highest open rate in last 28 days
    const bestRow = await db.prepare(`
      SELECT hour_of_day,
             COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::float / COUNT(*) AS open_rate,
             COUNT(*) as total
      FROM notification_events
      WHERE user_id = ? AND sent_at > NOW() - INTERVAL '28 days'
      GROUP BY hour_of_day
      ORDER BY open_rate DESC, total DESC
      LIMIT 1
    `).get(userId) as Record<string, unknown> | undefined;

    res.json({
      best_hour: bestRow ? Number(bestRow.hour_of_day) : 9,
      open_rate: bestRow ? Number(bestRow.open_rate) : null,
      has_data: !!bestRow,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/notifications/nudge — evaluate triggers and generate notifications
notificationsRouter.post('/nudge', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const generated: Record<string, unknown>[] = [];

    // Quiet hours check — don't generate new nudges during quiet hours
    if (isQuietHours()) {
      return res.json({ generated: [], reason: 'quiet_hours' });
    }

    // Daily cap check
    if (!(await passesDailyCap(userId))) {
      return res.json({ generated: [], reason: 'daily_cap' });
    }

    // Evaluate each trigger in priority order
    const evaluators: Array<[TriggerKey, () => Promise<{ title: string; body: string } | null>]> = [
      ['streak_at_risk',  () => evalStreakAtRisk(userId)],
      ['recap_unread',    () => evalRecapUnread(userId)],
      ['no_mood_log',     () => evalNoMoodLog(userId)],
      ['finance_spike',   () => evalFinanceSpike(userId)],
      ['absence',         () => evalAbsence(userId)],
    ];

    for (const [key, evaluate] of evaluators) {
      const trigger = TRIGGERS.find((t) => t.key === key)!;

      // Check if enabled by user
      if (!(await isTriggerEnabled(userId, key, trigger.mental_health))) continue;

      // Check cooldown
      if (!(await passesCooldown(userId, key, trigger.cooldown_hours))) continue;

      // Re-check daily cap (may have changed as we added notifications)
      if (!(await passesDailyCap(userId))) break;

      // Evaluate condition
      const result = await evaluate();
      if (!result) continue;

      // Fire the notification
      const notif = await sendNotification(userId, trigger, result.title, result.body);
      generated.push(notif);
    }

    res.json({ generated });
  } catch (err) {
    console.error('[notifications/nudge]', err);
    res.status(500).json({ error: String(err) });
  }
});

