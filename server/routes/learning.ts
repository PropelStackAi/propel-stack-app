// ─── Learning Hub Routes ──────────────────────────────────────────────────────
// Enhancement 20 — Propel Stack AI, LLC
// Tracks books, courses, podcasts, certifications, articles.
// AI features: article summary (1 sentence), key takeaway extractor (3 insights).

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

export const learningRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

async function callAI(system: string, user: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Items (books, courses, podcasts, certifications, articles) ───────────────

// GET /api/learning/items
learningRouter.get('/items', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { type, status } = req.query;

    let sql = 'SELECT * FROM learning_items WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (status) { sql += ' AND status = ?'; params.push(status); }

    sql += ' ORDER BY created_at DESC';

    const rows = await db.prepare(sql).all(...params);
    res.json({ items: rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/learning/items
learningRouter.post('/items', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const {
      type, title, author, platform, url, status,
      total_pages, tags, notes, key_takeaway,
      exam_date, study_hours_logged, pass_fail,
    } = req.body as Record<string, unknown>;

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO learning_items
        (id, user_id, type, title, author, platform, url, status,
         total_pages, tags, notes, key_takeaway, exam_date, study_hours_logged, pass_fail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, userId,
      type ?? 'book', title, author ?? '', platform ?? '', url ?? '',
      status ?? 'to-read',
      total_pages ?? null, tags ?? '', notes ?? '', key_takeaway ?? '',
      exam_date ?? null, study_hours_logged ?? 0, pass_fail ?? null,
    );

    const row = await db.prepare('SELECT * FROM learning_items WHERE id = ?').get(id);
    res.json({ item: row });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// PATCH /api/learning/items/:id
learningRouter.patch('/items/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params;
    const fields = req.body as Record<string, unknown>;

    const existing = await db
      .prepare('SELECT id FROM learning_items WHERE id = ? AND user_id = ?')
      .get(id, userId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const allowed = [
      'title', 'author', 'platform', 'url', 'status', 'progress',
      'total_pages', 'tags', 'notes', 'key_takeaway', 'exam_date',
      'study_hours_logged', 'pass_fail', 'completed_at',
    ];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in fields) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length > 0) {
      values.push(id, userId);
      await db
        .prepare(`UPDATE learning_items SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
        .run(...values);
    }

    const row = await db.prepare('SELECT * FROM learning_items WHERE id = ?').get(id);
    res.json({ item: row });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// DELETE /api/learning/items/:id
learningRouter.delete('/items/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params;
    await db
      .prepare('DELETE FROM learning_items WHERE id = ? AND user_id = ?')
      .run(id, userId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Session logs ─────────────────────────────────────────────────────────────

// POST /api/learning/logs — log a reading/study session
learningRouter.post('/logs', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { item_id, duration_minutes, pages_read, notes, logged_date } = req.body as Record<string, unknown>;

    // Verify ownership and get item details for progress update
    const item = await db
      .prepare('SELECT id, type, progress, total_pages FROM learning_items WHERE id = ? AND user_id = ?')
      .get(item_id as string, userId) as { id: string; type: string; progress: number; total_pages: number | null } | undefined;

    if (!item) return res.status(404).json({ error: 'Item not found' });

    const logId = randomUUID();
    await db.prepare(`
      INSERT INTO learning_logs (id, user_id, item_id, duration_minutes, pages_read, notes, logged_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId, userId, item_id,
      duration_minutes ?? 0, pages_read ?? 0, notes ?? '',
      logged_date ?? today(),
    );

    // Auto-update book progress if pages_read was supplied
    if (pages_read && Number(pages_read) > 0 && item.type === 'book') {
      const newProgress = (item.progress ?? 0) + Number(pages_read);
      const isFinished = item.total_pages && newProgress >= item.total_pages;
      const setClauses = isFinished
        ? "progress = ?, status = 'finished', completed_at = ?"
        : 'progress = ?';
      const setVals = isFinished
        ? [newProgress, today(), item_id as string, userId]
        : [newProgress, item_id as string, userId];
      await db
        .prepare(`UPDATE learning_items SET ${setClauses} WHERE id = ? AND user_id = ?`)
        .run(...setVals);
    }

    res.json({ ok: true, log_id: logId });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Monthly summary ──────────────────────────────────────────────────────────

// GET /api/learning/summary
learningRouter.get('/summary', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [booksFinished, coursesCompleted, studyTime, pagesRead, articles, weeklyActivity, reading] =
      await Promise.all([
        db.prepare(`SELECT COUNT(*) as count FROM learning_items WHERE user_id = ? AND type = 'book' AND status = 'finished' AND completed_at >= ?`).get(userId, monthStart) as Promise<{ count: number }>,
        db.prepare(`SELECT COUNT(*) as count FROM learning_items WHERE user_id = ? AND type = 'course' AND status = 'completed' AND completed_at >= ?`).get(userId, monthStart) as Promise<{ count: number }>,
        db.prepare(`SELECT COALESCE(SUM(duration_minutes), 0) as total FROM learning_logs WHERE user_id = ? AND logged_date >= ?`).get(userId, monthStart) as Promise<{ total: number }>,
        db.prepare(`SELECT COALESCE(SUM(pages_read), 0) as total FROM learning_logs WHERE user_id = ? AND logged_date >= ?`).get(userId, monthStart) as Promise<{ total: number }>,
        db.prepare(`SELECT COUNT(*) as count FROM learning_items WHERE user_id = ? AND type = 'article' AND created_at >= ?`).get(userId, monthStart) as Promise<{ count: number }>,
        db.prepare(`SELECT COUNT(*) as count FROM learning_logs WHERE user_id = ? AND logged_date >= ?`).get(userId, weekAgo) as Promise<{ count: number }>,
        db.prepare(`SELECT * FROM learning_items WHERE user_id = ? AND type = 'book' AND status = 'reading' ORDER BY created_at DESC LIMIT 3`).all(userId),
      ]);

    // Reading speed: pages_read in last 7 days / 7
    const weeklyPages = await db
      .prepare(`SELECT COALESCE(SUM(pages_read), 0) as total FROM learning_logs WHERE user_id = ? AND logged_date >= ?`)
      .get(userId, weekAgo) as { total: number };
    const pagesPerDay = Math.round(weeklyPages.total / 7);

    res.json({
      books_finished: (booksFinished as { count: number }).count,
      courses_completed: (coursesCompleted as { count: number }).count,
      study_minutes: (studyTime as { total: number }).total,
      pages_read_month: (pagesRead as { total: number }).total,
      articles_saved: (articles as { count: number }).count,
      currently_reading: reading,
      life_score_active: (weeklyActivity as { count: number }).count > 0,
      pages_per_day: pagesPerDay,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── AI features ──────────────────────────────────────────────────────────────

// POST /api/learning/article-summary — 1-sentence AI summary
const SUMMARY_SYSTEM = `You are a knowledge assistant. Given a URL or article text, write exactly one punchy sentence (max 20 words) summarising the core insight. Return ONLY that sentence — no preamble, no period at the end.`;

learningRouter.post('/article-summary', async (req, res) => {
  try {
    const { url, text } = req.body as { url?: string; text?: string };
    if (!url && !text) return res.status(400).json({ error: 'url or text required' });
    const input = text
      ? `Article text:\n${text.slice(0, 2000)}`
      : `Article URL: ${url}`;
    const summary = await callAI(SUMMARY_SYSTEM, input);
    res.json({ summary: summary.trim() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/learning/takeaways — extract 3 key insights from pasted notes
const TAKEAWAY_SYSTEM = `You are a learning coach. Given raw notes or highlights from a book, article, or course, extract exactly 3 key actionable insights. Return a JSON array with exactly 3 strings: ["insight 1", "insight 2", "insight 3"]. Keep each insight under 25 words and make it concrete. Return ONLY the JSON array, no other text.`;

learningRouter.post('/takeaways', async (req, res) => {
  try {
    const { notes } = req.body as { notes?: string };
    if (!notes) return res.status(400).json({ error: 'notes required' });
    const raw = await callAI(TAKEAWAY_SYSTEM, `Notes/highlights:\n${notes.slice(0, 3000)}`);
    let takeaways: string[] = [];
    try {
      takeaways = JSON.parse(raw);
    } catch {
      // Fallback: split by newlines if JSON parse fails
      takeaways = raw.split('\n').filter(Boolean).slice(0, 3);
    }
    res.json({ takeaways });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
