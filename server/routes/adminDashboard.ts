/**
 * Admin Super Dashboard — Phase 4 Step 12
 * Propel Stack AI, LLC
 *
 * Internal operator visibility: users, revenue, AI cost, churn risk,
 * safety events, partner health, system health.
 *
 * ACCESS: In production this should require super_admin role.
 * For demo purposes getCurrentUserId() stub is used.
 */

import { Router } from 'express';
import { db } from '../db.js';

export const adminDashboardRouter = Router();

// ─── Overview — all KPI sections in one call ─────────────────────────────────

adminDashboardRouter.get('/overview', async (_req, res) => {
  try {
    // User stats
    const userStats = await db
      .prepare(`SELECT
        COUNT(*) AS total_users,
        COUNT(CASE WHEN plan_tier != 'spark' THEN 1 END) AS paying_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) AS new_this_month,
        COUNT(CASE WHEN last_active_at > NOW() - INTERVAL '7 days' THEN 1 END) AS active_7d,
        ROUND(AVG(churn_risk_score)::numeric, 1) AS avg_churn_risk
        FROM users`)
      .get();

    // High churn risk users
    const churnRiskUsers = await db
      .prepare(`SELECT id, email, display_name, plan_tier, churn_risk_score,
                last_active_at, created_at
                FROM users WHERE churn_risk_score > 50
                ORDER BY churn_risk_score DESC LIMIT 20`)
      .all();

    // Safety events (last 30 days)
    const safetyEvents = await db
      .prepare(`SELECT signal_type AS event_type, COUNT(*) AS count
                FROM churn_signals
                WHERE signal_type LIKE 'safety_%'
                  AND recorded_at > NOW() - INTERVAL '30 days'
                GROUP BY signal_type`)
      .all() as Record<string, unknown>[];

    // Recent NPS responses
    const npsStats = await db
      .prepare(`SELECT
        ROUND(AVG(score)::numeric, 2) AS avg_score,
        COUNT(*) AS total_responses,
        COUNT(CASE WHEN score >= 4 THEN 1 END) AS promoters,
        COUNT(CASE WHEN score <= 2 THEN 1 END) AS detractors
        FROM nps_responses WHERE created_at > NOW() - INTERVAL '30 days'`)
      .get();

    // Partner health
    const partners = await db
      .prepare(`SELECT id, name, slug, plan, sso_enabled, dpa_signed, created_at
                FROM white_label_partners ORDER BY created_at DESC LIMIT 20`)
      .all() as Record<string, unknown>[];

    // Webhook health
    const webhookStats = await db
      .prepare(`SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN is_active THEN 1 END) AS active,
        COUNT(CASE WHEN failure_count >= 5 THEN 1 END) AS disabled_by_failure
        FROM user_webhooks`)
      .get();

    // Cron job last run times (from audit log)
    const cronJobs = await db
      .prepare(`SELECT action AS job_name, MAX(created_at) AS last_run
                FROM admin_audit_log WHERE target_type = 'cron'
                GROUP BY action ORDER BY action`)
      .all() as Record<string, unknown>[];

    // Plan distribution
    const planDist = await db
      .prepare(`SELECT plan_tier, COUNT(*) AS user_count FROM users GROUP BY plan_tier`)
      .all();

    res.json({
      userStats,
      churnRiskUsers,
      safetyEvents,
      npsStats,
      partners,
      webhookStats,
      cronJobs,
      planDist,
    });
  } catch (err) {
    console.error('[admin] overview error', err);
    res.status(500).json({ error: 'Failed to load admin overview' });
  }
});

// ─── Trigger churn intervention ──────────────────────────────────────────────

adminDashboardRouter.post('/trigger-intervention/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db
      .prepare('SELECT id, email, churn_risk_score FROM users WHERE id = ?')
      .get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db
      .prepare('UPDATE users SET churn_intervention_sent_at = NOW() WHERE id = ?')
      .run(userId);

    // Log the intervention
    const { randomUUID } = await import('node:crypto');
    await db
      .prepare(`INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, metadata)
                VALUES (?, 'admin', 'churn_intervention', 'user', ?, ?)`)
      .run(randomUUID(), userId, JSON.stringify({ risk_score: (user as Record<string, unknown>).churn_risk_score }));

    res.json({ success: true, message: 'Intervention triggered' });
  } catch (err) {
    console.error('[admin] intervention error', err);
    res.status(500).json({ error: 'Failed to trigger intervention' });
  }
});

// ─── Churn risk table with filters ───────────────────────────────────────────

adminDashboardRouter.get('/churn-risk', async (req, res) => {
  try {
    const threshold = Number(req.query.threshold ?? 50);
    const users = await db
      .prepare(`SELECT id, email, display_name, plan_tier, churn_risk_score,
                last_active_at, created_at, churn_intervention_sent_at
                FROM users WHERE churn_risk_score >= ?
                ORDER BY churn_risk_score DESC LIMIT 100`)
      .all(threshold);
    res.json({ users });
  } catch (err) {
    console.error('[admin] churn risk error', err);
    res.status(500).json({ error: 'Failed to load churn risk' });
  }
});

// ─── NPS detail ──────────────────────────────────────────────────────────────

adminDashboardRouter.get('/nps', async (req, res) => {
  try {
    const recent = await db
      .prepare(`SELECT n.*, u.email, u.plan_tier
                FROM nps_responses n JOIN users u ON n.user_id = u.id
                ORDER BY n.created_at DESC LIMIT 50`)
      .all();
    res.json({ responses: recent });
  } catch (err) {
    console.error('[admin] nps error', err);
    res.status(500).json({ error: 'Failed to load NPS data' });
  }
});

// ─── Audit log ───────────────────────────────────────────────────────────────

adminDashboardRouter.get('/audit-log', async (_req, res) => {
  try {
    const logs = await db
      .prepare(`SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 100`)
      .all();
    res.json({ logs });
  } catch (err) {
    console.error('[admin] audit log error', err);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});
