/**
 * Push Notifications Service — Phase 3 Step 8
 * Propel Stack AI, LLC
 *
 * Firebase Admin (FCM) + APNs push notification sender.
 * Used by morning briefing, re-engagement, predictive task, and burnout jobs.
 *
 * ACTIVATION CHECKLIST (set in Railway env vars):
 *   FIREBASE_PROJECT_ID      — Firebase Console → Project Settings
 *   FIREBASE_CLIENT_EMAIL    — Service account email
 *   FIREBASE_PRIVATE_KEY     — Service account private key (escape \n as \\n)
 *   APNS_CERT                — Base64-encoded .p8 key (Apple Developer)
 *   APNS_BUNDLE_ID           — com.propelstackai.app
 *   APNS_ENV                 — 'sandbox' (TestFlight) | 'production' (App Store)
 *
 * Until these vars are set, all send*() calls log a warning and return gracefully.
 */

import { db } from '../db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  /** Deep-link route within the app (e.g. '/briefing', '/chat') */
  route?: string;
  /** Optional badge count for iOS */
  badge?: number;
  data?: Record<string, string>;
}

interface PushToken {
  id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
}

// ─── Firebase Admin initializer ───────────────────────────────────────────────

let firebaseApp: unknown = null;
let adminMessaging: unknown = null;

function getFirebaseAdmin(): { messaging: () => unknown } | null {
  if (adminMessaging) return adminMessaging as { messaging: () => unknown };

  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null; // Not configured yet
  }

  try {
    // Dynamic import so the module can load without firebase-admin installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin') as {
      apps: unknown[];
      initializeApp: (opts: unknown) => unknown;
      credential: { cert: (opts: unknown) => unknown };
      messaging: () => unknown;
    };

    if (!admin.apps.length) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    adminMessaging = admin;
    return admin;
  } catch (err) {
    console.warn('[push] firebase-admin not installed or failed to init:', err);
    return null;
  }
}

// ─── Token management ─────────────────────────────────────────────────────────

/**
 * Register or refresh a push token for a user.
 * Called from the mobile app on every launch.
 */
export async function registerToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
): Promise<void> {
  db.prepare(`
    INSERT INTO push_tokens (id, user_id, token, platform, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform, updated_at = excluded.updated_at
  `).run(crypto.randomUUID(), userId, token, platform);
}

/**
 * Remove an invalid/revoked token.
 */
export async function removeToken(token: string): Promise<void> {
  db.prepare('DELETE FROM push_tokens WHERE token = ?').run(token);
}

/**
 * Get all valid push tokens for a user.
 */
export function getTokens(userId: string): PushToken[] {
  return db
    .prepare('SELECT id, token, platform FROM push_tokens WHERE user_id = ?')
    .all(userId) as unknown as PushToken[];
}

// ─── Send functions ───────────────────────────────────────────────────────────

/**
 * Send a push notification to all devices registered for a user.
 * Returns number of tokens successfully sent to.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  const tokens = getTokens(userId);
  if (!tokens.length) return 0;

  const admin = getFirebaseAdmin();
  if (!admin) {
    console.warn(`[push] Firebase not configured — skipping push for user ${userId}: "${payload.title}"`);
    return 0;
  }

  const messaging = admin.messaging() as {
    send: (msg: unknown) => Promise<string>;
  };

  let sent = 0;
  const staleTokens: string[] = [];

  for (const { token, platform } of tokens) {
    try {
      const msg = {
        token,
        notification: { title: payload.title, body: payload.body },
        data: {
          route: payload.route ?? '/',
          ...payload.data,
        },
        ...(platform === 'ios' ? {
          apns: {
            payload: {
              aps: {
                badge: payload.badge ?? 1,
                sound: 'default',
                'content-available': 1,
              },
            },
          },
        } : {}),
        android: {
          priority: 'high' as const,
          notification: {
            icon: 'ic_notification',
            color: '#4F35C2',
            channelId: 'propel_default',
          },
        },
      };

      await messaging.send(msg);
      sent++;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        staleTokens.push(token);
      } else {
        console.error(`[push] Failed to send to token ${token.slice(0, 10)}…:`, code ?? err);
      }
    }
  }

  // Clean up stale tokens
  for (const t of staleTokens) {
    await removeToken(t);
  }

  return sent;
}

/**
 * Send a morning briefing push notification.
 */
export async function sendMorningBriefingPush(userId: string, preview: string): Promise<void> {
  await sendToUser(userId, {
    title: '☀️ Your Morning Briefing is ready',
    body: preview.slice(0, 140),
    route: '/briefing',
    badge: 1,
    data: { type: 'morning_briefing' },
  });
}

/**
 * Send a re-engagement push after 72h inactivity.
 */
export async function sendReEngagementPush(userId: string): Promise<void> {
  await sendToUser(userId, {
    title: 'Life OS misses you 👋',
    body: 'Your life doesn\'t pause — check in on your goals and see what\'s waiting.',
    route: '/dashboard',
    data: { type: 're_engagement' },
  });
}

/**
 * Send a predictive task notification.
 */
export async function sendPredictiveTaskPush(userId: string, task: string, reason: string): Promise<void> {
  await sendToUser(userId, {
    title: '💡 Suggested focus for right now',
    body: `${task} — ${reason}`.slice(0, 140),
    route: '/goals',
    data: { type: 'predictive_task', task },
  });
}

/**
 * Send a gentle burnout intervention push.
 */
export async function sendBurnoutInterventionPush(userId: string, message: string): Promise<void> {
  await sendToUser(userId, {
    title: '🌱 A gentle check-in',
    body: message.slice(0, 140),
    route: '/burnout',
    data: { type: 'burnout_intervention' },
  });
}
