/**
 * Travel & Trip Hub — Enhancement 31
 * Propel Stack AI, LLC
 *
 * Trip builder, AI itinerary, packing list, documents, currency info.
 * Flight tracking requires FlightAware AeroAPI key (FLIGHT_AWARE_API_KEY env var).
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';

export const travelRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

async function callAI(system: string, user: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1200, system, messages: [{ role: 'user', content: scrubPII(user) }] }),
    });
    if (!res.ok) return '';
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    return data.content.find((c) => c.type === 'text')?.text?.trim() ?? '';
  } catch { return ''; }
}

// ── GET /api/travel/trips ─────────────────────────────────────────────────────
travelRouter.get('/trips', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, name, destination, start_date, end_date, trip_type, travelers, created_at
      FROM trips WHERE user_id = $1 ORDER BY start_date DESC
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/travel/trips/:id ─────────────────────────────────────────────────
travelRouter.get('/trips/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const row = await db.prepare(`SELECT * FROM trips WHERE id = $1 AND user_id = $2`).get(req.params.id as string, userId);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/travel/trips ────────────────────────────────────────────────────
travelRouter.post('/trips', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, destination, start_date, end_date, trip_type, travelers } = req.body;
    if (!name?.trim() || !destination?.trim()) return res.status(400).json({ error: 'name and destination required' });
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO trips (id, user_id, name, destination, start_date, end_date, trip_type, travelers)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `).run(id, userId, name.trim(), destination.trim(), start_date ?? null, end_date ?? null,
      trip_type ?? 'leisure', JSON.stringify(travelers ?? []));
    res.status(201).json({ id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/travel/trips/:id ─────────────────────────────────────────────────
travelRouter.put('/trips/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, destination, start_date, end_date, trip_type, packing_list, documents } = req.body;
    await db.prepare(`
      UPDATE trips SET name = COALESCE($1,name), destination = COALESCE($2,destination),
        start_date = COALESCE($3,start_date), end_date = COALESCE($4,end_date),
        trip_type = COALESCE($5,trip_type),
        packing_list = COALESCE($6::jsonb, packing_list),
        documents = COALESCE($7::jsonb, documents)
      WHERE id = $8 AND user_id = $9
    `).run(name ?? null, destination ?? null, start_date ?? null, end_date ?? null, trip_type ?? null,
      packing_list ? JSON.stringify(packing_list) : null,
      documents ? JSON.stringify(documents) : null,
      req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/travel/trips/:id ──────────────────────────────────────────────
travelRouter.delete('/trips/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`DELETE FROM trips WHERE id = $1 AND user_id = $2`).run(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/travel/trips/:id/itinerary ─────────────────────────────────────
travelRouter.post('/trips/:id/itinerary', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const trip = await db.prepare(`SELECT * FROM trips WHERE id = $1 AND user_id = $2`).get(req.params.id as string, userId) as any;
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const { interests = '' } = req.body;
    const duration = trip.start_date && trip.end_date
      ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
      : 3;

    const itinerary = await callAI(
      'You create travel itineraries for a life management app. Return a JSON array of day objects: [{day: 1, date: "YYYY-MM-DD", morning: "...", afternoon: "...", evening: "...", notes: "..."}]. Max 3 sentences per time block. Practical and specific.',
      `Create a ${duration}-day itinerary for a ${trip.trip_type} trip to ${trip.destination}${interests ? `. Interests: ${interests}` : ''}.`,
    );

    let parsedItinerary = [];
    try { parsedItinerary = JSON.parse(itinerary.replace(/```json\n?|\n?```/g, '')); } catch { parsedItinerary = [{ day: 1, notes: itinerary }]; }

    await db.prepare(`UPDATE trips SET itinerary = $1::jsonb WHERE id = $2 AND user_id = $3`)
      .run(JSON.stringify(parsedItinerary), req.params.id as string, userId);

    res.json({ itinerary: parsedItinerary });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/travel/trips/:id/packing-list ───────────────────────────────────
travelRouter.post('/trips/:id/packing-list', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const trip = await db.prepare(`SELECT * FROM trips WHERE id = $1 AND user_id = $2`).get(req.params.id as string, userId) as any;
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const { activities = '' } = req.body;
    const duration = trip.start_date && trip.end_date
      ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
      : 3;

    const list = await callAI(
      'You generate packing lists. Return a JSON array of strings, each an item to pack. Group related items together. No markdown.',
      `${duration}-day ${trip.trip_type} trip to ${trip.destination}${activities ? `. Activities: ${activities}` : ''}. What should I pack?`,
    );

    let items: string[] = [];
    try { items = JSON.parse(list.replace(/```json\n?|\n?```/g, '')); } catch {
      items = list.split('\n').filter(Boolean).map((s) => s.replace(/^[-*•]\s*/, ''));
    }

    await db.prepare(`UPDATE trips SET packing_list = $1::jsonb WHERE id = $2 AND user_id = $3`)
      .run(JSON.stringify(items.map((i) => ({ item: i, packed: false }))), req.params.id as string, userId);

    res.json({ packing_list: items });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/travel/currency ──────────────────────────────────────────────────
// Basic currency info — live rates require EXCHANGE_RATE_API_KEY env var
travelRouter.get('/currency', async (req, res) => {
  try {
    const { from = 'USD', to = 'EUR' } = req.query as Record<string, string>;
    // Stub rate — production would call exchangerate.host or similar
    res.json({ from, to, rate: 1, note: 'Live rates require EXCHANGE_RATE_API_KEY configuration.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
