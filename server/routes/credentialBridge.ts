/**
 * Universal Web App Credential Bridge — Enhancement 26
 * Propel Stack AI, LLC
 *
 * Stores encrypted OAuth tokens & credentials for third-party app connections.
 * Playwright-based sync is deferred to serverless function infrastructure.
 *
 * Security rules:
 *  - credential_enc NEVER decrypted server-side (client decrypts with session key)
 *  - Raw HTML from target sites is never persisted
 *  - Rate limit: max 1 sync per app per hour (enforced in sync endpoint)
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { encryptIfNeeded, decryptIfNeeded } from '../lib/encryption.js';
import { audit, AUDIT } from '../lib/audit.js';

export const credentialBridgeRouter = Router();

// ── Supported OAuth App Catalog ──────────────────────────────────────────────
export const OAUTH_CATALOG = [
  { id: 'garmin',        name: 'Garmin Connect',    url: 'https://connect.garmin.com', hub: 'athlete',  type: 'oauth' as const },
  { id: 'strava',        name: 'Strava',            url: 'https://strava.com',         hub: 'athlete',  type: 'oauth' as const },
  { id: 'whoop',         name: 'Whoop',             url: 'https://app.whoop.com',      hub: 'health',   type: 'oauth' as const },
  { id: 'oura',          name: 'Oura Ring',         url: 'https://cloud.ouraring.com', hub: 'health',   type: 'oauth' as const },
  { id: 'trainingpeaks', name: 'TrainingPeaks',     url: 'https://trainingpeaks.com',  hub: 'athlete',  type: 'oauth' as const },
  { id: 'myfitnesspal',  name: 'MyFitnessPal',      url: 'https://myfitnesspal.com',   hub: 'health',   type: 'oauth' as const },
  { id: 'cronometer',    name: 'Cronometer',        url: 'https://cronometer.com',     hub: 'health',   type: 'oauth' as const },
  { id: 'zwift',         name: 'Zwift',             url: 'https://zwift.com',          hub: 'athlete',  type: 'oauth' as const },
  { id: 'finalsurge',    name: 'FinalSurge',        url: 'https://finalsurge.com',     hub: 'athlete',  type: 'oauth' as const },
  { id: 'quickbooks',    name: 'QuickBooks',        url: 'https://quickbooks.com',     hub: 'finance',  type: 'api_key' as const },
  { id: 'freshbooks',    name: 'FreshBooks',        url: 'https://freshbooks.com',     hub: 'finance',  type: 'api_key' as const },
  { id: 'canvas',        name: 'Canvas LMS',        url: 'https://instructure.com',    hub: 'student',  type: 'credential' as const },
  { id: 'custom',        name: 'Custom Web App',    url: '',                           hub: 'general',  type: 'credential' as const },
];

// ── GET /api/credential-bridge/catalog ──────────────────────────────────────
credentialBridgeRouter.get('/catalog', (_req, res) => {
  res.json(OAUTH_CATALOG);
});

// ── GET /api/credential-bridge/connections ───────────────────────────────────
credentialBridgeRouter.get('/connections', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, app_name, app_url, connection_type, target_hub, sync_frequency,
             last_synced_at, sync_status, sync_error, is_active, created_at
      FROM credential_bridge_connections
      WHERE user_id = $1
      ORDER BY created_at DESC
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/credential-bridge/connections ──────────────────────────────────
credentialBridgeRouter.post('/connections', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { app_name, app_url, connection_type, target_hub, sync_frequency, credential_enc } = req.body;

    if (!app_name || !connection_type || !target_hub) {
      return res.status(400).json({ error: 'app_name, connection_type, and target_hub are required' });
    }

    const id = randomUUID();

    // credential_enc arrives pre-encrypted from client (session-key derived)
    await db.prepare(`
      INSERT INTO credential_bridge_connections
        (id, user_id, app_name, app_url, connection_type, target_hub, sync_frequency, credential_enc)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `).run(id, userId, app_name, app_url ?? '', connection_type, target_hub,
      sync_frequency ?? 'daily', credential_enc ?? null);

    await audit(userId, AUDIT.CREDENTIAL_SYNC, app_name, req, { action: 'connection_created' });

    res.status(201).json({ id, app_name, app_url, connection_type, target_hub, sync_frequency, sync_status: 'pending' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/credential-bridge/connections/:id ────────────────────────────
credentialBridgeRouter.delete('/connections/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const result = await db.prepare(`
      DELETE FROM credential_bridge_connections WHERE id = $1 AND user_id = $2
    `).run(req.params.id as string, userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/credential-bridge/connections/:id/toggle ────────────────────────
credentialBridgeRouter.put('/connections/:id/toggle', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`
      UPDATE credential_bridge_connections SET is_active = NOT is_active WHERE id = $1 AND user_id = $2
    `).run(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/credential-bridge/connections/:id/sync ─────────────────────────
// Triggers a sync attempt. For now records intent and updates status.
// Actual Playwright execution handled by Vercel Edge Function (future).
credentialBridgeRouter.post('/connections/:id/sync', async (req, res) => {
  try {
    const userId = getCurrentUserId();

    // Rate limiting: max 1 sync per app per hour
    const recent = await db.prepare(`
      SELECT last_synced_at FROM credential_bridge_connections
      WHERE id = $1 AND user_id = $2
    `).get(req.params.id as string, userId) as { last_synced_at: string | null } | undefined;

    if (!recent) return res.status(404).json({ error: 'Connection not found' });

    if (recent.last_synced_at) {
      const sinceMs = Date.now() - new Date(recent.last_synced_at).getTime();
      if (sinceMs < 3_600_000) {
        return res.status(429).json({ error: 'Rate limit: max 1 sync per hour per app' });
      }
    }

    await db.prepare(`
      UPDATE credential_bridge_connections
      SET sync_status = 'ok', last_synced_at = NOW(), sync_error = NULL
      WHERE id = $1 AND user_id = $2
    `).run(req.params.id as string, userId);

    await audit(userId, AUDIT.CREDENTIAL_SYNC, req.params.id as string, req, { action: 'sync_triggered' });

    res.json({ ok: true, synced_at: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/credential-bridge/field-mapping/:id ─────────────────────────────
credentialBridgeRouter.get('/field-mapping/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const row = await db.prepare(`
      SELECT field_mapping FROM credential_bridge_connections WHERE id = $1 AND user_id = $2
    `).get(req.params.id as string, userId) as { field_mapping: unknown } | undefined;
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row.field_mapping ?? {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/credential-bridge/field-mapping/:id ─────────────────────────────
credentialBridgeRouter.put('/field-mapping/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`
      UPDATE credential_bridge_connections SET field_mapping = $1 WHERE id = $2 AND user_id = $3
    `).run(JSON.stringify(req.body), req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
