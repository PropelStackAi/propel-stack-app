/**
 * White-Label Advisor Platform — Enhancement 35
 * Propel Stack AI, LLC
 *
 * B2B2C channel: financial advisors / coaches / therapists deploy
 * under their own brand for their clients.
 *
 * CRITICAL SECURITY: advisor_clients.shared_hubs enforced strictly.
 * Advisors can ONLY see hub data explicitly shared by client.
 * advisor_notes are NEVER visible to client users.
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { audit } from '../lib/audit.js';

export const advisorPlatformRouter = Router();

// ── Advisor Firms ─────────────────────────────────────────────────────────────
advisorPlatformRouter.get('/firm', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const firm = await db.prepare(`SELECT * FROM advisor_firms WHERE owner_user_id = $1`).get(userId);
    res.json(firm ?? null);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

advisorPlatformRouter.post('/firm', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { firm_name, brand_logo_url, brand_primary_color, custom_domain } = req.body;
    if (!firm_name?.trim()) return res.status(400).json({ error: 'firm_name required' });

    // Check if firm already exists
    const existing = await db.prepare(`SELECT id FROM advisor_firms WHERE owner_user_id = $1`).get(userId);
    if (existing) return res.status(400).json({ error: 'You already have a firm. Update it instead.' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO advisor_firms (id, firm_name, owner_user_id, brand_logo_url, brand_primary_color, custom_domain)
      VALUES ($1, $2, $3, $4, $5, $6)
    `).run(id, firm_name.trim(), userId, brand_logo_url ?? null, brand_primary_color ?? '#4F35C2', custom_domain ?? null);
    res.status(201).json({ id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

advisorPlatformRouter.put('/firm', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { firm_name, brand_logo_url, brand_primary_color, custom_domain } = req.body;
    await db.prepare(`
      UPDATE advisor_firms SET
        firm_name = COALESCE($1, firm_name), brand_logo_url = COALESCE($2, brand_logo_url),
        brand_primary_color = COALESCE($3, brand_primary_color), custom_domain = COALESCE($4, custom_domain)
      WHERE owner_user_id = $5
    `).run(firm_name ?? null, brand_logo_url ?? null, brand_primary_color ?? null, custom_domain ?? null, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Client Roster ─────────────────────────────────────────────────────────────
advisorPlatformRouter.get('/clients', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const firm = await db.prepare(`SELECT id FROM advisor_firms WHERE owner_user_id = $1`).get(userId) as { id: string } | undefined;
    if (!firm) return res.status(404).json({ error: 'No advisor firm found. Create one first.' });

    const clients = await db.prepare(`
      SELECT ac.id, ac.shared_hubs, ac.linked_at,
             u.email, u.display_name, u.plan_tier
      FROM advisor_clients ac
      JOIN users u ON u.id = ac.client_user_id
      WHERE ac.firm_id = $1
      ORDER BY ac.linked_at DESC
    `).all(firm.id);

    await audit(userId, 'advisor.client_roster_viewed', 'advisor_clients', req, { firm_id: firm.id });
    res.json(clients ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Generate Client Invite Link ───────────────────────────────────────────────
advisorPlatformRouter.post('/invite', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const firm = await db.prepare(`SELECT id, firm_name FROM advisor_firms WHERE owner_user_id = $1`).get(userId) as any;
    if (!firm) return res.status(404).json({ error: 'No advisor firm found.' });

    // Generate a unique invite token (in production, store in DB with expiry)
    const token = randomUUID().replace(/-/g, '').slice(0, 16);
    const inviteUrl = `https://propel-stack-app.vercel.app/#/join?advisor=${firm.id}&token=${token}`;

    res.json({ invite_url: inviteUrl, firm_name: firm.firm_name, token });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Client Data Access (scoped to shared_hubs only) ───────────────────────────
advisorPlatformRouter.get('/clients/:clientId/summary', async (req, res) => {
  try {
    const advisorUserId = getCurrentUserId();
    const firm = await db.prepare(`SELECT id FROM advisor_firms WHERE owner_user_id = $1`).get(advisorUserId) as { id: string } | undefined;
    if (!firm) return res.status(403).json({ error: 'Not an advisor' });

    // Verify client is linked to this firm and get shared_hubs
    const link = await db.prepare(`
      SELECT shared_hubs FROM advisor_clients WHERE firm_id = $1 AND client_user_id = $2
    `).get(firm.id, req.params.clientId as string) as { shared_hubs: string[] | string } | undefined;

    if (!link) return res.status(403).json({ error: 'Client not linked to your firm' });

    const sharedHubs: string[] = typeof link.shared_hubs === 'string'
      ? JSON.parse(link.shared_hubs)
      : link.shared_hubs;

    const summary: Record<string, unknown> = { shared_hubs: sharedHubs };

    // Only pull data for explicitly shared hubs
    const clientId = req.params.clientId as string;

    if (sharedHubs.includes('goals')) {
      summary.goals = await db.prepare(`
        SELECT COUNT(*) FILTER (WHERE status='active') as active,
               COUNT(*) FILTER (WHERE status='completed') as completed
        FROM goals WHERE user_id = $1
      `).get(clientId);
    }

    if (sharedHubs.includes('streaks')) {
      summary.top_streak = await db.prepare(`
        SELECT streak_type, streak_count FROM streaks WHERE user_id = $1 ORDER BY streak_count DESC LIMIT 1
      `).get(clientId);
    }

    if (sharedHubs.includes('career')) {
      summary.license_alerts = await db.prepare(`
        SELECT COUNT(*) as expiring_soon FROM career_licenses
        WHERE user_id = $1 AND expiry_date::date <= CURRENT_DATE + INTERVAL '90 days' AND status = 'active'
      `).get(clientId);
    }

    await audit(advisorUserId, 'advisor.client_summary_viewed', clientId, req, { firm_id: firm.id, shared_hubs: sharedHubs });
    res.json(summary);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Add/Update Advisor Notes (never visible to client) ────────────────────────
advisorPlatformRouter.put('/clients/:clientId/notes', async (req, res) => {
  try {
    const advisorUserId = getCurrentUserId();
    const firm = await db.prepare(`SELECT id FROM advisor_firms WHERE owner_user_id = $1`).get(advisorUserId) as { id: string } | undefined;
    if (!firm) return res.status(403).json({ error: 'Not an advisor' });

    const { notes } = req.body;
    await db.prepare(`
      UPDATE advisor_clients SET advisor_notes = $1 WHERE firm_id = $2 AND client_user_id = $3
    `).run(notes ?? '', firm.id, req.params.clientId as string);

    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Client: Update Shared Hubs ────────────────────────────────────────────────
// Client calls this to control what their advisor can see
advisorPlatformRouter.put('/my-sharing', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { firm_id, shared_hubs } = req.body;
    if (!firm_id) return res.status(400).json({ error: 'firm_id required' });

    await db.prepare(`
      UPDATE advisor_clients SET shared_hubs = $1::jsonb WHERE firm_id = $2 AND client_user_id = $3
    `).run(JSON.stringify(shared_hubs ?? []), firm_id, userId);

    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
