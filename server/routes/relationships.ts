// ─── Relationships & People Hub Routes ───────────────────────────────────────
// Enhancement 19 — Propel Stack AI, LLC
//
// PRIVACY: All relationship data fully private.
// Interaction notes NEVER fed into AI context.
// Relationship Strength Score shown as label only (Warm/Active/Cooling/Distant).

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';

export const relationshipsRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cadenceDays(cadence: string, custom: number): number {
  if (cadence === 'weekly')    return 7;
  if (cadence === 'monthly')   return 30;
  if (cadence === 'quarterly') return 90;
  return custom || 30;
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Strength score — qualitative label only, never a raw number in any API response
function strengthLabel(lastContact: string | null | undefined, cadence: string, customDays: number): string {
  const days = daysSince(lastContact);
  const target = cadenceDays(cadence, customDays);
  if (days === Infinity) return 'Distant';
  const ratio = days / target;
  if (ratio <= 1.0)  return 'Warm';
  if (ratio <= 1.75) return 'Active';
  if (ratio <= 3.0)  return 'Cooling';
  return 'Distant';
}

// ─── AI helper ────────────────────────────────────────────────────────────────

async function callAI(system: string, userMsg: string, maxTokens = 400): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((c) => c.type === 'text')?.text ?? '';
}

// PRIVACY: Only contact names, relationship types, and cadence data sent to AI.
// Interaction notes are NEVER included.
const INSIGHTS_SYSTEM = `You are a warm, supportive relationship coach for Propel Stack AI.
Given a list of relationships with their check-in status, produce a brief (100-150 word) weekly relationship insight.

STRICT RULES:
- Refer to people by first name only (as given)
- NEVER speculate about why someone hasn't been contacted
- NEVER suggest purchasing gifts or products
- Be warm and encouraging, not guilt-inducing
- Focus on "who to reach out to this week" — keep it actionable

Format:
👥 This Week's Circle — 2-3 people to reconnect with, with a brief, human reason why
💡 One Moment — a quick, specific action someone could take today

Keep it short, warm, and human.`;

// ─── Contacts ─────────────────────────────────────────────────────────────────

// Attach strength label to every contact row before returning
function withStrength(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    strength: strengthLabel(
      row.last_contact as string | null,
      row.checkin_cadence as string,
      Number(row.cadence_days),
    ),
    days_since_contact: daysSince(row.last_contact as string | null),
    days_overdue: Math.max(
      0,
      daysSince(row.last_contact as string | null) - cadenceDays(row.checkin_cadence as string, Number(row.cadence_days)),
    ),
  };
}

relationshipsRouter.get('/contacts', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare('SELECT * FROM relationship_contacts WHERE user_id = ? ORDER BY name')
      .all(userId) as Record<string, unknown>[];
    res.json({ contacts: rows.map(withStrength) });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

relationshipsRouter.post('/contacts', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const {
      name, relationship = 'friend', birthday, anniversary,
      checkin_cadence = 'monthly', cadence_days: cd = 30,
      contact_method = 'text', photo_emoji = '👤', notes = '',
    } = req.body as Record<string, unknown>;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO relationship_contacts
        (id, user_id, name, relationship, birthday, anniversary, checkin_cadence, cadence_days, contact_method, photo_emoji, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, relationship, birthday || null, anniversary || null,
           checkin_cadence, Number(cd), contact_method, photo_emoji, notes);
    const row = await db.prepare('SELECT * FROM relationship_contacts WHERE id = ?').get(id) as Record<string, unknown>;
    res.json(withStrength(row));
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

relationshipsRouter.patch('/contacts/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const {
      name, relationship, birthday, anniversary, checkin_cadence,
      cadence_days: cd, contact_method, photo_emoji, notes, last_contact,
    } = req.body as Record<string, unknown>;
    await db.prepare(`
      UPDATE relationship_contacts SET
        name            = COALESCE(?, name),
        relationship    = COALESCE(?, relationship),
        birthday        = COALESCE(?, birthday),
        anniversary     = COALESCE(?, anniversary),
        checkin_cadence = COALESCE(?, checkin_cadence),
        cadence_days    = COALESCE(?, cadence_days),
        contact_method  = COALESCE(?, contact_method),
        photo_emoji     = COALESCE(?, photo_emoji),
        notes           = COALESCE(?, notes),
        last_contact    = COALESCE(?, last_contact)
      WHERE id = ? AND user_id = ?
    `).run(
      name ?? null, relationship ?? null, birthday ?? null, anniversary ?? null,
      checkin_cadence ?? null, cd !== undefined ? Number(cd) : null,
      contact_method ?? null, photo_emoji ?? null, notes ?? null, last_contact ?? null,
      req.params.id, userId,
    );
    const row = await db.prepare('SELECT * FROM relationship_contacts WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json(withStrength(row));
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

relationshipsRouter.delete('/contacts/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM relationship_contacts WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Interactions ─────────────────────────────────────────────────────────────

relationshipsRouter.get('/contacts/:id/interactions', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT * FROM relationship_interactions
      WHERE contact_id = ? AND user_id = ?
      ORDER BY occurred_on DESC LIMIT 20
    `).all(req.params.id, userId);
    res.json({ interactions: rows });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

relationshipsRouter.post('/contacts/:id/interactions', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { method = 'text', note = '', occurred_on } = req.body as Record<string, unknown>;
    const today = new Date().toISOString().slice(0, 10);
    const dateUsed = (occurred_on as string) || today;

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO relationship_interactions (id, user_id, contact_id, method, note, occurred_on)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, req.params.id, method, note, dateUsed);

    // Update last_contact on the contact itself
    await db.prepare(`
      UPDATE relationship_contacts SET last_contact = ?
      WHERE id = ? AND user_id = ? AND (last_contact IS NULL OR last_contact < ?)
    `).run(dateUsed, req.params.id, userId, dateUsed);

    res.json({ ok: true, id, method, occurred_on: dateUsed });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

relationshipsRouter.delete('/interactions/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM relationship_interactions WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Overdue check-ins ────────────────────────────────────────────────────────

relationshipsRouter.get('/overdue', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare('SELECT * FROM relationship_contacts WHERE user_id = ? ORDER BY name')
      .all(userId) as Record<string, unknown>[];

    const overdue = rows
      .map(withStrength)
      .filter((c) => Number(c.days_overdue) > 0)
      .sort((a, b) => Number(b.days_overdue) - Number(a.days_overdue));

    res.json({ overdue });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Upcoming birthdays & anniversaries ──────────────────────────────────────

relationshipsRouter.get('/upcoming', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare('SELECT id, name, birthday, anniversary, relationship FROM relationship_contacts WHERE user_id = ? AND (birthday IS NOT NULL OR anniversary IS NOT NULL)')
      .all(userId) as Record<string, unknown>[];

    const today = new Date();
    const upcoming: Array<Record<string, unknown>> = [];

    for (const c of rows) {
      for (const [field, label] of [['birthday', 'Birthday'], ['anniversary', 'Anniversary']] as const) {
        const raw = c[field] as string | null;
        if (!raw) continue;
        // Normalise to current-year date for comparison
        const parts = raw.split('-');
        const eventThisYear = new Date(today.getFullYear(), Number(parts[1]) - 1, Number(parts[2]));
        // If already passed this year, show next year
        if (eventThisYear < today) eventThisYear.setFullYear(today.getFullYear() + 1);
        const diffDays = Math.ceil((eventThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          upcoming.push({
            contact_id: c.id,
            name: c.name,
            relationship: c.relationship,
            event_type: label,
            event_date: raw,
            days_until: diffDays,
            date_this_year: eventThisYear.toISOString().slice(0, 10),
          });
        }
      }
    }

    upcoming.sort((a, b) => Number(a.days_until) - Number(b.days_until));
    res.json({ upcoming });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── AI Relationship Insights ─────────────────────────────────────────────────

relationshipsRouter.post('/insights', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare('SELECT name, relationship, checkin_cadence, cadence_days, last_contact FROM relationship_contacts WHERE user_id = ? ORDER BY last_contact ASC NULLS FIRST LIMIT 20')
      .all(userId) as Record<string, unknown>[];

    if (rows.length === 0) {
      return res.json({ insight: 'Add some people to your close circle to get personalised relationship insights each week.' });
    }

    // Build AI snapshot — names + cadence status ONLY (no notes, no private data)
    const snapshot = rows.map((c) => ({
      name: (c.name as string).split(' ')[0], // first name only
      relationship: c.relationship,
      days_since_contact: daysSince(c.last_contact as string | null),
      cadence_target_days: cadenceDays(c.checkin_cadence as string, Number(c.cadence_days)),
      strength: strengthLabel(c.last_contact as string | null, c.checkin_cadence as string, Number(c.cadence_days)),
    }));

    const insight = await callAI(INSIGHTS_SYSTEM, JSON.stringify(snapshot), 400);
    res.json({ insight });
  } catch (err) {
    console.error('[relationships/insights]', err);
    res.status(500).json({ error: String(err) });
  }
});
