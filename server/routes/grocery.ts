/**
 * Grocery & Meal Intelligence — Enhancement 32
 * Propel Stack AI, LLC
 *
 * Smart grocery lists, pantry inventory, AI meal suggestions.
 * Barcode scanning handled client-side via Capacitor + ZXing.
 * Delivery integrations via Credential Bridge (Enhancement 26).
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';

export const groceryRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

async function callAI(system: string, user: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 800, system, messages: [{ role: 'user', content: scrubPII(user) }] }),
    });
    if (!res.ok) return '';
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    return data.content.find((c) => c.type === 'text')?.text?.trim() ?? '';
  } catch { return ''; }
}

// ── Pantry CRUD ───────────────────────────────────────────────────────────────
groceryRouter.get('/pantry', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, name, category, quantity, unit, barcode, expiry_date, created_at
      FROM pantry_items WHERE user_id = $1 ORDER BY category, name
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

groceryRouter.post('/pantry', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, category, quantity, unit, barcode, expiry_date } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO pantry_items (id, user_id, name, category, quantity, unit, barcode, expiry_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `).run(id, userId, name.trim(), category ?? null, quantity ?? null, unit ?? null, barcode ?? null, expiry_date ?? null);
    res.status(201).json({ id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

groceryRouter.put('/pantry/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, category, quantity, unit, expiry_date } = req.body;
    await db.prepare(`
      UPDATE pantry_items SET name = COALESCE($1, name), category = COALESCE($2, category),
        quantity = COALESCE($3, quantity), unit = COALESCE($4, unit), expiry_date = COALESCE($5, expiry_date)
      WHERE id = $6 AND user_id = $7
    `).run(name ?? null, category ?? null, quantity ?? null, unit ?? null, expiry_date ?? null, req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

groceryRouter.delete('/pantry/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`DELETE FROM pantry_items WHERE id = $1 AND user_id = $2`).run(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Grocery Lists ─────────────────────────────────────────────────────────────
groceryRouter.get('/lists', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, week_start, items, estimated_total, actual_total, created_at
      FROM grocery_lists WHERE user_id = $1 ORDER BY week_start DESC LIMIT 10
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

groceryRouter.get('/lists/current', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    // Get Monday of current week
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    today.setDate(today.getDate() + diff);
    const weekStart = today.toISOString().slice(0, 10);

    let row = await db.prepare(`SELECT * FROM grocery_lists WHERE user_id = $1 AND week_start = $2`).get(userId, weekStart);
    if (!row) {
      const id = randomUUID();
      await db.prepare(`INSERT INTO grocery_lists (id, user_id, week_start, items) VALUES ($1, $2, $3, '[]'::jsonb)`)
        .run(id, userId, weekStart);
      row = await db.prepare(`SELECT * FROM grocery_lists WHERE id = $1`).get(id);
    }
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

groceryRouter.put('/lists/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { items, estimated_total, actual_total } = req.body;
    await db.prepare(`
      UPDATE grocery_lists SET
        items = COALESCE($1::jsonb, items),
        estimated_total = COALESCE($2, estimated_total),
        actual_total = COALESCE($3, actual_total)
      WHERE id = $4 AND user_id = $5
    `).run(items ? JSON.stringify(items) : null, estimated_total ?? null, actual_total ?? null, req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── AI Meal Suggestions from Pantry ───────────────────────────────────────────
groceryRouter.post('/suggest-meals', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const pantry = await db.prepare(`SELECT name, quantity, unit FROM pantry_items WHERE user_id = $1 LIMIT 30`).all(userId);
    const { dietary_preferences = '' } = req.body;

    if (!pantry || pantry.length === 0) {
      return res.json({ suggestions: ['Add items to your pantry to get meal suggestions!'] });
    }

    const itemList = pantry.map((i: any) => `${i.name}${i.quantity ? ` (${i.quantity}${i.unit ?? ''})` : ''}`).join(', ');

    const result = await callAI(
      'You suggest meal ideas based on pantry contents. Give 4-5 specific meal ideas with brief descriptions. No recipes, just names and 1-sentence descriptions.',
      `Pantry: ${itemList}${dietary_preferences ? `\nDietary preferences: ${dietary_preferences}` : ''}\n\nWhat meals can I make?`,
    );

    res.json({ suggestions: result ? result.split('\n').filter(Boolean) : ['Pantry data insufficient for suggestions.'] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── AI Grocery List from Meal Plan ────────────────────────────────────────────
groceryRouter.post('/generate-from-plan', async (req, res) => {
  try {
    const { meals, servings = 4, dietary_preferences = '' } = req.body;
    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return res.status(400).json({ error: 'meals array is required' });
    }

    const mealList = (meals as string[]).join(', ');
    const result = await callAI(
      'You generate grocery lists. Return a JSON array of objects: [{name: "item", quantity: "amount", unit: "unit", aisle: "produce|dairy|meat|pantry|frozen|bakery|other"}]. No markdown.',
      `Generate a grocery list for ${servings} servings of these meals: ${scrubPII(mealList)}${dietary_preferences ? `\nDietary restrictions: ${dietary_preferences}` : ''}`,
    );

    let items = [];
    try { items = JSON.parse(result.replace(/```json\n?|\n?```/g, '')); }
    catch { items = [{ name: result, quantity: '1', unit: 'item', aisle: 'other' }]; }

    res.json({ items });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
