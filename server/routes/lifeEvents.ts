/**
 * Life Events Hub — Marriage, Birth, Moving, Career Changes, etc.
 * Propel Stack AI, LLC
 */
import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { complete } from '../ai-gateway.js';
import { scrubPII } from '../middleware/piiScrubber.js';

export const lifeEventsRouter = Router();

function newId() { return crypto.randomUUID(); }

// GET /api/life-events — list user's life events ordered by event_date DESC
lifeEventsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT * FROM life_events
      WHERE user_id = $1
      ORDER BY event_date DESC
    `).all(userId) as any[];
    const parsed = rows.map((r) => ({
      ...r,
      ai_checklist: typeof r.ai_checklist === 'string' ? JSON.parse(r.ai_checklist) : (r.ai_checklist ?? []),
    }));
    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Failed to fetch life events' });
  }
});

// POST /api/life-events — create a life event
lifeEventsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { event_type, title, description, event_date } = req.body as {
      event_type: string;
      title: string;
      description?: string;
      event_date: string;
    };
    if (!event_type || !title || !event_date) {
      return res.status(400).json({ error: 'event_type, title, and event_date required' });
    }
    const id = newId();
    await db.prepare(`
      INSERT INTO life_events (id, user_id, event_type, title, description, event_date)
      VALUES ($1, $2, $3, $4, $5, $6)
    `).run(id, userId, event_type, title, description ?? null, event_date);
    res.status(201).json({ id });
  } catch {
    res.status(500).json({ error: 'Failed to create life event' });
  }
});

// PUT /api/life-events/:id — update a life event
lifeEventsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { event_type, title, description, event_date, media_url } = req.body as {
      event_type?: string;
      title?: string;
      description?: string;
      event_date?: string;
      media_url?: string;
    };
    await db.prepare(`
      UPDATE life_events
      SET
        event_type = COALESCE($1, event_type),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        event_date = COALESCE($4, event_date),
        media_url = COALESCE($5, media_url)
      WHERE id = $6 AND user_id = $7
    `).run(
      event_type ?? null,
      title ?? null,
      description ?? null,
      event_date ?? null,
      media_url ?? null,
      req.params.id,
      userId
    );
    res.json({ id: req.params.id });
  } catch {
    res.status(500).json({ error: 'Failed to update life event' });
  }
});

// DELETE /api/life-events/:id — delete a life event
lifeEventsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM life_events WHERE id = $1 AND user_id = $2').run(req.params.id, userId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete life event' });
  }
});

// POST /api/life-events/ai-prep — AI preparation checklist for a life event type
lifeEventsRouter.post('/ai-prep', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { event_type, event_id } = req.body as { event_type: string; event_id?: string };
    if (!event_type) return res.status(400).json({ error: 'event_type required' });

    const prompt = scrubPII(
      `You are a life planning expert. Generate a comprehensive preparation checklist for someone planning a "${event_type}" life event. ` +
      `Return a JSON array of 8-15 checklist items. Each item must have: ` +
      `"category" (one of: Financial, Legal, Logistical, Health, Social) and "item" (a clear, actionable task). ` +
      `Return ONLY the JSON array, no markdown, no extra text. Example format: ` +
      `[{"category":"Financial","item":"Open a joint bank account"},{"category":"Legal","item":"Update your will"}]`
    );

    const result = complete({ prompt, mode: 'general' });
    let checklist: Array<{ category: string; item: string }> = [];

    try {
      const text = result.text?.trim() ?? '';
      // Strip markdown code fences if present
      const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      checklist = JSON.parse(jsonText);
      if (!Array.isArray(checklist)) checklist = [];
    } catch {
      // Fallback minimal checklist
      checklist = [
        { category: 'Financial', item: 'Review and update your budget' },
        { category: 'Legal', item: 'Consult an attorney if needed' },
        { category: 'Logistical', item: 'Create a timeline and task list' },
        { category: 'Health', item: 'Schedule a health check-up' },
        { category: 'Social', item: 'Notify close family and friends' },
      ];
    }

    // If an event_id was provided, cache the checklist on the event record
    if (event_id) {
      await db.prepare(`
        UPDATE life_events SET ai_checklist = $1 WHERE id = $2 AND user_id = $3
      `).run(JSON.stringify(checklist), event_id, userId);
    }

    res.json({ event_type, checklist });
  } catch {
    res.status(500).json({ error: 'Failed to generate AI preparation checklist' });
  }
});
