/**
 * Security & Compliance Router — Enhancement 41
 * Propel Stack AI, LLC
 *
 * Endpoints:
 *   GET  /api/security/privacy-settings    — get user's AI data-sharing preferences
 *   PUT  /api/security/privacy-settings    — update preferences (audit logged)
 *   GET  /api/security/audit-log           — last 50 audit events for current user
 *   POST /api/security/logout              — revoke current JWT (token_revocations)
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db, getCurrentUserId } from '../db.js';
import { audit, AUDIT } from '../lib/audit.js';

export const securityRouter = Router();

// ── GET /api/security/privacy-settings ──────────────────────────────────────
securityRouter.get('/privacy-settings', async (req, res) => {
  try {
    const userId = getCurrentUserId();

    // Upsert default row if missing
    await db.prepare(`
      INSERT INTO user_privacy_settings (id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO NOTHING
    `).run(randomUUID(), userId);

    const row = await db.prepare(`
      SELECT send_health_to_ai, send_finance_to_ai, send_mood_to_ai,
             send_relationships_to_ai, send_goals_to_ai, updated_at
      FROM user_privacy_settings
      WHERE user_id = $1
    `).get(userId);

    res.json(row ?? {});
  } catch (err: any) {
    console.error('[security] privacy-settings GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/security/privacy-settings ──────────────────────────────────────
securityRouter.put('/privacy-settings', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const {
      send_health_to_ai,
      send_finance_to_ai,
      send_mood_to_ai,
      send_relationships_to_ai,
      send_goals_to_ai,
    } = req.body as Record<string, boolean>;

    // Ensure row exists first
    await db.prepare(`
      INSERT INTO user_privacy_settings (id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO NOTHING
    `).run(randomUUID(), userId);

    await db.prepare(`
      UPDATE user_privacy_settings
      SET send_health_to_ai       = $1,
          send_finance_to_ai      = $2,
          send_mood_to_ai         = $3,
          send_relationships_to_ai = $4,
          send_goals_to_ai        = $5,
          updated_at              = NOW()
      WHERE user_id = $6
    `).run(
      send_health_to_ai       ?? true,
      send_finance_to_ai      ?? true,
      send_mood_to_ai         ?? true,
      send_relationships_to_ai ?? true,
      send_goals_to_ai        ?? true,
      userId,
    );

    await audit(userId, AUDIT.PRIVACY_SETTINGS_UPDATED, 'user_privacy_settings', req, {
      send_health_to_ai, send_finance_to_ai, send_mood_to_ai,
      send_relationships_to_ai, send_goals_to_ai,
    });

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[security] privacy-settings PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/security/audit-log ─────────────────────────────────────────────
securityRouter.get('/audit-log', async (_req, res) => {
  try {
    const userId = getCurrentUserId();

    const rows = await db.prepare(`
      SELECT id, action, resource, ip_address, user_agent, metadata, created_at
      FROM audit_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId);

    res.json(rows ?? []);
  } catch (err: any) {
    console.error('[security] audit-log GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/security/logout ────────────────────────────────────────────────
// Revokes the current JWT by inserting its jti into token_revocations.
// The client must clear any in-memory token reference after calling this.
securityRouter.post('/logout', async (req, res) => {
  try {
    const userId = getCurrentUserId();

    // Extract jti from Authorization header if present (best-effort)
    const authHeader = req.headers['authorization'];
    let jti: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(
          Buffer.from(authHeader.slice(7).split('.')[1], 'base64').toString('utf8'),
        );
        jti = payload?.jti ?? null;
      } catch {
        // Malformed JWT — still allow logout
      }
    }

    // If we have a jti, revoke the token
    if (jti) {
      await db.prepare(`
        INSERT INTO token_revocations (id, user_id, token_jti)
        VALUES ($1, $2, $3)
        ON CONFLICT (token_jti) DO NOTHING
      `).run(randomUUID(), userId, jti);
    }

    await audit(userId, AUDIT.LOGOUT, 'session', req, { jti: jti ?? 'unknown' });

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[security] logout error:', err);
    res.status(500).json({ error: err.message });
  }
});
