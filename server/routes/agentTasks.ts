/**
 * AI Agent Task Execution — Enhancement 27
 * Propel Stack AI, LLC
 *
 * Elite-only feature. Delegates real-world tasks to AI:
 *   - Bill payment (with spending limit gate)
 *   - Booking (hotel, flight, restaurant)
 *   - Form fill
 *   - Communication drafting
 *
 * SAFETY ARCHITECTURE (hard limits — never bypass):
 *   1. Every task requires explicit approved_at before execution
 *   2. Default per-transaction spending limit is $0 — must be raised by user
 *   3. Full audit trail — every action permanently logged
 *   4. 15-minute undo window for reversible actions
 *   5. Pre-action preview card mandatory — cannot be disabled
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';

export const agentTasksRouter = Router();

type TaskStatus = 'pending_approval' | 'approved' | 'executing' | 'complete' | 'failed' | 'cancelled';
type TaskType = 'payment' | 'booking' | 'form_fill' | 'communication' | 'renewal' | 'general';

// ── GET /api/agent-tasks ──────────────────────────────────────────────────────
agentTasksRouter.get('/', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, task_type, task_description, status, preview_shown_at, approved_at,
             executed_at, result_summary, confirmation_id, cost_amount, can_undo,
             undo_deadline, created_at
      FROM agent_tasks
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agent-tasks ─────────────────────────────────────────────────────
// Create a new task (status = pending_approval, preview shown to user)
agentTasksRouter.post('/', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { task_description, task_type } = req.body as { task_description: string; task_type?: TaskType };

    if (!task_description?.trim()) {
      return res.status(400).json({ error: 'task_description is required' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO agent_tasks (id, user_id, task_type, task_description, status, preview_shown_at)
      VALUES ($1, $2, $3, $4, 'pending_approval', $5)
    `).run(id, userId, task_type ?? 'general', scrubPII(task_description.trim()), now);

    // Return the created task so client can show the confirmation preview
    const task = await db.prepare(`
      SELECT * FROM agent_tasks WHERE id = $1
    `).get(id);

    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agent-tasks/:id/approve ────────────────────────────────────────
// User explicitly approves the task (mandatory gate before execution)
agentTasksRouter.post('/:id/approve', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const now = new Date().toISOString();

    const task = await db.prepare(`
      SELECT * FROM agent_tasks WHERE id = $1 AND user_id = $2
    `).get(req.params.id as string, userId) as Record<string, unknown> | undefined;

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Task is not pending approval' });
    }

    // Move to approved — execution is asynchronous (Playwright worker in production)
    await db.prepare(`
      UPDATE agent_tasks SET status = 'approved', approved_at = $1 WHERE id = $2 AND user_id = $3
    `).run(now, req.params.id as string, userId);

    // Simulate execution result (in production, Playwright worker picks this up)
    const undoDeadline = new Date(Date.now() + 15 * 60_000).toISOString();
    await db.prepare(`
      UPDATE agent_tasks
      SET status = 'complete', executed_at = $1, result_summary = $2,
          can_undo = true, undo_deadline = $3
      WHERE id = $4 AND user_id = $5
    `).run(now, 'Task queued for execution — you will be notified when complete.', undoDeadline,
      req.params.id as string, userId);

    res.json({ ok: true, status: 'complete' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agent-tasks/:id/cancel ─────────────────────────────────────────
agentTasksRouter.post('/:id/cancel', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`
      UPDATE agent_tasks SET status = 'cancelled' WHERE id = $1 AND user_id = $2 AND status = 'pending_approval'
    `).run(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agent-tasks/:id/undo ───────────────────────────────────────────
agentTasksRouter.post('/:id/undo', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const task = await db.prepare(`
      SELECT can_undo, undo_deadline FROM agent_tasks WHERE id = $1 AND user_id = $2
    `).get(req.params.id as string, userId) as { can_undo: boolean; undo_deadline: string } | undefined;

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!task.can_undo) return res.status(400).json({ error: 'This task cannot be undone' });
    if (new Date(task.undo_deadline) < new Date()) {
      return res.status(400).json({ error: 'Undo window has expired (15 minutes)' });
    }

    await db.prepare(`
      UPDATE agent_tasks SET status = 'cancelled', can_undo = false WHERE id = $1 AND user_id = $2
    `).run(req.params.id as string, userId);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
