/**
 * Briefing API — Propel Stack AI, LLC
 *
 * Enhancement 7: Morning Briefing Push Notification
 *   — Personalized AI briefing cached per day, FCM push token registration
 * Enhancement 8: Weekly Life Review
 *   — AI-generated weekly narrative, highlights, forward focus
 */
import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { buildMemoryContext, logEpisodic } from '../lib/memoryStore.js';
import { complete } from '../ai-gateway.js';

export const briefingRouter = Router();

// ─── Types ───────────────────────────────────────────────────────────────────

interface BriefingRow {
  id: string;
  user_id: string;
  briefing_date: string;
  headline: string;
  priorities: string; // JSON string
  insight: string;
  motivation: string;
  generated_at: string;
}

interface ReviewRow {
  id: string;
  user_id: string;
  week_start: string;
  narrative: string;
  highlights: string; // JSON string
  focus_next: string;
  generated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekStartIso(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon
  const mon = new Date(d);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

// ─── Morning Briefing — GET today ────────────────────────────────────────────

briefingRouter.get('/today', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const today = todayIso();

  const cached = await db
    .prepare('SELECT * FROM morning_briefings WHERE user_id = ? AND briefing_date = ?')
    .get(userId, today) as BriefingRow | undefined;

  if (cached) {
    return res.json({
      headline: cached.headline,
      priorities: JSON.parse(cached.priorities),
      insight: cached.insight,
      motivation: cached.motivation,
      generatedAt: cached.generated_at,
      cached: true,
      stub: false,
    });
  }

  const briefing = await generateBriefing(userId, today);
  res.json({ ...briefing, cached: false });
});

// ─── Morning Briefing — force regenerate ─────────────────────────────────────

briefingRouter.post('/generate', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const today = todayIso();
  await db
    .prepare('DELETE FROM morning_briefings WHERE user_id = ? AND briefing_date = ?')
    .run(userId, today);
  const briefing = await generateBriefing(userId, today);
  res.json({ ...briefing, cached: false });
});

// ─── Core briefing generator ─────────────────────────────────────────────────

export async function generateBriefing(userId: string, today: string) {
  const memCtx = await buildMemoryContext(userId).catch(() => '');

  const dueTasks = ((await db
    .prepare(
      'SELECT COUNT(*) AS c FROM tasks WHERE user_id=? AND completed_at IS NULL AND due_date IS NOT NULL AND due_date <= ?',
    )
    .get(userId, today)) as { c: number }).c;

  const dueBills = ((await db
    .prepare("SELECT COUNT(*) AS c FROM bills WHERE user_id=? AND is_paid=0 AND due_date <= ?")
    .get(userId, today)) as { c: number }).c;

  const systemPrompt =
    memCtx +
    'You are a personal life coach generating a morning briefing. Be warm, energizing, and action-oriented.';

  const prompt = `Generate a morning briefing for today (${today}). The user has ${dueTasks} task(s) due and ${dueBills} bill(s) due today.

Return ONLY valid JSON (no markdown, no explanation) with exactly these fields:
{
  "headline": "A short energizing headline for the day (max 10 words)",
  "priorities": ["Priority 1", "Priority 2", "Priority 3"],
  "insight": "One personalized insight about this user based on their history (1 sentence)",
  "motivation": "One energizing sentence tailored to their goals (1 sentence)"
}`;

  const result = complete({ prompt, systemPrompt, mode: 'general' });

  let parsed: { headline: string; priorities: string[]; insight: string; motivation: string } | null = null;
  if (!result.stub) {
    try {
      parsed = JSON.parse(result.text);
    } catch {
      // fall through to defaults
    }
  }

  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  if (!parsed?.headline) {
    parsed = {
      headline: `Let's make ${weekday} count.`,
      priorities: [
        dueTasks > 0
          ? `Complete ${dueTasks} task${dueTasks !== 1 ? 's' : ''} due today`
          : 'Define your single most important task',
        dueBills > 0
          ? `Handle ${dueBills} bill${dueBills !== 1 ? 's' : ''} coming due`
          : 'Spend 30 minutes on your top priority before checking messages',
        'Take 5 minutes to breathe and set your daily intention',
      ],
      insight: 'Consistent daily action — not intensity — is what builds the life you want.',
      motivation: "You're one focused day closer to everything you're working toward.",
    };
  }

  await db
    .prepare(
      `INSERT INTO morning_briefings (user_id, briefing_date, headline, priorities, insight, motivation)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, briefing_date) DO UPDATE
         SET headline = EXCLUDED.headline, priorities = EXCLUDED.priorities,
             insight = EXCLUDED.insight, motivation = EXCLUDED.motivation,
             generated_at = NOW()`,
    )
    .run(
      userId,
      today,
      parsed.headline,
      JSON.stringify(parsed.priorities),
      parsed.insight,
      parsed.motivation,
    );

  logEpisodic(userId, `Morning briefing generated: "${parsed.headline}"`, 'briefing').catch(() => {});

  return {
    headline: parsed.headline,
    priorities: parsed.priorities,
    insight: parsed.insight,
    motivation: parsed.motivation,
    generatedAt: new Date().toISOString(),
    stub: result.stub,
  };
}

// ─── Weekly Review — GET current week ────────────────────────────────────────

briefingRouter.get('/weekly', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const weekStart = weekStartIso();

  const cached = await db
    .prepare('SELECT * FROM weekly_reviews WHERE user_id = ? AND week_start = ?')
    .get(userId, weekStart) as ReviewRow | undefined;

  if (cached) {
    return res.json({
      weekStart: cached.week_start,
      narrative: cached.narrative,
      highlights: JSON.parse(cached.highlights),
      focusNext: cached.focus_next,
      generatedAt: cached.generated_at,
      cached: true,
      stub: false,
    });
  }

  const review = await generateWeeklyReview(userId, weekStart);
  res.json({ ...review, cached: false });
});

// ─── Weekly Review — GET history list ────────────────────────────────────────

briefingRouter.get('/weekly/list', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare('SELECT * FROM weekly_reviews WHERE user_id = ? ORDER BY week_start DESC LIMIT 12')
    .all(userId) as ReviewRow[];

  res.json(
    rows.map((r) => ({
      weekStart: r.week_start,
      narrative: r.narrative,
      highlights: JSON.parse(r.highlights),
      focusNext: r.focus_next,
      generatedAt: r.generated_at,
    })),
  );
});

// ─── Weekly Review — force regenerate ────────────────────────────────────────

briefingRouter.post('/generate-weekly', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const weekStart = weekStartIso();
  await db
    .prepare('DELETE FROM weekly_reviews WHERE user_id = ? AND week_start = ?')
    .run(userId, weekStart);
  const review = await generateWeeklyReview(userId, weekStart);
  res.json({ ...review, cached: false });
});

// ─── Core weekly review generator ────────────────────────────────────────────

export async function generateWeeklyReview(
  userId: string,
  weekStart: string,
): Promise<{
  weekStart: string;
  narrative: string;
  highlights: string[];
  focusNext: string;
  generatedAt: string;
  stub: boolean;
}> {
  const memCtx = await buildMemoryContext(userId).catch(() => '');

  const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const recentMemories = await db
    .prepare(
      `SELECT content, context_key FROM user_memories
       WHERE user_id = ? AND namespace = 'episodic' AND created_at >= ? AND created_at < ?
       ORDER BY created_at DESC LIMIT 20`,
    )
    .all(userId, weekStart, weekEnd) as { content: string; context_key: string | null }[];

  const memorySummary =
    recentMemories.length > 0
      ? recentMemories.map((m) => `• ${m.content}`).join('\n')
      : 'No specific events recorded this week.';

  const systemPrompt =
    memCtx +
    'You are a thoughtful life coach writing a weekly narrative review. Be insightful, warm, and forward-looking.';

  const prompt = `Write a weekly life review for the week starting ${weekStart}.

Events from this week:
${memorySummary}

Return ONLY valid JSON (no markdown, no explanation) with exactly these fields:
{
  "narrative": "A warm, insightful 150-200 word narrative — what was accomplished, what shifted, what to be proud of",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
  "focusNext": "One clear intention for the coming week (1-2 sentences)"
}`;

  const result = complete({ prompt, systemPrompt, mode: 'general', maxTokens: 500 });

  let parsed: { narrative: string; highlights: string[]; focusNext: string } | null = null;
  if (!result.stub) {
    try {
      parsed = JSON.parse(result.text);
    } catch {
      // fall through
    }
  }

  const weekDate = new Date(weekStart + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  if (!parsed?.narrative) {
    parsed = {
      narrative: `The week of ${weekDate} was another chapter in your ongoing story. You showed up, made decisions, and moved forward — even when it didn't feel dramatic. Real growth rarely does. The habits you're building and the systems you're putting in place are compounding quietly. Every conversation you had, every task you tackled, every moment of clarity adds to the foundation you're constructing. Progress isn't always a straight line, but the direction matters more than the speed. You're heading somewhere worth going.`,
      highlights: [
        'Engaged with your Life OS and built consistency',
        'Navigated the week with intention and awareness',
        'Continued moving toward your goals one day at a time',
      ],
      focusNext:
        'Next week, choose one thing to go deeper on rather than wider. Concentrated effort creates breakthroughs.',
    };
  }

  await db
    .prepare(
      `INSERT INTO weekly_reviews (user_id, week_start, narrative, highlights, focus_next)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, week_start) DO UPDATE
         SET narrative = EXCLUDED.narrative, highlights = EXCLUDED.highlights,
             focus_next = EXCLUDED.focus_next, generated_at = NOW()`,
    )
    .run(
      userId,
      weekStart,
      parsed.narrative,
      JSON.stringify(parsed.highlights),
      parsed.focusNext,
    );

  logEpisodic(
    userId,
    `Weekly life review generated for week of ${weekStart}`,
    'review',
  ).catch(() => {});

  return {
    weekStart,
    narrative: parsed.narrative,
    highlights: parsed.highlights,
    focusNext: parsed.focusNext,
    generatedAt: new Date().toISOString(),
    stub: result.stub,
  };
}

// ─── Push Token Registration (Enhancement 7) ─────────────────────────────────

briefingRouter.post('/push-token', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { token, platform = 'web' } = req.body ?? {};
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' });

  await db
    .prepare(
      `INSERT INTO push_tokens (user_id, token, platform)
       VALUES (?, ?, ?)
       ON CONFLICT (token) DO UPDATE SET user_id = ?, platform = ?, last_seen_at = NOW()`,
    )
    .run(userId, token, platform, userId, platform);

  res.json({ registered: true });
});
