/**
 * Data Processing Agreements (DPA) — Enhancement 36
 * Propel Stack AI, LLC
 *
 * GDPR/enterprise compliance: allows organizations and individual users
 * to view and accept the current Data Processing Agreement.
 * Acceptance is recorded with version, timestamp, and IP address.
 *
 * Endpoints:
 *   GET  /api/dpa/current        — current DPA version + text
 *   GET  /api/dpa/status         — has the current user accepted the current DPA?
 *   POST /api/dpa/accept         — record acceptance (current user)
 *   GET  /api/dpa/acceptances    — all acceptance records (admin only)
 *   GET  /api/dpa/org/:orgId     — check if an org has signed (admin only)
 */

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';

export const dpaRouter = Router();

// ─── Current DPA text ─────────────────────────────────────────────────────────

const CURRENT_DPA_VERSION = '1.0';
const CURRENT_DPA_EFFECTIVE = '2026-05-01';

const DPA_TEXT = `
# Propel Stack AI, LLC — Data Processing Agreement

**Version ${CURRENT_DPA_VERSION} | Effective ${CURRENT_DPA_EFFECTIVE}**

## 1. Introduction

This Data Processing Agreement ("DPA") forms part of the Terms of Service between
Propel Stack AI, LLC ("Processor") and the customer entity ("Controller") and sets
out the terms on which the Processor will process personal data on behalf of the Controller.

## 2. Definitions

- **Personal Data**: Any information relating to an identified or identifiable natural person.
- **Processing**: Any operation performed on personal data (collection, storage, use, disclosure, erasure).
- **Sub-processor**: Any third party engaged by the Processor to process Personal Data.

## 3. Scope of Processing

The Processor shall process Personal Data only:
a) on documented instructions from the Controller;
b) as required by applicable law;
c) for the purposes set out in the Service Agreement.

**Categories of data processed:** name, email address, health and wellness data (with consent),
financial goals data, behavioral patterns, AI interaction history.

**Data subjects:** End users of the Life OS application.

## 4. Security Measures

The Processor shall implement appropriate technical and organizational measures including:
- AES-256 encryption at rest; TLS 1.3 in transit
- Access controls and authentication (MFA required for admin access)
- Regular security audits and penetration testing
- Incident response plan with 72-hour breach notification
- Employee confidentiality obligations and security training

## 5. Sub-processors

Current authorized sub-processors:
- OpenAI, L.L.C. (AI inference — USA)
- Anthropic, PBC (AI inference — USA)
- Google LLC (AI inference, cloud infrastructure — USA)
- Railway Corp (infrastructure hosting — USA)
- Vercel Inc. (frontend hosting — USA)
- Stripe, Inc. (payment processing — USA)

The Processor will notify the Controller of any intended changes to sub-processors
at least 30 days in advance.

## 6. Data Subject Rights

The Processor shall assist the Controller in responding to data subject requests:
- Right of access
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to object to processing

## 7. Data Retention

Personal Data will be retained for the duration of the Service Agreement plus 90 days,
after which it will be permanently deleted or anonymized.

## 8. Data Transfers

Personal Data may be transferred to countries outside the EEA only where:
a) the European Commission has issued an adequacy decision; or
b) appropriate safeguards are in place (Standard Contractual Clauses).

## 9. Audit Rights

The Controller may audit the Processor's compliance upon 30 days written notice,
no more than once per calendar year.

## 10. Governing Law

This DPA is governed by the laws of the State of Delaware, United States,
without regard to conflict of law provisions.

---

*Propel Stack AI, LLC — DPA v${CURRENT_DPA_VERSION} — Confidential*
`.trim();

// ─── GET /api/dpa/current ─────────────────────────────────────────────────────

dpaRouter.get('/current', (_req: Request, res: Response) => {
  res.json({
    version: CURRENT_DPA_VERSION,
    effective_date: CURRENT_DPA_EFFECTIVE,
    text: DPA_TEXT,
  });
});

// ─── GET /api/dpa/status ──────────────────────────────────────────────────────

dpaRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();

    const row = await db
      .prepare(`
        SELECT id, dpa_version, accepted_at
        FROM dpa_acceptances
        WHERE user_id = $1 AND dpa_version = $2
        ORDER BY accepted_at DESC
        LIMIT 1
      `)
      .get(userId, CURRENT_DPA_VERSION) as { id: string; dpa_version: string; accepted_at: string } | undefined;

    res.json({
      accepted: !!row,
      current_version: CURRENT_DPA_VERSION,
      accepted_version: row?.dpa_version ?? null,
      accepted_at: row?.accepted_at ?? null,
    });
  } catch (err: unknown) {
    console.error('[dpa] status error:', err);
    res.status(500).json({ error: 'Failed to check DPA status' });
  }
});

// ─── POST /api/dpa/accept ─────────────────────────────────────────────────────

dpaRouter.post('/accept', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const orgId = (req.body as { org_id?: string })?.org_id ?? null;

    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim()
      ?? req.socket?.remoteAddress
      ?? null;

    const ua = req.headers['user-agent'] ?? null;

    // Idempotent — if already accepted this version, return existing record
    const existing = await db
      .prepare(`
        SELECT id, accepted_at FROM dpa_acceptances
        WHERE user_id = $1 AND dpa_version = $2
        ORDER BY accepted_at DESC LIMIT 1
      `)
      .get(userId, CURRENT_DPA_VERSION) as { id: string; accepted_at: string } | undefined;

    if (existing) {
      return res.json({
        ok: true,
        already_accepted: true,
        accepted_at: existing.accepted_at,
        version: CURRENT_DPA_VERSION,
      });
    }

    const id = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO dpa_acceptances (id, user_id, org_id, dpa_version, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
      `)
      .run(id, userId, orgId, CURRENT_DPA_VERSION, ip, ua);

    res.status(201).json({
      ok: true,
      already_accepted: false,
      id,
      version: CURRENT_DPA_VERSION,
      accepted_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[dpa] accept error:', err);
    res.status(500).json({ error: 'Failed to record DPA acceptance' });
  }
});

// ─── GET /api/dpa/acceptances — admin only ────────────────────────────────────

dpaRouter.get('/acceptances', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .prepare(`
        SELECT da.id, da.user_id, u.email, u.display_name, da.org_id,
               da.dpa_version, da.accepted_at, da.ip_address
        FROM dpa_acceptances da
        LEFT JOIN users u ON u.id = da.user_id
        ORDER BY da.accepted_at DESC
        LIMIT 200
      `)
      .all() as unknown[];

    res.json(rows);
  } catch (err: unknown) {
    console.error('[dpa] acceptances list error:', err);
    res.status(500).json({ error: 'Failed to list DPA acceptances' });
  }
});

// ─── GET /api/dpa/org/:orgId — admin only ────────────────────────────────────

dpaRouter.get('/org/:orgId', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params as { orgId: string };

    const row = await db
      .prepare(`
        SELECT id, dpa_version, accepted_at, user_id
        FROM dpa_acceptances
        WHERE org_id = $1
        ORDER BY accepted_at DESC
        LIMIT 1
      `)
      .get(orgId) as { id: string; dpa_version: string; accepted_at: string; user_id: string } | undefined;

    res.json({
      org_id: orgId,
      signed: !!row,
      current_version: CURRENT_DPA_VERSION,
      signed_version: row?.dpa_version ?? null,
      signed_at: row?.accepted_at ?? null,
      signed_by_user_id: row?.user_id ?? null,
    });
  } catch (err: unknown) {
    console.error('[dpa] org check error:', err);
    res.status(500).json({ error: 'Failed to check org DPA status' });
  }
});
