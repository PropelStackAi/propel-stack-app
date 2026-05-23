import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';

/**
 * Kids Zone API — Session 9.
 * COPPA Compliance:
 *   - No personal data collected on child profiles.
 *   - AI sessions log only: session_type + interaction_count — never message content.
 *   - No advertising, no behavioral tracking.
 * All AI responses use a hardcoded Socratic system prompt.
 * Screen time is enforced both client-side (countdown) and server-side (423).
 */
export const kidsRouter = Router();

// ── helpers ────────────────────────────────────────────────────────────────

function newId(): string {
  return `k_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const SOCRATIC_SYSTEM_PROMPT = `You are a friendly, patient AI tutor for children ages 5-12.
CRITICAL RULES — you must follow these exactly:
1. NEVER give direct answers to homework or factual questions. Always guide with questions.
2. NEVER discuss adult topics, violence, inappropriate content, or anything unsuitable for children.
3. NEVER mention real people, real brands, or anything that could cause harm.
4. Use simple words a child can understand. Be warm, encouraging, and playful.
5. If a child seems upset, respond with empathy and suggest talking to a trusted adult.
6. Keep responses short — under 100 words.
7. End every homework response with a guiding question, not an answer.
Example: Child says "What is 7x8?" → You say: "Great multiplication practice! What is 7 groups of 8? Try counting by 7s — what do you get?"`;

const STORY_SYSTEM_PROMPT = `You are a warm, imaginative storyteller for children ages 5-12.
RULES:
1. Create fun, age-appropriate adventure stories with a positive message.
2. No violence, scary content, or adult themes.
3. Keep stories under 200 words — clear, vivid, and exciting.
4. Always end with a short moral or a fun question for the child to think about.
5. Use the child's prompt as the story seed. Be creative and joyful!`;

// ── Get child profile (for Kids Zone header) ───────────────────────────────

kidsRouter.get('/profile/:childId', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const child = await db.prepare(
    `SELECT id, name, avatar_emoji, age_range, app_sections_approved
     FROM child_profiles WHERE id = ? AND parent_user_id = ?`,
  ).get(req.params.childId as string, userId);
  if (!child) return res.status(404).json({ error: 'Child profile not found' });
  res.json(child);
});

// ── Screen time status ──────────────────────────────────────────────────────

kidsRouter.get('/screen-time/:childId', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const childId = req.params.childId as string;
  const child = await db.prepare(
    'SELECT screen_time_limit_minutes FROM child_profiles WHERE id = ? AND parent_user_id = ?',
  ).get(childId, userId) as { screen_time_limit_minutes: number } | undefined;
  if (!child) return res.status(404).json({ error: 'Not found' });

  const today = new Date().toISOString().slice(0, 10);
  const row = await db.prepare(
    'SELECT minutes_used FROM child_screen_time WHERE child_profile_id = ? AND session_date = ?',
  ).get(childId, today) as { minutes_used: number } | undefined;

  const used = row?.minutes_used ?? 0;
  const limit = child.screen_time_limit_minutes;
  res.json({ usedMinutes: used, limitMinutes: limit, remainingMinutes: Math.max(0, limit - used), allowed: used < limit });
});

// ── Tick screen time (client calls every minute) ───────────────────────────

kidsRouter.post('/screen-time/:childId/tick', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const childId = req.params.childId as string;
  const { minutes = 1 } = req.body as { minutes?: number };

  if (!await db.prepare('SELECT id FROM child_profiles WHERE id = ? AND parent_user_id = ?').get(childId, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const tickId = newId();
  // Upsert: insert or add to existing minutes
  await db.prepare(`
    INSERT INTO child_screen_time (id, child_profile_id, session_date, minutes_used)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (child_profile_id, session_date)
    DO UPDATE SET minutes_used = child_screen_time.minutes_used + EXCLUDED.minutes_used, updated_at = NOW()
  `).run(tickId, childId, today, Math.max(1, Math.min(Number(minutes), 60)));

  res.json({ ok: true });
});

// ── Star rewards ────────────────────────────────────────────────────────────

kidsRouter.get('/stars/:childId', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const childId = req.params.childId as string;
  if (!await db.prepare('SELECT id FROM child_profiles WHERE id = ? AND parent_user_id = ?').get(childId, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const row = await db.prepare('SELECT total_stars FROM kids_stars WHERE child_profile_id = ?').get(childId) as
    | { total_stars: number }
    | undefined;
  res.json({ totalStars: row?.total_stars ?? 0 });
});

kidsRouter.post('/stars/:childId/award', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const childId = req.params.childId as string;
  const { stars = 1 } = req.body as { stars?: number };
  if (!await db.prepare('SELECT id FROM child_profiles WHERE id = ? AND parent_user_id = ?').get(childId, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const starId = newId();
  await db.prepare(`
    INSERT INTO kids_stars (id, child_profile_id, total_stars)
    VALUES (?, ?, ?)
    ON CONFLICT (child_profile_id)
    DO UPDATE SET total_stars = kids_stars.total_stars + EXCLUDED.total_stars, updated_at = NOW()
  `).run(starId, childId, Math.max(1, Math.min(Number(stars), 10)));

  const row = await db.prepare('SELECT total_stars FROM kids_stars WHERE child_profile_id = ?').get(childId) as
    | { total_stars: number }
    | undefined;
  res.json({ totalStars: row?.total_stars ?? 0 });
});

// ── Kid-safe AI: Homework helper (Socratic — never gives direct answers) ───

kidsRouter.post('/ai/homework', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { childId, prompt } = req.body as { childId?: string; prompt?: string };
  if (!childId || !prompt) return res.status(400).json({ error: 'childId and prompt required' });

  // Server-side screen time enforcement
  const childRow = await db.prepare(
    'SELECT screen_time_limit_minutes FROM child_profiles WHERE id = ? AND parent_user_id = ?',
  ).get(childId, userId) as { screen_time_limit_minutes: number } | undefined;
  if (!childRow) return res.status(404).json({ error: 'Child profile not found' });

  const today = new Date().toISOString().slice(0, 10);
  const timeRow = await db.prepare(
    'SELECT minutes_used FROM child_screen_time WHERE child_profile_id = ? AND session_date = ?',
  ).get(childId, today) as { minutes_used: number } | undefined;
  if ((timeRow?.minutes_used ?? 0) >= childRow.screen_time_limit_minutes) {
    return res.status(423).json({ error: 'Screen time limit reached. Ask a parent to add more time.' });
  }

  // Stub response (real model call wires in with API keys)
  const safePrompt = prompt.slice(0, 500);
  const stubText = buildKidStubAnswer('homework', safePrompt);

  // Log session type only — never the message content (COPPA)
  const childSettings = await db.prepare('SELECT ai_logging_enabled FROM child_profiles WHERE id = ?').get(childId) as
    | { ai_logging_enabled: number }
    | undefined;
  if (childSettings?.ai_logging_enabled) {
    await db.prepare(
      `INSERT INTO kids_ai_sessions (id, child_profile_id, session_type, interaction_count)
       VALUES (?, ?, 'homework', 1)`,
    ).run(newId(), childId);
  }

  res.json({ text: stubText, stub: true, systemPrompt: SOCRATIC_SYSTEM_PROMPT });
});

// ── Kid-safe AI: Story generator ────────────────────────────────────────────

kidsRouter.post('/ai/story', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { childId, prompt } = req.body as { childId?: string; prompt?: string };
  if (!childId || !prompt) return res.status(400).json({ error: 'childId and prompt required' });

  const childRow = await db.prepare(
    'SELECT screen_time_limit_minutes FROM child_profiles WHERE id = ? AND parent_user_id = ?',
  ).get(childId, userId) as { screen_time_limit_minutes: number } | undefined;
  if (!childRow) return res.status(404).json({ error: 'Child profile not found' });

  const today = new Date().toISOString().slice(0, 10);
  const timeRow = await db.prepare(
    'SELECT minutes_used FROM child_screen_time WHERE child_profile_id = ? AND session_date = ?',
  ).get(childId, today) as { minutes_used: number } | undefined;
  if ((timeRow?.minutes_used ?? 0) >= childRow.screen_time_limit_minutes) {
    return res.status(423).json({ error: 'Screen time limit reached. Ask a parent to add more time.' });
  }

  const safePrompt = prompt.slice(0, 300);
  const story = buildKidStubAnswer('story', safePrompt);

  const childSettings = await db.prepare('SELECT ai_logging_enabled FROM child_profiles WHERE id = ?').get(childId) as
    | { ai_logging_enabled: number }
    | undefined;
  if (childSettings?.ai_logging_enabled) {
    await db.prepare(
      `INSERT INTO kids_ai_sessions (id, child_profile_id, session_type, interaction_count)
       VALUES (?, ?, 'story', 1)`,
    ).run(newId(), childId);
  }

  res.json({ text: story, stub: true, systemPrompt: STORY_SYSTEM_PROMPT });
});

// ── TTS: text-to-speech for bedtime stories ─────────────────────────────────
// Returns audio as base64 if OpenAI key available; otherwise stub so client falls back to Web Speech API.

kidsRouter.post('/ai/tts', async (_req: Request, res: Response) => {
  // Real OpenAI TTS call wires in here when OPENAI_API_KEY is set.
  // Until then, return a stub so the client falls back to Web Speech API.
  res.json({ stub: true, note: 'TTS activates when OpenAI API key is configured. Using browser Web Speech API.' });
});

// ── AI usage log for parent visibility ────────────────────────────────────

kidsRouter.get('/ai/usage/:childId', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const childId = req.params.childId as string;
  if (!await db.prepare('SELECT id FROM child_profiles WHERE id = ? AND parent_user_id = ?').get(childId, userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const rows = await db.prepare(`
    SELECT session_type, COUNT(*) AS sessions, SUM(interaction_count) AS interactions, MAX(created_at) AS last_used
    FROM kids_ai_sessions WHERE child_profile_id = ?
    GROUP BY session_type ORDER BY last_used DESC
  `).all(childId);
  res.json(rows);
});

// ── Stub answer builder (Socratic / story tone) ────────────────────────────

function buildKidStubAnswer(type: 'homework' | 'story', prompt: string): string {
  if (type === 'homework') {
    return [
      `Great question! Let's think about it together. 🤔`,
      `You asked about: "${prompt.slice(0, 80)}".`,
      `Instead of telling you the answer, I want you to discover it!`,
      `Here's a clue: break the problem into smaller pieces. What do you already know about this topic?`,
      `(AI tutor activates with full Socratic guidance once the API key is configured.)`,
    ].join(' ');
  }
  return [
    `🌟 Once upon a time, inspired by your idea: "${prompt.slice(0, 60)}"...`,
    `A brave young explorer set off on a magical adventure.`,
    `Along the way they discovered that kindness and curiosity can solve any problem.`,
    `The moral of the story: being curious is a superpower!`,
    `What would YOU do next if you were the hero? 🚀`,
    `(Full AI stories activate when the API key is configured.)`,
  ].join(' ');
}
