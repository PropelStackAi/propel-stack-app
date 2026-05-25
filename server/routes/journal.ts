// ─── Mood & Journal Hub ───────────────────────────────────────────────────────
// Session 14 Enhancement 4 — Propel Stack AI, LLC

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import { complete } from '../ai-gateway.js';

export const journalRouter = Router();

const MOOD_LABELS: Record<number, string> = { 1: 'terrible', 2: 'bad', 3: 'okay', 4: 'good', 5: 'great' };
const MOOD_EMOJIS: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };

// Reflection prompts library (including ADHD/anxiety-specific)
const REFLECTION_PROMPTS = [
  "What's one thing that went well today, no matter how small?",
  "What's weighing on your mind right now?",
  "What would make tomorrow 10% better?",
  "What are you grateful for in this moment?",
  "What did you learn about yourself today?",
  "What's one thing you want to let go of today?",
  "What energy do you want to bring tomorrow?",
  "What helped you feel most like yourself today?",
];

function getReflectionPrompt(moodScore: number): string {
  if (moodScore <= 2) return "What's one small thing that could help you feel a little better right now?";
  if (moodScore >= 4) return REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)];
  return REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)];
}

// ─── GET /api/journal — list recent entries (no content for privacy) ──────────
journalRouter.get('/', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare('SELECT id, entry_date, mood_score, mood_label, tags, created_at FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC LIMIT 60')
    .all(userId);
  res.json(rows);
});

// ─── POST /api/journal — create entry ────────────────────────────────────────
journalRouter.post('/', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { mood_score = 3, content = '', tags = [], ai_opted_in = false } = req.body ?? {};
  const moodLabel = MOOD_LABELS[mood_score] ?? 'okay';
  const prompt = getReflectionPrompt(mood_score);
  const entryDate = new Date().toISOString().slice(0, 10);

  let aiReflection = '';
  let tokensUsed = 0;

  if (ai_opted_in && content) {
    try {
      const result = complete({
        model: 'claude-haiku-4-5',
        system: 'You are a warm, empathetic journaling companion. Give a brief, supportive reflection (2-3 sentences). Never diagnose or give clinical advice.',
        messages: [{ role: 'user', content: `Mood: ${moodLabel} (${mood_score}/5). Journal entry: "${content}"` }],
        maxTokens: 200,
      });
      aiReflection = result.text.trim();
      tokensUsed = result.inputTokens + result.outputTokens;
    } catch { /* no reflection */ }
  }

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO journal_entries (id, user_id, entry_date, mood_score, mood_label, content, ai_prompt_used, ai_reflection, tags, is_private, ai_opted_in)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)
  `).run(id, userId, entryDate, mood_score, moodLabel, content, prompt, aiReflection, JSON.stringify(tags), ai_opted_in);

  res.status(201).json({ id, mood_label: moodLabel, mood_emoji: MOOD_EMOJIS[mood_score], ai_reflection: aiReflection, reflection_prompt: prompt, tokens_used: tokensUsed });
});

// ─── GET /api/journal/:id — single entry (full content) ──────────────────────
journalRouter.get('/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const row = await db.prepare('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?').get(req.params.id, userId) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({ ...row, mood_emoji: MOOD_EMOJIS[row.mood_score as number] });
});

// ─── DELETE /api/journal/:id ──────────────────────────────────────────────────
journalRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  await db.prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ ok: true });
});

// ─── GET /api/journal/mood-trend — 30-day mood history ───────────────────────
journalRouter.get('/trend/mood', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare('SELECT entry_date, mood_score, mood_label FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC LIMIT 30')
    .all(userId);
  res.json(rows.reverse());
});

// ─── GET /api/journal/insights — AI mood pattern insights ────────────────────
journalRouter.get('/insights/list', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare('SELECT * FROM mood_insights WHERE user_id = ? ORDER BY insight_date DESC LIMIT 20')
    .all(userId);

  // Generate new insights if none exist or last was >7 days ago
  const lastDate = rows[0]?.insight_date as string | undefined;
  const stale = !lastDate || (Date.now() - new Date(lastDate).getTime()) > 7 * 86400000;

  if (stale) {
    const entries = await db
      .prepare('SELECT entry_date, mood_score, mood_label FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC LIMIT 30')
      .all(userId);

    if (entries.length >= 5) {
      try {
        const result = complete({
          model: 'claude-haiku-4-5',
          system: 'Analyze mood journal data and identify 2-3 patterns. Respond with JSON array: [{"type":"pattern|trigger|trend","content":"string"}]',
          messages: [{ role: 'user', content: JSON.stringify(entries) }],
          maxTokens: 300,
        });
        const insights = JSON.parse(result.text) as Array<{ type: string; content: string }>;
        const insightDate = new Date().toISOString().slice(0, 10);
        for (const ins of insights.slice(0, 3)) {
          await db.prepare('INSERT INTO mood_insights (id, user_id, insight_date, insight_type, content) VALUES (?, ?, ?, ?, ?)').run(randomUUID(), userId, insightDate, ins.type ?? 'pattern', ins.content ?? '');
        }
        return res.json(await db.prepare('SELECT * FROM mood_insights WHERE user_id = ? ORDER BY insight_date DESC LIMIT 20').all(userId));
      } catch { /* return existing */ }
    }
  }

  res.json(rows);
});

// ─── GET /api/journal/prompt — get AI reflection prompt ──────────────────────
journalRouter.get('/prompt/:mood', async (req: Request, res: Response) => {
  const mood = Number(req.params.mood) || 3;
  res.json({ prompt: getReflectionPrompt(mood), emoji: MOOD_EMOJIS[mood] ?? '😐', label: MOOD_LABELS[mood] ?? 'okay' });
});
