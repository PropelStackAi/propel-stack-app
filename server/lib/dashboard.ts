import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db.js';

/** Dashboard / productivity helpers (Session 5). */

export function newId(): string {
  return crypto.randomUUID();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Monday-based start of the current week (YYYY-MM-DD). */
export function weekStartIso(): string {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function monthStartIso(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

export async function logActivity(userId: string, kind: string, summary: string): Promise<void> {
  await db.prepare('INSERT INTO activity_log (id, user_id, kind, summary) VALUES (?, ?, ?, ?)').run(
    newId(), userId, kind, summary,
  );
}

// ---- Schemas ----
const isoDateOrNull = z
  .string()
  .trim()
  .max(40)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(2000).default(''),
  dueDate: isoDateOrNull,
});

export const habitSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const noteSchema = z.object({
  title: z.string().trim().max(200).default(''),
  body: z.string().max(5000).default(''),
});

export const captureSchema = z.object({
  kind: z.enum(['task', 'note', 'contact', 'expense']),
  text: z.string().trim().min(1).max(500),
  amount: z.number().finite().optional(),
});

// ---- Mappers ----
export function rowToTask(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    notes: r.notes as string,
    dueDate: (r.due_date as string | null) ?? null,
    completedAt: (r.completed_at as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

export function rowToNote(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    body: r.body as string,
    createdAt: r.created_at as string,
  };
}

export function rowToActivity(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    kind: r.kind as string,
    summary: r.summary as string,
    createdAt: r.created_at as string,
  };
}

/** Current consecutive-day streak for a habit (counting today or, if not done today, yesterday back). */
export function habitStreak(completedDates: Set<string>): number {
  let streak = 0;
  const d = new Date();
  // If today isn't completed, start counting from yesterday so an active streak isn't shown as broken mid-day.
  if (!completedDates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (completedDates.has(key)) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
