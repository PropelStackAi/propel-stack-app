// ─── AI Weekly Life Recap Routes ────────────────────────────────────────────
// Session 15 / Enhancement 15 — Propel Stack AI, LLC

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';

export const recapRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the Monday of the current week (ISO date string YYYY-MM-DD) */
function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Days to subtract to reach Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Returns the Sunday of the current week (end of week for recap) */
function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

async function callAI(systemPrompt: string, userMsg: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((c) => c.type === 'text')?.text ?? '';
}

// ─── Data Aggregation ─────────────────────────────────────────────────────────

interface WeekSnapshot {
  weekStart: string;
  weekEnd: string;
  // Health
  workouts: number;
  avgSleep: number | null;
  avgMood: number | null;
  avgEnergy: number | null;
  // Finance
  totalSpend: number | null;
  // Nutrition
  logsCount: number;
  avgCalories: number | null;
  avgProtein: number | null;
  // Recovery
  avgReadiness: number | null;
  // Athlete
  trainingSessions: number;
  newPRs: number;
  // Social
  screenTimeMinutes: number;
  // Previous week comparison
  prevWorkouts: number;
  prevAvgSleep: number | null;
}

async function aggregateWeekData(userId: string, weekStart: string): Promise<WeekSnapshot> {
  const weekEnd = getWeekEnd(weekStart);
  const prevWeekStart = new Date(new Date(weekStart).getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const prevWeekEnd = weekStart;

  // Run all queries in parallel, gracefully handle missing tables
  const safe = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
    try { return await promise; } catch { return fallback; }
  };

  const [
    trainingResult,
    prevTraining,
    recoveryResult,
    nutritionResult,
    screenResult,
    prResult,
  ] = await Promise.all([
    safe(db.prepare(`
      SELECT COUNT(*) as n, AVG(rpe) as avg_rpe, AVG(mood) as avg_mood
      FROM training_sessions
      WHERE user_id = ? AND session_date >= ? AND session_date <= ?
    `).get(userId, weekStart, weekEnd), null),

    safe(db.prepare(`
      SELECT COUNT(*) as n
      FROM training_sessions
      WHERE user_id = ? AND session_date >= ? AND session_date < ?
    `).get(userId, prevWeekStart, prevWeekEnd), null),

    safe(db.prepare(`
      SELECT AVG(sleep_hours) as avg_sleep,
             AVG(energy_level) as avg_energy,
             AVG(readiness_score) as avg_readiness
      FROM recovery_logs
      WHERE user_id = ? AND log_date >= ? AND log_date <= ?
    `).get(userId, weekStart, weekEnd), null),

    safe(db.prepare(`
      SELECT COUNT(*) as n,
             AVG(total_calories) as avg_cal,
             AVG(protein_g) as avg_protein
      FROM nutrition_logs
      WHERE user_id = ? AND log_date >= ? AND log_date <= ?
    `).get(userId, weekStart, weekEnd), null),

    safe(db.prepare(`
      SELECT COALESCE(SUM(duration_seconds), 0) / 60.0 as minutes
      FROM screen_time_log
      WHERE user_id = ? AND session_start >= ? AND session_start <= ?
    `).get(userId, `${weekStart}T00:00:00Z`, `${weekEnd}T23:59:59Z`), null),

    safe(db.prepare(`
      SELECT COUNT(*) as n
      FROM athlete_prs
      WHERE user_id = ? AND achieved_at >= ? AND achieved_at <= ?
    `).get(userId, weekStart, weekEnd), null),
  ]);

  type Row = Record<string, unknown>;

  const tr = trainingResult as Row | null;
  const pt = prevTraining as Row | null;
  const rr = recoveryResult as Row | null;
  const nr = nutritionResult as Row | null;
  const sr = screenResult as Row | null;
  const pr = prResult as Row | null;

  return {
    weekStart,
    weekEnd,
    workouts: Number(tr?.n ?? 0),
    avgSleep: rr?.avg_sleep != null ? Number(rr.avg_sleep) : null,
    avgMood: tr?.avg_mood != null ? Number(tr.avg_mood) : null,
    avgEnergy: rr?.avg_energy != null ? Number(rr.avg_energy) : null,
    totalSpend: null, // Finance hub not yet connected to this data flow
    logsCount: Number(nr?.n ?? 0),
    avgCalories: nr?.avg_cal != null ? Number(nr.avg_cal) : null,
    avgProtein: nr?.avg_protein != null ? Number(nr.avg_protein) : null,
    avgReadiness: rr?.avg_readiness != null ? Number(rr.avg_readiness) : null,
    trainingSessions: Number(tr?.n ?? 0),
    newPRs: Number(pr?.n ?? 0),
    screenTimeMinutes: Number(sr?.minutes ?? 0),
    prevWorkouts: Number(pt?.n ?? 0),
    prevAvgSleep: null,
  };
}

const RECAP_SYSTEM_PROMPT = `You are the Propel Stack AI Life Recap generator.
You have access to the user's anonymized weekly summary data across all hubs.
Your job: produce a warm, specific, encouraging weekly recap in exactly 3 sections:

1. WINS — what went well (specific, data-backed, 2-3 bullet points)
2. INSIGHT — one meaningful pattern you noticed (cross-hub only, never obvious, 1-2 sentences)
3. NEXT WEEK — one intention prompt + one habit suggestion (2 short sentences)

Tone: like a thoughtful friend reviewing your week with you.

Rules:
- Never repeat observations from prior weeks
- Never mention specific health diagnoses or financial advice
- If mood or energy data is low, lead with empathy before wins
- Max 280 words total — this is a card, not an essay
- End with one question: 'What would make next week a 9/10?'`;

async function generateRecapText(snapshot: WeekSnapshot): Promise<{ text: string; insightKey: string }> {
  const lines: string[] = [
    `Week: ${snapshot.weekStart} to ${snapshot.weekEnd}`,
    `Workouts completed: ${snapshot.trainingSessions} (vs ${snapshot.prevWorkouts} last week)`,
  ];
  if (snapshot.avgSleep != null) lines.push(`Avg sleep: ${snapshot.avgSleep.toFixed(1)} hours`);
  if (snapshot.avgMood != null) lines.push(`Avg mood (1-10): ${snapshot.avgMood.toFixed(1)}`);
  if (snapshot.avgEnergy != null) lines.push(`Avg energy (1-10): ${snapshot.avgEnergy.toFixed(1)}`);
  if (snapshot.avgReadiness != null) lines.push(`Avg readiness score: ${snapshot.avgReadiness.toFixed(0)}/100`);
  if (snapshot.logsCount > 0) lines.push(`Nutrition logs: ${snapshot.logsCount}`);
  if (snapshot.avgCalories != null) lines.push(`Avg daily calories: ${Math.round(snapshot.avgCalories)}`);
  if (snapshot.avgProtein != null) lines.push(`Avg protein: ${snapshot.avgProtein.toFixed(0)}g/day`);
  if (snapshot.newPRs > 0) lines.push(`New personal records: ${snapshot.newPRs}`);
  if (snapshot.screenTimeMinutes > 0) lines.push(`Social/media screen time: ${Math.round(snapshot.screenTimeMinutes)} minutes`);

  const userMsg = `Here is the user's week summary:\n${lines.join('\n')}\n\nGenerate the weekly recap card now.`;

  const text = await callAI(RECAP_SYSTEM_PROMPT, userMsg);

  // Determine insight key from content
  let insightKey = 'general';
  const lower = text.toLowerCase();
  if (lower.includes('sleep') && (lower.includes('mood') || lower.includes('energy'))) insightKey = 'sleep-mood';
  else if (lower.includes('workout') || lower.includes('training')) insightKey = 'fitness';
  else if (lower.includes('nutrition') || lower.includes('protein')) insightKey = 'nutrition';
  else if (lower.includes('streak') || lower.includes('habit')) insightKey = 'habits';

  return { text, insightKey };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/recap/current — returns latest recap (generates if needed for current week)
recapRouter.get('/current', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const weekStart = getWeekStart();

    // Check if we have a recap for this week
    const existing = await db.prepare(
      'SELECT * FROM weekly_recaps WHERE user_id = ? AND week_start = ?'
    ).get(userId, weekStart) as Record<string, unknown> | undefined;

    if (existing) {
      // Mark as opened if not already
      if (!existing.opened_at) {
        await db.prepare(
          'UPDATE weekly_recaps SET opened_at = NOW() WHERE id = ?'
        ).run(existing.id);
      }
      return res.json({ recap: existing, isNew: !existing.opened_at });
    }

    // No recap yet — return null (client can call /generate)
    res.json({ recap: null, isNew: false });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/recap/generate — generate recap for current week
recapRouter.post('/generate', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const weekStart = getWeekStart();

    // Check if already generated this week
    const existing = await db.prepare(
      'SELECT * FROM weekly_recaps WHERE user_id = ? AND week_start = ?'
    ).get(userId, weekStart) as Record<string, unknown> | undefined;

    if (existing) {
      return res.json({ recap: existing, cached: true });
    }

    // Aggregate data and generate
    const snapshot = await aggregateWeekData(userId, weekStart);
    const { text, insightKey } = await generateRecapText(snapshot);

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO weekly_recaps (id, user_id, week_start, recap_text, insight_key, life_score_delta)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, week_start) DO UPDATE SET
        recap_text = EXCLUDED.recap_text,
        insight_key = EXCLUDED.insight_key
    `).run(id, userId, weekStart, text, insightKey, null);

    const recap = await db.prepare(
      'SELECT * FROM weekly_recaps WHERE user_id = ? AND week_start = ?'
    ).get(userId, weekStart);

    res.json({ recap, cached: false });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/recap/history — paginated past recaps
recapRouter.get('/history', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const limit = Math.min(Number(req.query.limit ?? 10), 52);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db.prepare(
      'SELECT * FROM weekly_recaps WHERE user_id = ? ORDER BY week_start DESC LIMIT ? OFFSET ?'
    ).all(userId, limit, offset);

    const countRow = await db.prepare(
      'SELECT COUNT(*) as n FROM weekly_recaps WHERE user_id = ?'
    ).get(userId) as { n: number };

    res.json({ recaps: rows, total: countRow.n, hasMore: offset + limit < countRow.n });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/recap/unread-count — for dashboard badge
recapRouter.get('/unread-count', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const row = await db.prepare(
      'SELECT COUNT(*) as n FROM weekly_recaps WHERE user_id = ? AND opened_at IS NULL'
    ).get(userId) as { n: number };
    res.json({ count: row.n });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/recap/:id/next-week — save Next Week Setup intentions
recapRouter.post('/:id/next-week', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { intention, habit, goal } = req.body as {
      intention: string; habit: string; goal: string;
    };

    const recap = await db.prepare(
      'SELECT * FROM weekly_recaps WHERE id = ? AND user_id = ?'
    ).get(req.params.id, userId);
    if (!recap) return res.status(404).json({ error: 'Recap not found' });

    await db.prepare(`
      UPDATE weekly_recaps
      SET next_week_intention = ?, next_week_habit = ?, next_week_goal = ?
      WHERE id = ? AND user_id = ?
    `).run(intention ?? '', habit ?? '', goal ?? '', req.params.id, userId);

    const updated = await db.prepare(
      'SELECT * FROM weekly_recaps WHERE id = ?'
    ).get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/recap/:id/open — mark as read
recapRouter.post('/:id/open', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(
      'UPDATE weekly_recaps SET opened_at = NOW() WHERE id = ? AND user_id = ?'
    ).run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
