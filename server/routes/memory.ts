/**
 * Memory API — Propel Stack AI, LLC
 *
 * Three-Tier Memory System (Enhancement 1) + Memory Health Card (Enhancement 18).
 * Provides CRUD, soft/hard reset, audit log, trend access, and manual analysis trigger.
 */
import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import {
  getMemoryHealth,
  logEpisodic,
  upsertSemantic,
  upsertProcedural,
  auditLog,
  type MemoryNamespace,
} from '../lib/memoryStore.js';
import { runMemoryAnalysis } from '../jobs/memoryAnalysis.js';

export const memoryRouter = Router();

// ─── Memory Health Card ───────────────────────────────────────────────────────

memoryRouter.get('/health', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const data = await getMemoryHealth(userId);
  res.json(data);
});

// ─── List by namespace ────────────────────────────────────────────────────────

memoryRouter.get('/:namespace(episodic|semantic|procedural)', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { namespace } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const rows = await db
    .prepare(
      `SELECT * FROM user_memories
       WHERE user_id = ? AND namespace = ? AND is_stale = FALSE
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(userId, namespace, limit, offset);
  res.json(rows);
});

// ─── Log a memory manually ────────────────────────────────────────────────────

memoryRouter.post('/log', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { namespace = 'episodic', content, context_key } = req.body ?? {};
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content required' });
  }
  const ns = namespace as MemoryNamespace;
  if (!['episodic', 'semantic', 'procedural'].includes(ns)) {
    return res.status(400).json({ error: 'invalid namespace' });
  }

  if (ns === 'episodic') {
    await logEpisodic(userId, content.trim(), context_key);
  } else if (ns === 'semantic') {
    await upsertSemantic(userId, content.trim(), context_key || 'general');
  } else {
    await upsertProcedural(userId, content.trim(), context_key || 'general');
  }

  await auditLog(userId, 'manual_log', { namespace: ns, description: `Logged: ${content.slice(0, 80)}` });
  res.status(201).json({ ok: true });
});

// ─── Delete a single memory item ─────────────────────────────────────────────

memoryRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const row = await db
    .prepare(`SELECT id, namespace, content FROM user_memories WHERE id = ? AND user_id = ?`)
    .get(req.params.id, userId) as { id: string; namespace: string; content: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });

  await db.prepare(`DELETE FROM user_memories WHERE id = ? AND user_id = ?`).run(req.params.id, userId);
  await auditLog(userId, 'delete_item', {
    namespace: row.namespace,
    itemId: row.id,
    description: `Deleted: ${row.content.slice(0, 80)}`,
  });
  res.status(204).end();
});

// ─── Soft reset — mark namespace stale ───────────────────────────────────────

memoryRouter.post('/soft-reset', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { namespace } = req.body ?? {};
  if (!namespace || !['episodic', 'semantic', 'procedural', 'all'].includes(namespace)) {
    return res.status(400).json({ error: 'namespace required (episodic|semantic|procedural|all)' });
  }

  const nsFilter = namespace === 'all' ? `namespace IN ('episodic','semantic','procedural')` : `namespace = '${namespace}'`;
  const result = await db
    .prepare(`UPDATE user_memories SET is_stale = TRUE, updated_at = NOW() WHERE user_id = ? AND ${nsFilter} AND is_stale = FALSE`)
    .run(userId);

  await auditLog(userId, 'soft_reset', {
    namespace,
    description: `Soft reset ${namespace}: ${result.changes} entries marked stale`,
  });
  res.json({ ok: true, affected: result.changes });
});

// ─── Hard reset — purge namespace entirely ────────────────────────────────────

memoryRouter.post('/hard-reset', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { namespace } = req.body ?? {};
  if (!namespace || !['episodic', 'semantic', 'procedural', 'all'].includes(namespace)) {
    return res.status(400).json({ error: 'namespace required (episodic|semantic|procedural|all)' });
  }

  const nsFilter = namespace === 'all' ? `namespace IN ('episodic','semantic','procedural')` : `namespace = '${namespace}'`;
  const result = await db
    .prepare(`DELETE FROM user_memories WHERE user_id = ? AND ${nsFilter}`)
    .run(userId);

  await auditLog(userId, 'hard_reset', {
    namespace,
    description: `Hard reset ${namespace}: ${result.changes} entries purged`,
  });
  res.json({ ok: true, purged: result.changes });
});

// ─── Audit log ────────────────────────────────────────────────────────────────

memoryRouter.get('/audit', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare(`SELECT * FROM memory_audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`)
    .all(userId);
  res.json(rows);
});

// ─── Trends ───────────────────────────────────────────────────────────────────

memoryRouter.get('/trends', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare(`SELECT * FROM memory_trends WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`)
    .all(userId);
  res.json(rows);
});

// ─── Trigger weekly analysis (Enhancement 3) ─────────────────────────────────

memoryRouter.post('/analyze', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  // Run async; return immediately with job ID
  setImmediate(() => runMemoryAnalysis(userId).catch(console.error));
  res.json({ ok: true, message: 'Memory analysis queued' });
});
