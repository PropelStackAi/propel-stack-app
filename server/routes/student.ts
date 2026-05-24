// ─── Student Mode Routes ──────────────────────────────────────────────────────
// Session 14 (Bug Fix) — Propel Stack AI, LLC
//
// Tabs: AI Tutor (Socratic only) | Flashcards (SM-2) | Courses | Writing | Resources

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';

export const studentRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ─── AI helper ────────────────────────────────────────────────────────────────

async function callAI(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens = 800,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((c) => c.type === 'text')?.text ?? '';
}

// ─── AI Tutor system prompt (Socratic — NEVER writes for the student) ─────────

const TUTOR_SYSTEM_PROMPT = `You are a Socratic AI tutor for Propel Stack AI. Your mission is to help students understand material deeply — never to do the work for them.

ABSOLUTE RULES:
1. NEVER write essays, papers, or any academic assignment the student would submit as their own. If asked, explain why and redirect to guidance.
2. NEVER give direct answers to test or homework questions. Instead ask questions that scaffold the student's thinking toward the answer.
3. NEVER complete coding assignments. You may explain concepts, point out bugs, and ask leading questions — nothing more.
4. ALWAYS use the Socratic method: ask questions, check understanding, scaffold reasoning step by step.
5. You CAN: explain concepts in plain language, clarify confusing material, break down complex problems, quiz the student on what they know, suggest study strategies, recommend resources, and celebrate progress.
6. Be encouraging, patient, and kind. If a student expresses frustration, burnout, or anxiety, acknowledge feelings before moving to content.
7. Keep replies concise and conversational — this is a tutoring dialogue, not a lecture. Aim for 100–250 words per response.
8. End each response with one focused question or prompt that advances the student's thinking.

OPENING MOVE: If a student's first message doesn't state what they're working on, ask "What are you working on today, and what have you tried so far?"`;

// ─── POST /api/student/tutor ──────────────────────────────────────────────────

studentRouter.post('/tutor', async (req, res) => {
  try {
    const { messages, subject } = req.body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      subject?: string;
    };
    if (!messages?.length) return res.status(400).json({ error: 'messages required' });

    const system = subject
      ? `${TUTOR_SYSTEM_PROMPT}\n\nThe student is currently studying: ${subject}`
      : TUTOR_SYSTEM_PROMPT;

    const reply = await callAI(system, messages);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Courses ──────────────────────────────────────────────────────────────────

studentRouter.get('/courses', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare('SELECT * FROM student_courses WHERE user_id = ? ORDER BY status, name')
      .all(userId);
    res.json({ courses: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.post('/courses', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, code, instructor, credits, status, grade, color, notes, start_date, end_date } =
      req.body as Record<string, string>;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const id = randomUUID();
    await db
      .prepare(
        `INSERT INTO student_courses
          (id, user_id, name, code, instructor, credits, status, grade, color, notes, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id, userId,
        name.trim(),
        code?.trim() ?? '',
        instructor?.trim() ?? '',
        Number(credits) || 3,
        status ?? 'active',
        grade?.trim() ?? '',
        color ?? '#4F35C2',
        notes?.trim() ?? '',
        start_date || null,
        end_date || null,
      );
    const row = await db.prepare('SELECT * FROM student_courses WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.patch('/courses/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, code, instructor, credits, status, grade, color, notes, start_date, end_date } =
      req.body as Record<string, string>;
    await db
      .prepare(
        `UPDATE student_courses
         SET name=?, code=?, instructor=?, credits=?, status=?, grade=?, color=?, notes=?,
             start_date=?, end_date=?
         WHERE id=? AND user_id=?`,
      )
      .run(
        name?.trim() ?? '',
        code?.trim() ?? '',
        instructor?.trim() ?? '',
        Number(credits) || 3,
        status ?? 'active',
        grade?.trim() ?? '',
        color ?? '#4F35C2',
        notes?.trim() ?? '',
        start_date || null,
        end_date || null,
        req.params.id, userId,
      );
    const row = await db.prepare('SELECT * FROM student_courses WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.delete('/courses/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db
      .prepare('DELETE FROM student_courses WHERE id = ? AND user_id = ?')
      .run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Flashcard Decks ──────────────────────────────────────────────────────────

studentRouter.get('/decks', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const today = new Date().toISOString().slice(0, 10);
    const decks = await db
      .prepare('SELECT * FROM flashcard_decks WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Record<string, unknown>[];

    const enriched = await Promise.all(
      decks.map(async (deck) => {
        const { n: card_count } = await db
          .prepare('SELECT COUNT(*) as n FROM flashcards WHERE deck_id = ?')
          .get(deck.id as string) as { n: number };
        const { n: due_count } = await db
          .prepare(
            "SELECT COUNT(*) as n FROM flashcards WHERE deck_id = ? AND (next_due = '' OR next_due <= ?)",
          )
          .get(deck.id as string, today) as { n: number };
        return { ...deck, card_count, due_count };
      }),
    );
    res.json({ decks: enriched });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.post('/decks', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, subject, description } = req.body as Record<string, string>;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const id = randomUUID();
    await db
      .prepare('INSERT INTO flashcard_decks (id, user_id, name, subject, description) VALUES (?, ?, ?, ?, ?)')
      .run(id, userId, name.trim(), subject?.trim() ?? '', description?.trim() ?? '');
    const row = await db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(id);
    res.status(201).json({ ...row, card_count: 0, due_count: 0 });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.delete('/decks/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db
      .prepare('DELETE FROM flashcard_decks WHERE id = ? AND user_id = ?')
      .run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Flashcards ───────────────────────────────────────────────────────────────

studentRouter.get('/decks/:deckId/cards', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const cards = await db
      .prepare(
        'SELECT * FROM flashcards WHERE deck_id = ? AND user_id = ? ORDER BY next_due, created_at',
      )
      .all(req.params.deckId, userId);
    res.json({ cards });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Due cards across all decks (review session entry point)
studentRouter.get('/cards/due', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const today = new Date().toISOString().slice(0, 10);
    const cards = await db
      .prepare(
        "SELECT f.*, d.name as deck_name, d.subject as deck_subject FROM flashcards f JOIN flashcard_decks d ON d.id = f.deck_id WHERE f.user_id = ? AND (f.next_due = '' OR f.next_due <= ?) ORDER BY f.next_due, f.created_at LIMIT 50",
      )
      .all(userId, today);
    res.json({ cards });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.post('/decks/:deckId/cards', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { front, back } = req.body as { front: string; back: string };
    if (!front?.trim() || !back?.trim())
      return res.status(400).json({ error: 'front and back required' });
    const id = randomUUID();
    await db
      .prepare(
        'INSERT INTO flashcards (id, deck_id, user_id, front, back) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, req.params.deckId, userId, front.trim(), back.trim());
    const row = await db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// SM-2 review: quality 0-5 (0=blackout, 3=correct with effort, 5=perfect)
studentRouter.post('/cards/:id/review', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { quality } = req.body as { quality: number };
    if (quality === undefined || quality === null)
      return res.status(400).json({ error: 'quality required' });

    const card = await db
      .prepare('SELECT * FROM flashcards WHERE id = ? AND user_id = ?')
      .get(req.params.id, userId) as {
        id: string;
        ease_factor: number;
        interval_days: number;
        repetitions: number;
      } | undefined;
    if (!card) return res.status(404).json({ error: 'Card not found' });

    let { ease_factor, interval_days, repetitions } = card;
    const q = Math.max(0, Math.min(5, Math.round(quality)));

    if (q < 3) {
      // Incorrect — reset repetitions, review again tomorrow
      repetitions = 0;
      interval_days = 1;
    } else {
      // Correct — apply SM-2
      if (repetitions === 0) interval_days = 1;
      else if (repetitions === 1) interval_days = 6;
      else interval_days = Math.round(interval_days * ease_factor);
      ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
      repetitions += 1;
    }

    const due = new Date();
    due.setDate(due.getDate() + interval_days);
    const next_due = due.toISOString().slice(0, 10);

    await db
      .prepare(
        'UPDATE flashcards SET ease_factor=?, interval_days=?, repetitions=?, next_due=? WHERE id=?',
      )
      .run(ease_factor, interval_days, repetitions, next_due, card.id);

    res.json({ ok: true, next_due, interval_days, ease_factor });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.delete('/cards/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db
      .prepare('DELETE FROM flashcards WHERE id = ? AND user_id = ?')
      .run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Student Notes (Writing) ──────────────────────────────────────────────────

studentRouter.get('/notes', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const type = req.query.type as string | undefined;
    const where = type ? 'WHERE user_id = ? AND doc_type = ?' : 'WHERE user_id = ?';
    const params = type ? [userId, type] : [userId];
    const rows = await db
      .prepare(`SELECT * FROM student_notes ${where} ORDER BY updated_at DESC`)
      .all(...params);
    res.json({ notes: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.post('/notes', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { title, content, doc_type, course_id } = req.body as Record<string, string>;
    const id = randomUUID();
    const wordCount = (content ?? '').trim().split(/\s+/).filter(Boolean).length;
    await db
      .prepare(
        `INSERT INTO student_notes (id, user_id, title, content, doc_type, course_id, word_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id, userId,
        title?.trim() || 'Untitled',
        content ?? '',
        doc_type ?? 'notes',
        course_id || null,
        wordCount,
      );
    const row = await db.prepare('SELECT * FROM student_notes WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.patch('/notes/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { title, content, doc_type, course_id } = req.body as Record<string, string>;
    const wordCount = (content ?? '').trim().split(/\s+/).filter(Boolean).length;
    await db
      .prepare(
        `UPDATE student_notes
         SET title=?, content=?, doc_type=?, course_id=?, word_count=?, updated_at=NOW()
         WHERE id=? AND user_id=?`,
      )
      .run(
        title?.trim() || 'Untitled',
        content ?? '',
        doc_type ?? 'notes',
        course_id || null,
        wordCount,
        req.params.id, userId,
      );
    const row = await db.prepare('SELECT * FROM student_notes WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.delete('/notes/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db
      .prepare('DELETE FROM student_notes WHERE id = ? AND user_id = ?')
      .run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Resources Library ────────────────────────────────────────────────────────

studentRouter.get('/resources', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const type = req.query.type as string | undefined;
    const where = type ? 'WHERE user_id = ? AND source_type = ?' : 'WHERE user_id = ?';
    const params = type ? [userId, type] : [userId];
    const rows = await db
      .prepare(`SELECT * FROM student_resources ${where} ORDER BY created_at DESC`)
      .all(...params);
    res.json({ resources: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.post('/resources', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { title, url, authors, year, summary, tags, source_type } =
      req.body as Record<string, string>;
    if (!title?.trim()) return res.status(400).json({ error: 'title required' });
    const id = randomUUID();
    const tagArr = tags
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    await db
      .prepare(
        `INSERT INTO student_resources (id, user_id, title, url, authors, year, summary, tags, source_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id, userId,
        title.trim(),
        url?.trim() ?? '',
        authors?.trim() ?? '',
        year?.trim() ?? '',
        summary?.trim() ?? '',
        JSON.stringify(tagArr),
        source_type ?? 'article',
      );
    const row = await db.prepare('SELECT * FROM student_resources WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

studentRouter.delete('/resources/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db
      .prepare('DELETE FROM student_resources WHERE id = ? AND user_id = ?')
      .run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
