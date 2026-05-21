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

/** Tasks, habits, and notes (Session 5). Synchronous sql.js access (HARD RULE #5). */
export const productivityRouter = Router();

// ---- Tasks ----
productivityRouter.get('/tasks', (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = db
    .prepare(
      `SELECT * FROM tasks WHERE user_id = ?
       ORDER BY (completed_at IS NOT NULL), (due_date IS NULL), due_date ASC, created_at DESC`,
    )
    .all(userId) as Record<string, unknown>[];
  res.json(rows.map(rowToTask));
});

productivityRouter.post('/tasks', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid task' });
  const id = newId();
  db.prepare('INSERT INTO tasks (id, user_id, title, notes, due_date) VALUES (?, ?, ?, ?, ?)').run(
    id, userId, parsed.data.title, parsed.data.notes, parsed.data.dueDate,
  );
  logActivity(userId, 'task', `Added task: ${parsed.data.title}`);
  res.status(201).json(rowToTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>));
});

productivityRouter.patch('/tasks/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  if (!db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid task' });
  db.prepare('UPDATE tasks SET title = ?, notes = ?, due_date = ? WHERE id = ? AND user_id = ?').run(
    parsed.data.title, parsed.data.notes, parsed.data.dueDate, id, userId,
  );
  res.json(rowToTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>));
});

productivityRouter.post('/tasks/:id/toggle', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  const row = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  const completedAt = row.completed_at ? null : new Date().toISOString();
  db.prepare('UPDATE tasks SET completed_at = ? WHERE id = ?').run(completedAt, id);
  res.json(rowToTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>));
});

productivityRouter.delete('/tasks/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ---- Habits ----
function habitsWithStreaks(userId: string) {
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at').all(userId) as Record<string, unknown>[];
  const comps = db.prepare('SELECT habit_id, completed_on FROM habit_completions WHERE user_id = ?').all(userId) as Record<string, unknown>[];
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

productivityRouter.get('/habits', (_req: Request, res: Response) => {
  res.json(habitsWithStreaks(getCurrentUserId()));
});

productivityRouter.post('/habits', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = habitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid habit' });
  db.prepare('INSERT INTO habits (id, user_id, name) VALUES (?, ?, ?)').run(newId(), userId, parsed.data.name);
  logActivity(userId, 'habit', `Added habit: ${parsed.data.name}`);
  res.status(201).json(habitsWithStreaks(userId));
});

productivityRouter.post('/habits/:id/toggle', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  if (!db.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').get(id, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const today = todayIso();
  const existing = db.prepare('SELECT id FROM habit_completions WHERE habit_id = ? AND completed_on = ?').get(id, today) as { id: string } | undefined;
  if (existing) db.prepare('DELETE FROM habit_completions WHERE id = ?').run(existing.id);
  else db.prepare('INSERT INTO habit_completions (id, habit_id, user_id, completed_on) VALUES (?, ?, ?, ?)').run(newId(), id, userId, today);
  res.json(habitsWithStreaks(userId));
});

productivityRouter.delete('/habits/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ---- Notes ----
productivityRouter.get('/notes', (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Record<string, unknown>[];
  res.json(rows.map(rowToNote));
});

productivityRouter.post('/notes', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid note' });
  const id = newId();
  db.prepare('INSERT INTO notes (id, user_id, title, body) VALUES (?, ?, ?, ?)').run(id, userId, parsed.data.title, parsed.data.body);
  logActivity(userId, 'note', `Added note: ${parsed.data.title || parsed.data.body.slice(0, 40)}`);
  res.status(201).json(rowToNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Record<string, unknown>));
});

productivityRouter.patch('/notes/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  if (!db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(id, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid note' });
  db.prepare('UPDATE notes SET title = ?, body = ? WHERE id = ? AND user_id = ?').run(parsed.data.title, parsed.data.body, id, userId);
  res.json(rowToNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Record<string, unknown>));
});

productivityRouter.delete('/notes/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});
