// ─── Goals & Milestones Hub ───────────────────────────────────────────────────
// Session 14 Enhancement 3 — Propel Stack AI, LLC

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import { complete } from '../ai-gateway.js';

export const goalsRouter = Router();

// ─── GET /api/goals — list active goals ───────────────────────────────────────
goalsRouter.get('/', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare("SELECT * FROM goals WHERE user_id = ? AND status != 'abandoned' ORDER BY created_at DESC")
    .all(userId);
  res.json(rows);
});

// ─── POST /api/goals — create goal ────────────────────────────────────────────
goalsRouter.post('/', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { title, category = 'personal', target_value, current_value = 0, unit = '%', hub_source, hub_metric, target_date, ai_coaching_enabled = true } = req.body ?? {};
  if (!title || target_value === undefined) return res.status(400).json({ error: 'title and target_value required' });

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO goals (id, user_id, title, category, target_value, current_value, unit, hub_source, hub_metric, target_date, ai_coaching_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, title, category, target_value, current_value, unit, hub_source ?? null, hub_metric ?? null, target_date ?? null, ai_coaching_enabled);

  // Auto-create milestone markers (25/50/75/100)
  for (const pct of [25, 50, 75, 100]) {
    await db.prepare('INSERT INTO goal_milestones (id, goal_id, milestone_pct) VALUES (?, ?, ?)').run(randomUUID(), id, pct);
  }

  res.status(201).json({ id, ok: true });
});

// ─── GET /api/goals/:id — single goal with milestones + progress ──────────────
goalsRouter.get('/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const goal = await db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, userId) as Record<string, unknown> | undefined;
  if (!goal) return res.status(404).json({ error: 'not found' });

  const milestones = await db.prepare('SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY milestone_pct ASC').all(req.params.id);
  const progress = await db.prepare('SELECT * FROM goal_progress_log WHERE goal_id = ? ORDER BY logged_at DESC LIMIT 30').all(req.params.id);

  res.json({ ...goal, milestones, progress });
});

// ─── PATCH /api/goals/:id — update goal value / status ───────────────────────
goalsRouter.patch('/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { current_value, status, title, target_date } = req.body ?? {};
  const goal = await db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, userId) as Record<string, unknown> | undefined;
  if (!goal) return res.status(404).json({ error: 'not found' });

  if (current_value !== undefined) {
    await db.prepare('UPDATE goals SET current_value = ? WHERE id = ?').run(current_value, req.params.id);
    // Log progress
    await db.prepare('INSERT INTO goal_progress_log (id, goal_id, logged_value) VALUES (?, ?, ?)').run(randomUUID(), req.params.id, current_value);
    // Check milestones
    const pct = Math.round((current_value / Number(goal.target_value)) * 100);
    const milestone = await db.prepare('SELECT * FROM goal_milestones WHERE goal_id = ? AND milestone_pct <= ? AND achieved_at IS NULL ORDER BY milestone_pct DESC LIMIT 1').get(req.params.id, pct) as Record<string, unknown> | undefined;
    if (milestone) {
      let aiMsg = `You've reached ${milestone.milestone_pct}% of your goal: "${goal.title}"! Keep going!`;
      try {
        const result = complete({ model: 'claude-haiku-4-5', system: 'You are an enthusiastic life coach. Write one short celebration message (max 15 words).', messages: [{ role: 'user', content: `Goal: ${goal.title}. ${milestone.milestone_pct}% reached!` }], maxTokens: 50 });
        if (result.text) aiMsg = result.text.trim();
      } catch { /* use default */ }
      await db.prepare('UPDATE goal_milestones SET achieved_at = NOW(), ai_message = ? WHERE id = ?').run(aiMsg, milestone.id);
    }
  }
  if (status) await db.prepare('UPDATE goals SET status = ? WHERE id = ?').run(status, req.params.id);
  if (title) await db.prepare('UPDATE goals SET title = ? WHERE id = ?').run(title, req.params.id);
  if (target_date) await db.prepare('UPDATE goals SET target_date = ? WHERE id = ?').run(target_date, req.params.id);

  res.json({ ok: true });
});

// ─── DELETE /api/goals/:id ────────────────────────────────────────────────────
goalsRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  await db.prepare("UPDATE goals SET status = 'abandoned' WHERE id = ? AND user_id = ?").run(req.params.id, userId);
  res.json({ ok: true });
});

// ─── GET /api/goals/:id/coaching — AI coaching for a goal ────────────────────
goalsRouter.get('/:id/coaching', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const goal = await db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, userId) as Record<string, unknown> | undefined;
  if (!goal) return res.status(404).json({ error: 'not found' });

  const pct = Math.round((Number(goal.current_value) / Number(goal.target_value)) * 100);
  const daysLeft = goal.target_date ? Math.ceil((new Date(goal.target_date as string).getTime() - Date.now()) / 86400000) : null;

  let coaching = `At your current pace you'll reach this goal by the target date. Keep it up!`;
  try {
    const result = complete({
      model: 'claude-haiku-4-5',
      system: 'You are a supportive life coach. Give one short coaching insight (2 sentences max).',
      messages: [{ role: 'user', content: `Goal: "${goal.title}". Progress: ${pct}% (${goal.current_value}/${goal.target_value} ${goal.unit}). ${daysLeft !== null ? `${daysLeft} days remaining.` : ''}` }],
      maxTokens: 120,
    });
    if (result.text) coaching = result.text.trim();
  } catch { /* use default */ }

  res.json({ coaching, pct, days_left: daysLeft });
});
