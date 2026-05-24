// ─── Streak Engine — Core Logic ───────────────────────────────────────────────
// Session 16 — Propel Stack AI, LLC
//
// Exported helpers used by both streaks routes and other hubs that fire
// streak-touch events (daily login in index.ts, athlete, health, etc.)

import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StreakType =
  | 'daily_login'
  | 'mood'
  | 'habit'
  | 'goal'
  | 'life_score'
  | 'finance'
  | 'weekly_recap';

export interface StreakRow {
  id: string;
  user_id: string;
  streak_type: string;
  habit_id: string;
  current_len: number;
  longest_ever: number;
  last_logged: string | null;
  grace_used: number; // 0 | 1
  updated_at: string;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** ISO date string for today UTC */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** ISO date string for yesterday UTC */
function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Days between two ISO date strings (a - b), always non-negative */
function daysBetween(a: string, b: string): number {
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.round(Math.abs(msA - msB) / 86_400_000);
}

// ─── Grace-period config per streak type ─────────────────────────────────────

interface StreakConfig {
  /** How many days missed before reset (1 = miss yesterday triggers reset) */
  missThreshold: number;
  /** Whether a 1-day grace period is available */
  gracePeriod: boolean;
}

const STREAK_CONFIG: Record<StreakType, StreakConfig> = {
  daily_login:   { missThreshold: 1, gracePeriod: false },
  mood:          { missThreshold: 1, gracePeriod: true  },
  habit:         { missThreshold: 1, gracePeriod: true  },
  goal:          { missThreshold: 3, gracePeriod: false }, // weekend passthrough simplified to 3-day miss
  life_score:    { missThreshold: 1, gracePeriod: false },
  finance:       { missThreshold: 2, gracePeriod: true  },
  weekly_recap:  { missThreshold: 7, gracePeriod: false },
};

// ─── Milestone badge thresholds ───────────────────────────────────────────────

const STREAK_MILESTONES: { len: number; title: string; type: StreakType | 'any' }[] = [
  { len: 7,   title: 'First Week',   type: 'daily_login' },
  { len: 30,  title: '30-Day Habit', type: 'habit'       },
  { len: 60,  title: '60-Day Habit', type: 'habit'       },
  { len: 100, title: '100-Day',      type: 'daily_login' },
];

// ─── Get or create streak row ─────────────────────────────────────────────────

async function getOrCreateStreak(
  userId: string,
  streakType: StreakType,
  habitId = '',
): Promise<StreakRow> {
  const existing = await db
    .prepare('SELECT * FROM streaks WHERE user_id = ? AND streak_type = ? AND habit_id = ?')
    .get(userId, streakType, habitId) as unknown as StreakRow | undefined;

  if (existing) return existing;

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO streaks (id, user_id, streak_type, habit_id, current_len, longest_ever, last_logged, grace_used)
    VALUES (?, ?, ?, ?, 0, 0, NULL, 0)
    ON CONFLICT (user_id, streak_type, habit_id) DO NOTHING
  `).run(id, userId, streakType, habitId);

  const row = await db
    .prepare('SELECT * FROM streaks WHERE user_id = ? AND streak_type = ? AND habit_id = ?')
    .get(userId, streakType, habitId) as unknown as StreakRow;
  return row;
}

// ─── Award badge / life win ───────────────────────────────────────────────────

async function awardBadgeIfMilestone(userId: string, streak: StreakRow): Promise<void> {
  const type = streak.streak_type as StreakType;
  for (const ms of STREAK_MILESTONES) {
    if (streak.current_len !== ms.len) continue;
    if (ms.type !== 'any' && ms.type !== type) continue;

    // Check if this badge has already been awarded
    const today = todayUTC();
    const existing = await db.prepare(`
      SELECT id FROM life_wins
      WHERE user_id = ? AND win_type = 'badge' AND title = ? AND source_hub = 'streaks'
    `).get(userId, ms.title) as { id: string } | undefined;
    if (existing) continue;

    await db.prepare(`
      INSERT INTO life_wins (id, user_id, win_type, title, detail, source_hub, is_shared, occurred_on)
      VALUES (?, ?, 'badge', ?, ?, 'streaks', 0, ?)
    `).run(
      randomUUID(),
      userId,
      ms.title,
      `${streak.current_len}-day ${streak.streak_type.replace('_', ' ')} streak reached!`,
      today,
    );
  }
}

async function awardComebackBadge(userId: string, daysMissed: number): Promise<void> {
  if (daysMissed < 7) return;
  const existing = await db.prepare(`
    SELECT id FROM life_wins
    WHERE user_id = ? AND win_type = 'badge' AND title = 'Comeback'
      AND occurred_on = ?
  `).get(userId, todayUTC()) as { id: string } | undefined;
  if (existing) return;

  await db.prepare(`
    INSERT INTO life_wins (id, user_id, win_type, title, detail, source_hub, is_shared, occurred_on)
    VALUES (?, ?, 'badge', 'Comeback', ?, 'streaks', 0, ?)
  `).run(
    randomUUID(),
    userId,
    `Welcome back after ${daysMissed} days away. You haven't lost anything. Let's pick up.`,
    todayUTC(),
  );
}

// ─── Touch a streak (main exported function) ──────────────────────────────────

/**
 * Call this whenever a relevant user action fires.
 * Returns the updated streak row.
 */
export async function touchStreak(
  userId: string,
  streakType: StreakType,
  habitId = '',
): Promise<StreakRow> {
  const streak = await getOrCreateStreak(userId, streakType, habitId);
  const today = todayUTC();
  const yesterday = yesterdayUTC();
  const config = STREAK_CONFIG[streakType];

  if (streak.last_logged === today) {
    // Already touched today — no change
    return streak;
  }

  let newLen = streak.current_len;
  let newGraceUsed = streak.grace_used;
  let comeback = 0;

  if (!streak.last_logged) {
    // First touch ever
    newLen = 1;
    newGraceUsed = 0;
  } else {
    const missed = daysBetween(today, streak.last_logged) - 1; // days NOT logged (0 = consecutive)

    if (missed === 0) {
      // Consecutive day
      newLen += 1;
      newGraceUsed = 0; // reset grace availability on consecutive day
    } else if (missed <= config.missThreshold - 1) {
      // Within threshold — still consecutive (e.g., goal has 3-day threshold)
      newLen += 1;
      newGraceUsed = 0;
    } else if (missed === config.missThreshold && config.gracePeriod && streak.grace_used === 0) {
      // Used grace period
      newLen += 1;
      newGraceUsed = 1;
    } else {
      // Streak broken
      comeback = missed;
      newLen = 1;
      newGraceUsed = 0;
    }
  }

  const newLongest = Math.max(streak.longest_ever, newLen);

  await db.prepare(`
    UPDATE streaks
    SET current_len = ?, longest_ever = ?, last_logged = ?, grace_used = ?, updated_at = NOW()
    WHERE id = ?
  `).run(newLen, newLongest, today, newGraceUsed, streak.id);

  const updated = { ...streak, current_len: newLen, longest_ever: newLongest, last_logged: today, grace_used: newGraceUsed };

  // Check milestones
  await awardBadgeIfMilestone(userId, updated);

  // Comeback badge
  if (comeback >= 7) await awardComebackBadge(userId, comeback);

  return updated;
}

// ─── Reset check (lazy evaluation — run before returning streaks) ─────────────

export async function resetExpiredStreaks(userId: string): Promise<void> {
  const rows = await db.prepare(
    'SELECT * FROM streaks WHERE user_id = ? AND current_len > 0 AND last_logged IS NOT NULL'
  ).all(userId) as unknown as StreakRow[];

  const today = todayUTC();

  for (const s of rows) {
    if (!s.last_logged || s.last_logged === today) continue;
    const config = STREAK_CONFIG[s.streak_type as StreakType] ?? STREAK_CONFIG.daily_login;
    const missed = daysBetween(today, s.last_logged) - 1;

    let shouldReset = false;
    if (missed > config.missThreshold) {
      shouldReset = true;
    } else if (missed === config.missThreshold && (!config.gracePeriod || s.grace_used === 1)) {
      shouldReset = true;
    }

    if (shouldReset) {
      await db.prepare(`
        UPDATE streaks SET current_len = 0, grace_used = 0, updated_at = NOW()
        WHERE id = ?
      `).run(s.id);
    }
  }
}

// ─── Auto-log a Life Win from any hub ─────────────────────────────────────────

export async function logLifeWin(
  userId: string,
  opts: {
    win_type: string;
    title: string;
    detail?: string;
    source_hub?: string;
    occurred_on?: string;
  },
): Promise<void> {
  await db.prepare(`
    INSERT INTO life_wins (id, user_id, win_type, title, detail, source_hub, is_shared, occurred_on)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    randomUUID(),
    userId,
    opts.win_type,
    opts.title,
    opts.detail ?? '',
    opts.source_hub ?? '',
    opts.occurred_on ?? todayUTC(),
  );
}
