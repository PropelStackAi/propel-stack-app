import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import {
  habitSchema,
  habitStreak,
  logActivity,
  newId,
  noteSchema,
  rowToNote,
  rowToTask,
  taskSchema,
  todayIso,
} from '../lib/dashboard.js';

/** Tasks, habits, and notes (Session 5). */
export const productivityRouter = Router();

// ---- Tasks ----
productivityRouter.get('/tasks', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare(
      `SELECT * FROM tasks WHERE user_id = ?
       ORDER BY (completed_at IS NOT NULL), (due_date IS NULL), due_date ASC, created_at DESC`,
    )
    .all(userId);
  res.json(rows.map(rowToTask));
});

productivityRouter.post('/tasks', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid task' });
  const id = newId();
  await db.prepare('INSERT INTO tasks (id, user_id, title, notes, due_date) VALUES (?, ?, ?, ?, ?)').run(
    id, userId, parsed.data.title, parsed.data.notes, parsed.data.dueDate,
  );
  logActivity(userId, 'task', `Added task: ${parsed.data.title}`).catch(() => {});
  const row = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json(rowToTask(row as Record<string, unknown>));
});

productivityRouter.patch('/tasks/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  if (!await db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid task' });
  await db.prepare('UPDATE tasks SET title = ?, notes = ?, due_date = ? WHERE id = ? AND user_id = ?').run(
    parsed.data.title, parsed.data.notes, parsed.data.dueDate, id, userId,
  );
  const row = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(rowToTask(row as Record<string, unknown>));
});

productivityRouter.post('/tasks/:id/toggle', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  const row = await db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  const completedAt = row.completed_at ? null : new Date().toISOString();
  await db.prepare('UPDATE tasks SET completed_at = ? WHERE id = ?').run(completedAt, id);
  const updated = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(rowToTask(updated as Record<string, unknown>));
});

productivityRouter.delete('/tasks/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = await db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ---- Habits ----
async function habitsWithStreaks(userId: string) {
  const habits = await db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at').all(userId);
  const comps = await db.prepare('SELECT habit_id, completed_on FROM habit_completions WHERE user_id = ?').all(userId);
  const byHabit = new Map<string, Set<string>>();
  for (const c of comps) {
    const hid = c.habit_id as string;
    if (!byHabit.has(hid)) byHabit.set(hid, new Set());
    byHabit.get(hid)!.add(c.completed_on as string);
  }
  const today = todayIso();
  return habits.map((h) => {
    const set = byHabit.get(h.id as string) ?? new Set<string>();
    return { id: h.id as string, name: h.name as string, completedToday: set.has(today), streak: habitStreak(set) };
  });
}

productivityRouter.get('/habits', async (_req: Request, res: Response) => {
  res.json(await habitsWithStreaks(getCurrentUserId()));
});

productivityRouter.post('/habits', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = habitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid habit' });
  await db.prepare('INSERT INTO habits (id, user_id, name) VALUES (?, ?, ?)').run(newId(), userId, parsed.data.name);
  logActivity(userId, 'habit', `Added habit: ${parsed.data.name}`).catch(() => {});
  res.status(201).json(await habitsWithStreaks(userId));
});

productivityRouter.post('/habits/:id/toggle', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  if (!await db.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').get(id, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const today = todayIso();
  const existing = await db.prepare('SELECT id FROM habit_completions WHERE habit_id = ? AND completed_on = ?').get(id, today) as { id: string } | undefined;
  if (existing) await db.prepare('DELETE FROM habit_completions WHERE id = ?').run(existing.id);
  else await db.prepare('INSERT INTO habit_completions (id, habit_id, user_id, completed_on) VALUES (?, ?, ?, ?)').run(newId(), id, userId, today);
  res.json(await habitsWithStreaks(userId));
});

productivityRouter.delete('/habits/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = await db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ---- Notes ----
productivityRouter.get('/notes', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  res.json(rows.map(rowToNote));
});

productivityRouter.post('/notes', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid note' });
  const id = newId();
  await db.prepare('INSERT INTO notes (id, user_id, title, body) VALUES (?, ?, ?, ?)').run(id, userId, parsed.data.title, parsed.data.body);
  logActivity(userId, 'note', `Added note: ${parsed.data.title || parsed.data.body.slice(0, 40)}`).catch(() => {});
  const row = await db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  res.status(201).json(rowToNote(row as Record<string, unknown>));
});

productivityRouter.patch('/notes/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  if (!await db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(id, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid note' });
  await db.prepare('UPDATE notes SET title = ?, body = ? WHERE id = ? AND user_id = ?').run(parsed.data.title, parsed.data.body, id, userId);
  const row = await db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  res.json(rowToNote(row as Record<string, unknown>));
});

productivityRouter.delete('/notes/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = await db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});
