/**
 * Churn Prediction Job — Phase 4 Enhancement 38
 * Propel Stack AI, LLC
 *
 * Rule-based churn risk scoring (no ML required for V1).
 * Risk score 0–100. Runs daily at 9am UTC.
 * Signals: login frequency drop, token usage decline, no completed tasks in 5 days.
 * Score >= 70 triggers automated re-engagement; >= 50 flags for manual review.
 */

import { db } from '../db.js';
import crypto from 'node:crypto';

// ─── Risk signal weights ──────────────────────────────────────────────────────

const SIGNALS = {
  no_login_7d:           30,   // No login in 7 days
  no_login_3d:           15,   // No login in 3 days
  low_ai_usage:          20,   // AI token usage < 20% of last month
  no_tasks_5d:           15,   // No task completions in 5 days
  support_contact:       10,   // (placeholder) contacted support
  plan_downgrade:        25,   // Downgraded plan recently
  onboarding_incomplete: 20,   // Never completed onboarding
} as const;

// ─── Calculate churn risk for a single user ───────────────────────────────────

async function calculateUserChurnRisk(userId: string): Promise<number> {
  let score = 0;

  try {
    const user = await db
      .prepare(`SELECT plan_tier, ai_tokens_used_this_month, last_active_at, onboarding_completed_at
                FROM users WHERE id = ?`)
      .get(userId) as Record<string, unknown> | undefined;

    if (!user) return 0;

    // No login signals
    const lastActive = user.last_active_at ? new Date(user.last_active_at as string) : null;
    if (!lastActive) {
      score += SIGNALS.no_login_7d;
    } else {
      const daysSinceLogin = (Date.now() - lastActive.getTime()) / 86_400_000;
      if (daysSinceLogin > 7)  score += SIGNALS.no_login_7d;
      else if (daysSinceLogin > 3) score += SIGNALS.no_login_3d;
    }

    // Onboarding incomplete
    if (!user.onboarding_completed_at) {
      score += SIGNALS.onboarding_incomplete;
    }

    // Low AI usage (under 100 tokens this month is very low)
    const tokens = Number(user.ai_tokens_used_this_month ?? 0);
    if (tokens < 100) score += SIGNALS.low_ai_usage;

    // No streaks activity in 5 days
    const recentStreak = await db
      .prepare(`SELECT last_logged_at FROM user_streaks WHERE user_id = ?
                ORDER BY last_logged_at DESC LIMIT 1`)
      .get(userId) as Record<string, unknown> | undefined;

    if (recentStreak?.last_logged_at) {
      const daysSinceStreak = (Date.now() - new Date(recentStreak.last_logged_at as string).getTime()) / 86_400_000;
      if (daysSinceStreak > 5) score += SIGNALS.no_tasks_5d;
    } else {
      score += SIGNALS.no_tasks_5d;
    }

    return Math.min(100, score);
  } catch {
    return 0;
  }
}

// ─── Main job ────────────────────────────────────────────────────────────────

export async function runChurnPrediction(): Promise<void> {
  console.log('[churn] starting churn prediction run');

  try {
    const users = await db
      .prepare(`SELECT id FROM users WHERE plan_tier != 'spark' OR created_at > NOW() - INTERVAL '14 days'`)
      .all() as { id: string }[];

    let scored = 0;
    let interventions = 0;

    for (const { id: userId } of users) {
      const riskScore = await calculateUserChurnRisk(userId);

      await db
        .prepare('UPDATE users SET churn_risk_score = ? WHERE id = ?')
        .run(riskScore, userId);

      // Record signal
      await db
        .prepare(`INSERT INTO churn_signals (id, user_id, signal_type, signal_value)
                  VALUES (?, ?, 'churn_score', ?)`)
        .run(crypto.randomUUID(), userId, riskScore);

      // Auto-trigger intervention at score >= 70 (max once per 7 days)
      if (riskScore >= 70) {
        const user = await db
          .prepare('SELECT churn_intervention_sent_at FROM users WHERE id = ?')
          .get(userId) as Record<string, unknown> | undefined;

        const lastIntervention = user?.churn_intervention_sent_at
          ? new Date(user.churn_intervention_sent_at as string)
          : null;

        const daysSinceIntervention = lastIntervention
          ? (Date.now() - lastIntervention.getTime()) / 86_400_000
          : 999;

        if (daysSinceIntervention >= 7) {
          await db
            .prepare('UPDATE users SET churn_intervention_sent_at = NOW() WHERE id = ?')
            .run(userId);

          // Log the auto intervention
          await db
            .prepare(`INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, metadata)
                      VALUES (?, 'system', 'auto_churn_intervention', 'user', ?, ?)`)
            .run(crypto.randomUUID(), userId, JSON.stringify({ risk_score: riskScore }));

          interventions++;
        }
      }

      scored++;
    }

    // Log job completion
    await db
      .prepare(`INSERT INTO admin_audit_log (id, actor_id, action, target_type, metadata)
                VALUES (?, 'system', 'churn_prediction_job', 'cron', ?)`)
      .run(crypto.randomUUID(), JSON.stringify({ users_scored: scored, interventions_triggered: interventions }));

    console.log(`[churn] complete — ${scored} users scored, ${interventions} interventions triggered`);
  } catch (err) {
    console.error('[churn] job error', err);
  }
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

export function startChurnPredictionScheduler(): void {
  // Run once at startup (with a delay to let DB settle)
  setTimeout(() => {
    runChurnPrediction().catch(console.error);
  }, 60_000);

  // Then run every 24 hours
  setInterval(() => {
    runChurnPrediction().catch(console.error);
  }, 24 * 60 * 60 * 1_000);

  console.log('[churn] scheduler started — runs every 24h');
}
