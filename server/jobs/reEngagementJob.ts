/**
 * Re-Engagement Flow — Propel Stack AI, LLC
 * Enhancement 11: 72-Hour Trigger
 *
 * Checks daily for users who haven't logged in for 72+ hours.
 * Sends a warm, non-shame re-engagement notification (not a push guilt trip).
 * Respects a 5-day cooldown between re-engagement messages per user.
 */
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';
import { isUserInNotNowMode } from '../routes/settings.js'; // Enhancement 17

const AWAY_THRESHOLD_HOURS = 72;
const COOLDOWN_DAYS = 5;

const RE_ENGAGEMENT_MESSAGES = [
  {
    title: "Your Life OS is ready when you are.",
    body: "No pressure — just here to help when you need it. Come back and pick up where you left off.",
  },
  {
    title: "Everything is exactly where you left it.",
    body: "Your goals haven't moved. Your streaks are still waiting. Whenever you're ready, we're here.",
  },
  {
    title: "Small steps count too.",
    body: "Even 5 minutes reviewing your goals moves the needle. Your future self will thank you.",
  },
  {
    title: "Life gets busy — we get it.",
    body: "When you're ready to reconnect with your goals, your Life OS is right here waiting.",
  },
  {
    title: "A quick check-in goes a long way.",
    body: "Consistent, small actions compound over time. Jump back in whenever feels right.",
  },
];

function randomMessage() {
  return RE_ENGAGEMENT_MESSAGES[Math.floor(Math.random() * RE_ENGAGEMENT_MESSAGES.length)];
}

async function checkReEngagement(): Promise<void> {
  try {
    const thresholdTime = new Date(Date.now() - AWAY_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();
    const cooldownTime = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Find users whose daily_login streak was last logged before threshold
    // and who haven't received a re-engagement notification within cooldown
    const candidates = await db
      .prepare(
        `SELECT u.id
         FROM users u
         LEFT JOIN streaks s ON s.user_id = u.id AND s.streak_type = 'daily_login'
         LEFT JOIN (
           SELECT user_id, MAX(sent_at) AS last_sent
           FROM notification_events
           WHERE notif_type = 're_engagement'
           GROUP BY user_id
         ) ne ON ne.user_id = u.id
         WHERE (s.last_logged IS NULL OR s.last_logged::TIMESTAMPTZ < ?)
           AND (ne.last_sent IS NULL OR ne.last_sent < ?)`,
      )
      .all(thresholdTime, cooldownTime) as { id: string }[];

    for (const user of candidates) {
      // Enhancement 17: Skip users in Not Now mode
      if (await isUserInNotNowMode(user.id)) continue;

      const msg = randomMessage();
      await db
        .prepare(
          `INSERT INTO notification_events
             (id, user_id, notif_type, trigger_key, title, body, hour_of_day, day_of_week)
           VALUES (?, ?, 're_engagement', 're_engagement', ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          user.id,
          msg.title,
          msg.body,
          new Date().getHours(),
          new Date().getDay(),
        );

      console.log(`[re-engagement] Notification queued for user ${user.id}: "${msg.title}"`);
    }

    if (candidates.length > 0) {
      console.log(`[re-engagement] Sent to ${candidates.length} user(s)`);
    }
  } catch (err) {
    console.error('[re-engagement] Scheduler error:', err);
  }
}

export function startReEngagementScheduler(): void {
  const INTERVAL_MS = 6 * 60 * 60 * 1000; // check every 6 hours

  // Start after 60s on server startup
  setTimeout(() => {
    checkReEngagement();
    setInterval(checkReEngagement, INTERVAL_MS);
  }, 60_000);

  console.log('[re-engagement] Scheduler started (6-hour check cadence, 72h trigger)');
}
