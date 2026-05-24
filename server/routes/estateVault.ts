/**
 * Estate & Legacy Vault — Enhancement 30
 * Propel Stack AI, LLC
 *
 * DISCLAIMER GATE: PSAI-EST-DISC-v1.0 must be acknowledged before any vault access.
 * This is an organizational tool ONLY — not legal advice.
 *
 * All vault content stored AES-256 encrypted (content_enc).
 * credential_enc NEVER decrypted server-side.
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { audit, AUDIT } from '../lib/audit.js';

export const estateVaultRouter = Router();

const DISCLAIMER_VERSION = 'PSAI-EST-DISC-v1.0';

// ── Disclaimer check middleware ───────────────────────────────────────────────
async function requireDisclaimer(userId: string): Promise<boolean> {
  const ack = await db.prepare(`
    SELECT id FROM estate_disclaimer_acks WHERE user_id = $1 AND version = $2
  `).get(userId, DISCLAIMER_VERSION);
  return !!ack;
}

// ── GET /api/estate-vault/disclaimer ─────────────────────────────────────────
estateVaultRouter.get('/disclaimer', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const ack = await db.prepare(`
      SELECT version, acknowledged_at FROM estate_disclaimer_acks WHERE user_id = $1
    `).get(userId);
    res.json({ acknowledged: !!ack, version: DISCLAIMER_VERSION, ...(ack ?? {}) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/estate-vault/disclaimer ────────────────────────────────────────
estateVaultRouter.post('/disclaimer', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`
      INSERT INTO estate_disclaimer_acks (id, user_id, version)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET version = $3, acknowledged_at = NOW()
    `).run(randomUUID(), userId, DISCLAIMER_VERSION);
    await audit(userId, AUDIT.ESTATE_VAULT_ACCESSED, 'disclaimer', req, { version: DISCLAIMER_VERSION });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/estate-vault/sections ───────────────────────────────────────────
estateVaultRouter.get('/sections', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    if (!await requireDisclaimer(userId)) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const rows = await db.prepare(`
      SELECT id, section, title, last_updated, created_at
      FROM estate_vault
      WHERE user_id = $1
      ORDER BY section, last_updated DESC
    `).all(userId);

    await audit(userId, AUDIT.ESTATE_VAULT_ACCESSED, 'sections', req);
    res.json(rows ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/estate-vault/sections/:section ───────────────────────────────────
// Returns encrypted content_enc — client decrypts with session-derived key
estateVaultRouter.get('/sections/:section', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    if (!await requireDisclaimer(userId)) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const rows = await db.prepare(`
      SELECT id, section, title, content_enc, last_updated, created_at
      FROM estate_vault
      WHERE user_id = $1 AND section = $2
      ORDER BY last_updated DESC
    `).all(userId, req.params.section as string);

    await audit(userId, AUDIT.ESTATE_VAULT_ACCESSED, req.params.section as string, req);
    res.json(rows ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/estate-vault/sections/:section ─────────────────────────────────
estateVaultRouter.post('/sections/:section', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    if (!await requireDisclaimer(userId)) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const { title, content_enc } = req.body;
    const validSections = ['digital_assets', 'beneficiaries', 'letter', 'funeral', 'passwords', 'documents'];
    const section = req.params.section as string;

    if (!validSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO estate_vault (id, user_id, section, title, content_enc)
      VALUES ($1, $2, $3, $4, $5)
    `).run(id, userId, section, title ?? '', content_enc ?? null);

    await audit(userId, AUDIT.ESTATE_VAULT_ACCESSED, section, req, { action: 'entry_created' });
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/estate-vault/sections/:section/:id ───────────────────────────────
estateVaultRouter.put('/sections/:section/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    if (!await requireDisclaimer(userId)) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const { title, content_enc } = req.body;
    await db.prepare(`
      UPDATE estate_vault
      SET title = COALESCE($1, title), content_enc = COALESCE($2, content_enc), last_updated = NOW()
      WHERE id = $3 AND user_id = $4 AND section = $5
    `).run(title ?? null, content_enc ?? null, req.params.id as string, userId, req.params.section as string);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/estate-vault/sections/:section/:id ────────────────────────────
estateVaultRouter.delete('/sections/:section/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`
      DELETE FROM estate_vault WHERE id = $1 AND user_id = $2 AND section = $3
    `).run(req.params.id as string, userId, req.params.section as string);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/estate-vault/delegates ──────────────────────────────────────────
estateVaultRouter.get('/delegates', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    if (!await requireDisclaimer(userId)) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const rows = await db.prepare(`
      SELECT id, delegate_name, delegate_email, relationship, access_level, is_verified, created_at
      FROM trusted_access_delegates
      WHERE user_id = $1
      ORDER BY created_at DESC
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/estate-vault/delegates ─────────────────────────────────────────
estateVaultRouter.post('/delegates', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    if (!await requireDisclaimer(userId)) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    // Max 2 trusted delegates
    const count = await db.prepare(`SELECT COUNT(*) as cnt FROM trusted_access_delegates WHERE user_id = $1`)
      .get(userId) as { cnt: number };
    if ((count?.cnt ?? 0) >= 2) {
      return res.status(400).json({ error: 'Maximum 2 trusted delegates allowed' });
    }

    const { delegate_name, delegate_email, relationship, access_level } = req.body;
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO trusted_access_delegates (id, user_id, delegate_name, delegate_email, relationship, access_level)
      VALUES ($1, $2, $3, $4, $5, $6)
    `).run(id, userId, delegate_name ?? '', delegate_email ?? '', relationship ?? '', access_level ?? 'full');

    res.status(201).json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/estate-vault/delegates/:id ────────────────────────────────────
estateVaultRouter.delete('/delegates/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`DELETE FROM trusted_access_delegates WHERE id = $1 AND user_id = $2`)
      .run(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
