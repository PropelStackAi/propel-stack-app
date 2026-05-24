/**
 * Life Timeline & Memory Archive — Enhancement 29
 * Propel Stack AI, LLC
 *
 * Private scrollable timeline of life moments.
 * On This Day: surfaces memories from exactly N years ago.
 * Monthly AI memory summary + Year in Review.
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';

export const timelineRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ── GET /api/timeline/memories ────────────────────────────────────────────────
timelineRouter.get('/memories', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { hub_source, memory_type, year, limit = '50', offset = '0' } = req.query as Record<string, string>;

    const conditions: string[] = ['user_id = $1'];
    const params: unknown[] = [userId];
    let pIdx = 2;

    if (hub_source) { conditions.push(`hub_source = $${pIdx++}`); params.push(hub_source); }
    if (memory_type) { conditions.push(`memory_type = $${pIdx++}`); params.push(memory_type); }
    if (year) {
      conditions.push(`EXTRACT(YEAR FROM occurred_on) = $${pIdx++}`);
      params.push(Number(year));
    }

    params.push(Number(limit), Number(offset));

    const rows = await db.prepare(`
      SELECT id, occurred_on, title, body, hub_source, memory_type, photo_url,
             is_shared, is_private, created_at
      FROM timeline_memories
      WHERE ${conditions.join(' AND ')}
      ORDER BY occurred_on DESC
      LIMIT $${pIdx++} OFFSET $${pIdx}
    `).all(...params);

    res.json(rows ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/timeline/memories ───────────────────────────────────────────────
timelineRouter.post('/memories', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { occurred_on, title, body, hub_source, memory_type, photo_url, is_private } = req.body;

    if (!occurred_on || !title?.trim()) {
      return res.status(400).json({ error: 'occurred_on and title are required' });
    }

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO timeline_memories (id, user_id, occurred_on, title, body, hub_source, memory_type, photo_url, is_private)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `).run(id, userId, occurred_on, scrubPII(title.trim()), body ? scrubPII(body) : null,
      hub_source ?? 'manual', memory_type ?? 'manual', photo_url ?? null, is_private !== false);

    res.status(201).json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/timeline/memories/:id ───────────────────────────────────────────
timelineRouter.put('/memories/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { title, body, photo_url, is_shared, is_private } = req.body;
    await db.prepare(`
      UPDATE timeline_memories
      SET title = COALESCE($1, title), body = COALESCE($2, body),
          photo_url = COALESCE($3, photo_url), is_shared = COALESCE($4, is_shared),
          is_private = COALESCE($5, is_private)
      WHERE id = $6 AND user_id = $7
    `).run(title ? scrubPII(title) : null, body ? scrubPII(body) : null,
      photo_url ?? null, is_shared ?? null, is_private ?? null,
      req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/timeline/memories/:id ────────────────────────────────────────
timelineRouter.delete('/memories/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`DELETE FROM timeline_memories WHERE id = $1 AND user_id = $2`)
      .run(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/timeline/on-this-day ─────────────────────────────────────────────
timelineRouter.get('/on-this-day', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, occurred_on, title, body, hub_source, memory_type, photo_url, created_at
      FROM timeline_memories
      WHERE user_id = $1
        AND EXTRACT(MONTH FROM occurred_on) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM occurred_on)   = EXTRACT(DAY FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM occurred_on)  < EXTRACT(YEAR FROM CURRENT_DATE)
      ORDER BY occurred_on DESC
      LIMIT 3
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/timeline/monthly-summary ────────────────────────────────────────
timelineRouter.get('/monthly-summary', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { year, month } = req.query as Record<string, string>;
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) : new Date().getMonth() + 1;

    const rows = await db.prepare(`
      SELECT title, memory_type, occurred_on FROM timeline_memories
      WHERE user_id = $1
        AND EXTRACT(YEAR FROM occurred_on)  = $2
        AND EXTRACT(MONTH FROM occurred_on) = $3
      ORDER BY occurred_on ASC
    `).all(userId, y, m);

    if (!rows || rows.length === 0) {
      return res.json({ summary: 'No memories recorded for this month yet.' });
    }

    const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'long' });
    const memoryList = rows.map((r) => `- ${r.occurred_on}: ${r.title}`).join('\n');
    let summary = `${monthName} ${y} highlights:\n${memoryList}`;

    if (ANTHROPIC_API_KEY) {
      try {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 400,
            system: 'You write warm, personal monthly memory summaries for a life management app. 3-5 sentences max. Celebratory and reflective tone. No PII, no specific numbers from the data.',
            messages: [{ role: 'user', content: `Write a warm summary of this person's ${monthName} ${y} based on these memories:\n${scrubPII(memoryList)}` }],
          }),
        });
        if (aiRes.ok) {
          const d = await aiRes.json() as { content: Array<{ type: string; text: string }> };
          summary = d.content.find((c) => c.type === 'text')?.text?.trim() ?? summary;
        }
      } catch { /* use fallback */ }
    }

    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/timeline/years ───────────────────────────────────────────────────
// Returns list of years that have memories, for filter UI
timelineRouter.get('/years', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT DISTINCT EXTRACT(YEAR FROM occurred_on)::int AS year
      FROM timeline_memories
      WHERE user_id = $1
      ORDER BY year DESC
    `).all(userId);
    res.json(rows?.map((r) => (r as { year: number }).year) ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
