import { Router, type Request, type Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { db, getCurrentUserId } from '../db.js';
import { newId } from './financial.js';

/**
 * Small generic per-user CRUD router for flat tables, to keep the financial routes
 * compact and consistent.
 */
export interface CrudConfig {
  table: string;
  /** snake_case insertable/updatable columns (excludes id, user_id, created_at). */
  columns: string[];
  /** map validated (camelCase) input -> snake-cased column values. */
  toRow: (data: Record<string, unknown>) => Record<string, unknown>;
  /** map a DB row -> API shape. */
  mapRow: (row: Record<string, unknown>) => unknown;
  schema: ZodTypeAny;
  orderBy?: string;
  touchUpdatedAt?: boolean;
}

export function crudRouter(cfg: CrudConfig): Router {
  const r = Router();
  const order = cfg.orderBy ?? 'created_at DESC';

  r.get('/', async (_req: Request, res: Response) => {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare(`SELECT * FROM ${cfg.table} WHERE user_id = ? ORDER BY ${order}`)
      .all(userId);
    res.json(rows.map(cfg.mapRow));
  });

  r.post('/', async (req: Request, res: Response) => {
    const userId = getCurrentUserId();
    const parsed = cfg.schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

    const id = newId();
    const colList = ['id', 'user_id', ...cfg.columns];
    const placeholders = colList.map((c) => `@${c}`).join(', ');
    await db.prepare(`INSERT INTO ${cfg.table} (${colList.join(', ')}) VALUES (${placeholders})`).run({
      id,
      user_id: userId,
      ...cfg.toRow(parsed.data as Record<string, unknown>),
    });
    const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ? AND user_id = ?`).get(id, userId);
    res.status(201).json(cfg.mapRow(row as Record<string, unknown>));
  });

  r.patch('/:id', async (req: Request, res: Response) => {
    const userId = getCurrentUserId();
    const id = req.params.id as string;
    const exists = await db.prepare(`SELECT id FROM ${cfg.table} WHERE id = ? AND user_id = ?`).get(id, userId);
    if (!exists) return res.status(404).json({ error: 'Not found' });

    const parsed = cfg.schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

    const setClause = cfg.columns
      .map((c) => `${c}=@${c}`)
      .concat(cfg.touchUpdatedAt ? ['updated_at=NOW()'] : [])
      .join(', ');
    await db.prepare(`UPDATE ${cfg.table} SET ${setClause} WHERE id=@id AND user_id=@user_id`).run({
      id,
      user_id: userId,
      ...cfg.toRow(parsed.data as Record<string, unknown>),
    });
    const row = await db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(id);
    res.json(cfg.mapRow(row as Record<string, unknown>));
  });

  r.delete('/:id', async (req: Request, res: Response) => {
    const userId = getCurrentUserId();
    const result = await db.prepare(`DELETE FROM ${cfg.table} WHERE id = ? AND user_id = ?`).run(req.params.id as string, userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });

  return r;
}
