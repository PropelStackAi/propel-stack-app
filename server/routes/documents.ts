import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { complete } from '../ai-gateway.js';
import { logActivity } from '../lib/dashboard.js';
import {
  ACCEPTED_TYPES,
  newId,
  rowToDocumentFull,
  rowToDocumentMeta,
  shareToken,
  updateSchema,
  uploadSchema,
} from '../lib/documents.js';

/**
 * Document Vault API (Session 7). Synchronous sql.js (HARD RULE #5).
 * Files are stored as base64 in the DB (local fallback) until Session 8 (Supabase Storage).
 */
export const documentsRouter = Router();

const META_COLS = 'id, title, category, file_name, file_type, file_size, expiry_date, tags, ai_summary, created_at';

function getDoc(id: string, userId: string) {
  return db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId) as Record<string, unknown> | undefined;
}

// ---- Public share download (no auth; token-scoped). Must precede /:id. ----
documentsRouter.get('/shared/:token', (req: Request, res: Response) => {
  const token = req.params.token as string;
  const share = db.prepare('SELECT * FROM document_shares WHERE token = ?').get(token) as
    | { document_id: string; expires_at: string }
    | undefined;
  if (!share) return res.status(404).send('Share link not found.');
  if (new Date(share.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM document_shares WHERE token = ?').run(token);
    return res.status(410).send('This share link has expired.');
  }
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(share.document_id) as Record<string, unknown> | undefined;
  if (!doc) return res.status(404).send('Document not found.');
  const buf = Buffer.from(String(doc.data), 'base64');
  res.setHeader('Content-Type', (doc.file_type as string) || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${(doc.file_name as string) || 'document'}"`);
  res.send(buf);
});

// ---- Expiring soon (for dashboard). Must precede /:id. ----
documentsRouter.get('/meta/expiring', (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const cutoff = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const rows = db
    .prepare(`SELECT ${META_COLS} FROM documents WHERE user_id = ? AND expiry_date IS NOT NULL AND expiry_date != '' AND expiry_date <= ? ORDER BY expiry_date ASC`)
    .all(userId, cutoff) as Record<string, unknown>[];
  res.json(rows.map(rowToDocumentMeta));
});

// ---- List (metadata only) ----
documentsRouter.get('/', (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = db.prepare(`SELECT ${META_COLS} FROM documents WHERE user_id = ? ORDER BY created_at DESC`).all(userId) as Record<string, unknown>[];
  res.json(rows.map(rowToDocumentMeta));
});

// ---- Upload ----
documentsRouter.post('/', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid upload', details: parsed.error.flatten() });
  if (parsed.data.fileType && !ACCEPTED_TYPES.includes(parsed.data.fileType)) {
    return res.status(400).json({ error: 'Unsupported file type. Use PDF, JPG, PNG, or DOCX.' });
  }
  const id = newId();
  const d = parsed.data;
  db.prepare(
    `INSERT INTO documents (id, user_id, title, category, file_name, file_type, file_size, data, expiry_date, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, d.title, d.category, d.fileName, d.fileType, d.fileSize, d.data, d.expiryDate, JSON.stringify(d.tags));
  logActivity(userId, 'document', `Uploaded document: ${d.title}`);
  res.status(201).json(rowToDocumentMeta(getDoc(id, userId) as Record<string, unknown>));
});

// ---- Get full (with data) ----
documentsRouter.get('/:id', (req: Request, res: Response) => {
  const doc = getDoc(req.params.id as string, getCurrentUserId());
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(rowToDocumentFull(doc));
});

// ---- Update metadata ----
documentsRouter.patch('/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  if (!getDoc(id, userId)) return res.status(404).json({ error: 'Not found' });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid update' });
  const d = parsed.data;
  db.prepare('UPDATE documents SET title = ?, category = ?, expiry_date = ?, tags = ? WHERE id = ? AND user_id = ?').run(
    d.title, d.category, d.expiryDate, JSON.stringify(d.tags), id, userId,
  );
  res.json(rowToDocumentMeta(getDoc(id, userId) as Record<string, unknown>));
});

// ---- Delete ----
documentsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ---- AI summary (gateway; PDF text extraction + real model arrive with provider wiring) ----
documentsRouter.post('/:id/summarize', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  const doc = getDoc(id, userId);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const result = complete({
    prompt: `Summarize the document titled "${doc.title}" in the ${doc.category} category in 2-3 sentences.`,
    mode: 'general',
  });
  db.prepare('UPDATE documents SET ai_summary = ? WHERE id = ?').run(result.text, id);
  res.json({ aiSummary: result.text, stub: result.stub });
});

// ---- Time-limited share link (24h) ----
documentsRouter.post('/:id/share', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  if (!getDoc(id, userId)) return res.status(404).json({ error: 'Not found' });
  const token = shareToken();
  const expiresAt = new Date(Date.now() + 24 * 3_600_000).toISOString();
  db.prepare('INSERT INTO document_shares (token, document_id, user_id, expires_at) VALUES (?, ?, ?, ?)').run(token, id, userId, expiresAt);
  res.status(201).json({ token, path: `/api/documents/shared/${token}`, expiresAt });
});
