/**
 * Network Hub — Professional Contacts, Wins, AI Reconnect Coach
 * Propel Stack AI, LLC
 */
import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { complete } from '../ai-gateway.js';
import { scrubPII } from '../middleware/piiScrubber.js';

export const networkHubRouter = Router();

function newId() { return crypto.randomUUID(); }

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Days between two ISO date strings (a - b in days). Negative means b is future. */
function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.floor(ms / 86_400_000);
}

// ---- Contacts ----

// GET /api/network/contacts — all contacts with days_since_contact
networkHubRouter.get('/contacts', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT * FROM network_contacts WHERE user_id = $1 ORDER BY name ASC
    `).all(userId) as any[];
    const enriched = rows.map((r) => ({
      ...r,
      days_since_contact: daysSince(r.last_contact_date),
    }));
    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST /api/network/contacts — create contact
networkHubRouter.post('/contacts', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { name, company, role, email, phone, relationship_type, last_contact_date, follow_up_date } = req.body as {
      name: string;
      company?: string;
      role?: string;
      email?: string;
      phone?: string;
      relationship_type?: string;
      last_contact_date?: string;
      follow_up_date?: string;
    };
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const id = newId();
    await db.prepare(`
      INSERT INTO network_contacts
        (id, user_id, name, company, role, email, phone, relationship_type, last_contact_date, follow_up_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `).run(
      id, userId, name.trim(),
      company ?? null, role ?? null, email ?? null, phone ?? null,
      relationship_type ?? 'contact',
      last_contact_date ?? null, follow_up_date ?? null
    );
    res.status(201).json({ id });
  } catch {
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PUT /api/network/contacts/:id — update contact
networkHubRouter.put('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { name, company, role, email, phone, relationship_type, last_contact_date, follow_up_date } = req.body as {
      name?: string;
      company?: string;
      role?: string;
      email?: string;
      phone?: string;
      relationship_type?: string;
      last_contact_date?: string;
      follow_up_date?: string;
    };
    await db.prepare(`
      UPDATE network_contacts SET
        name = COALESCE($1, name),
        company = COALESCE($2, company),
        role = COALESCE($3, role),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        relationship_type = COALESCE($6, relationship_type),
        last_contact_date = COALESCE($7, last_contact_date),
        follow_up_date = COALESCE($8, follow_up_date)
      WHERE id = $9 AND user_id = $10
    `).run(
      name ?? null, company ?? null, role ?? null,
      email ?? null, phone ?? null, relationship_type ?? null,
      last_contact_date ?? null, follow_up_date ?? null,
      req.params.id, userId
    );
    res.json({ id: req.params.id });
  } catch {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/network/contacts/:id
networkHubRouter.delete('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM network_contacts WHERE id = $1 AND user_id = $2').run(req.params.id, userId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// POST /api/network/contacts/:id/touch — set last_contact_date to today
networkHubRouter.post('/contacts/:id/touch', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const today = todayISO();
    await db.prepare(`
      UPDATE network_contacts SET last_contact_date = $1 WHERE id = $2 AND user_id = $3
    `).run(today, req.params.id, userId);
    res.json({ id: req.params.id, last_contact_date: today });
  } catch {
    res.status(500).json({ error: 'Failed to update last contact date' });
  }
});

// ---- Follow-up Queue ----

// GET /api/network/follow-up-queue — contacts needing attention
networkHubRouter.get('/follow-up-queue', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const today = todayISO();
    const rows = await db.prepare(`
      SELECT * FROM network_contacts
      WHERE user_id = $1
        AND (
          follow_up_date <= $2
          OR last_contact_date IS NULL
          OR last_contact_date <= (CURRENT_DATE - INTERVAL '90 days')::DATE
        )
      ORDER BY last_contact_date ASC NULLS FIRST
    `).all(userId, today) as any[];
    const enriched = rows.map((r) => ({
      ...r,
      days_since_contact: daysSince(r.last_contact_date),
    }));
    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Failed to fetch follow-up queue' });
  }
});

// ---- Wins ----

// GET /api/network/wins — list wins with contact name
networkHubRouter.get('/wins', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT nw.*, nc.name AS contact_name
      FROM network_wins nw
      LEFT JOIN network_contacts nc ON nc.id = nw.contact_id
      WHERE nw.user_id = $1
      ORDER BY nw.created_at DESC
    `).all(userId);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch network wins' });
  }
});

// POST /api/network/wins — create win
networkHubRouter.post('/wins', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { title, description, contact_id } = req.body as {
      title: string;
      description?: string;
      contact_id?: string;
    };
    if (!title?.trim()) return res.status(400).json({ error: 'title required' });
    const id = newId();
    await db.prepare(`
      INSERT INTO network_wins (id, user_id, contact_id, title, description)
      VALUES ($1, $2, $3, $4, $5)
    `).run(id, userId, contact_id ?? null, title.trim(), description ?? null);
    res.status(201).json({ id });
  } catch {
    res.status(500).json({ error: 'Failed to create network win' });
  }
});

// ---- AI Coach ----

// POST /api/network/ai-coach — who should I reconnect with this week?
networkHubRouter.post('/ai-coach', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    // Fetch contacts sorted by longest gap first
    const contacts = await db.prepare(`
      SELECT name, company, role, last_contact_date
      FROM network_contacts
      WHERE user_id = $1
      ORDER BY last_contact_date ASC NULLS FIRST
      LIMIT 20
    `).all(userId) as any[];

    if (contacts.length === 0) {
      return res.json({ suggestions: [] });
    }

    const contactSummary = contacts.map((c) => {
      const days = daysSince(c.last_contact_date);
      return `- ${c.name}${c.company ? ` (${c.company})` : ''}${c.role ? `, ${c.role}` : ''}: last contact ${days !== null ? `${days} days ago` : 'never'}`;
    }).join('\n');

    const prompt = scrubPII(
      `You are a professional networking coach. Based on this person's contact list, recommend 3-5 people they should reconnect with this week.\n\n` +
      `Contact list (sorted by longest gap since last contact):\n${contactSummary}\n\n` +
      `Return a JSON array only (no markdown, no extra text) with each suggestion as: ` +
      `{"name":"...", "company":"...", "days_since":<number or null>, "reason":"1-2 sentence reconnect reason"}`
    );

    const result = complete({ prompt, mode: 'general' });
    let suggestions: Array<{ name: string; company: string; days_since: number | null; reason: string }> = [];

    try {
      const text = result.text?.trim() ?? '';
      const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      suggestions = JSON.parse(jsonText);
      if (!Array.isArray(suggestions)) suggestions = [];
    } catch {
      suggestions = [];
    }

    res.json({ suggestions });
  } catch {
    res.status(500).json({ error: 'Failed to generate AI coaching suggestions' });
  }
});
