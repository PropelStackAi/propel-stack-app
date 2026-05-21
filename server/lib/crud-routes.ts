import { Router, type Request, type Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { db, getCurrentUserId } from '../db.js';
import { newId } from './financial.js';

/**
 * Small generic per-user CRUD router for flat tables, to keep the financial routes
 * compact and consistent. Synchronous sql.js access throughout (HARD RULE #5).
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

  r.get('/', (_req: Request, res: Response) => {
    const userId = getCurrentUserId();
    const rows = db
      .prepare(`SELECT * FROM ${cfg.table} WHERE user_id = ? ORDER BY ${order}`)
      .all(userId) as Record<string, unknown>[];
    res.json(rows.map(cfg.mapRow));
  });

  r.post('/', (req: Request, res: Response) => {
    const userId = getCurrentUserId();
    const parsed = cfg.schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

    const id = newId();
    const colList = ['id', 'user_id', ...cfg.columns];
    const placeholders = colList.map((c) => `@${c}`).join(', ');
    db.prepare(`INSERT INTO ${cfg.table} (${colList.join(', ')}) VALUES (${placeholders})`).run({
      id,
      user_id: userId,
      ...cfg.toRow(parsed.data as Record<string, unknown>),
    });
    const row = db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ? AND user_id = ?`).get(id, userId) as Record<string, unknown>;
    res.status(201).json(cfg.mapRow(row));
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const userId = getCurrentUserId();
    const id = req.params.id as string;
    const exists = db.prepare(`SELECT id FROM ${cfg.table} WHERE id = ? AND user_id = ?`).get(id, userId);
    if (!exists) return res.status(404).json({ error: 'Not found' });

    const parsed = cfg.schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

    const setClause = cfg.columns
      .map((c) => `${c}=@${c}`)
      .concat(cfg.touchUpdatedAt ? ["updated_at=datetime('now')"] : [])
      .join(', ');
    db.prepare(`UPDATE ${cfg.table} SET ${setClause} WHERE id=@id AND user_id=@user_id`).run({
      id,
      user_id: userId,
      ...cfg.toRow(parsed.data as Record<string, unknown>),
    });
    const row = db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(id) as Record<string, unknown>;
    res.json(cfg.mapRow(row));
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const userId = getCurrentUserId();
    const result = db.prepare(`DELETE FROM ${cfg.table} WHERE id = ? AND user_id = ?`).run(req.params.id as string, userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });

  return r;
}
