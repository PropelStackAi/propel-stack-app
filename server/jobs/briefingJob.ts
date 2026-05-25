/**
 * Briefing Scheduler — Propel Stack AI, LLC
 *
 * Enhancement 7: Daily 7 AM morning briefing generation per user
 * Enhancement 8: Sunday 8 PM weekly life review generation per user
 *
 * Briefings are generated lazily (on first GET /today) but this job
 * pre-warms the cache at the scheduled time so the dashboard is instant.
 */
import { db } from '../db.js';
import { generateBriefing, generateWeeklyReview } from '../routes/briefing.js';

function msUntil(targetHour: number, targetDayOfWeek?: number): number {
  const now = new Date();
  const next = new Date(now);

  if (targetDayOfWeek !== undefined) {
    const daysUntil = ((targetDayOfWeek - now.getDay()) + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntil);
  } else {
    if (now.getHours() >= targetHour) {
      next.setDate(now.getDate() + 1);
    }
  }
  next.setHours(targetHour, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

async function runMorningBriefings(): Promise<void> {
  try {
    const users = await db.prepare('SELECT id FROM users').all() as { id: string }[];
    const today = new Date().toISOString().slice(0, 10);

    for (const user of users) {
      const existing = await db
        .prepare('SELECT id FROM morning_briefings WHERE user_id = ? AND briefing_date = ?')
        .get(user.id, today);

      if (!existing) {
        generateBriefing(user.id, today).catch((err) =>
          console.error(`[briefing] Morning briefing failed for ${user.id}:`, err),
        );
      }
    }
    console.log(`[briefing] Morning briefings queued for ${users.length} user(s) on ${today}`);
  } catch (err) {
    console.error('[briefing] Morning briefing scheduler error:', err);
  }

  // Schedule next 7 AM
  setTimeout(() => { runMorningBriefings(); }, msUntil(7));
}

async function runWeeklyReviews(): Promise<void> {
  try {
    const users = await db.prepare('SELECT id FROM users').all() as { id: string }[];

    const d = new Date();
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    const weekStart = mon.toISOString().slice(0, 10);

    for (const user of users) {
      const existing = await db
        .prepare('SELECT id FROM weekly_reviews WHERE user_id = ? AND week_start = ?')
        .get(user.id, weekStart);

      if (!existing) {
        generateWeeklyReview(user.id, weekStart).catch((err) =>
          console.error(`[briefing] Weekly review failed for ${user.id}:`, err),
        );
      }
    }
    console.log(`[briefing] Weekly reviews queued for ${users.length} user(s), week of ${weekStart}`);
  } catch (err) {
    console.error('[briefing] Weekly review scheduler error:', err);
  }

  // Schedule next Sunday (0) at 8 PM
  setTimeout(() => { runWeeklyReviews(); }, msUntil(20, 0));
}

export function startBriefingScheduler(): void {
  // 45s startup delay to let DB migrations settle
  setTimeout(() => {
    runMorningBriefings();
    runWeeklyReviews();
  }, 45_000);

  console.log('[briefing] Briefing scheduler started (daily 7 AM + Sunday 8 PM)');
}
