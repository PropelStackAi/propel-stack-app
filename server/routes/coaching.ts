// ─── AI Life Coach Routes ─────────────────────────────────────────────────────
// Enhancement 22 — Propel Stack AI, LLC
//
// HARD LIMITS (enforced in system prompt and signal checks):
//   - Never diagnose, prescribe, or recommend specific medical/financial actions
//   - Never provide insights if user has opted out
//   - Insights are questions/observations, NEVER directives
//   - Max 1 proactive insight per day
//   - Mental health signals require explicit opt-in
//   - Permanent dismiss respected forever
//   - Full insight history shown to user — full transparency

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

export const coachingRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

// ─── Life Coach System Prompt (immutable safety boundary) ────────────────────
const LIFE_COACH_SYSTEM = `You are a warm, supportive AI life coach inside Propel Stack AI. Your job is to gently surface patterns from the user's own data and ask caring questions — not to direct, fix, or diagnose.

ABSOLUTE RULES — NEVER VIOLATE:
- NEVER say "you should", "you must", "you need to", "I recommend"
- NEVER diagnose any medical, mental health, or financial condition
- NEVER recommend specific products, medications, investments, or purchases
- NEVER assume why someone is struggling — only surface what the data shows
- NEVER suggest purchasing gifts or external items for relationships
- NEVER give directives — only observations and open questions
- Always phrase insights as observations ending in a gentle open question
- Keep it to 2-3 sentences maximum
- Use first-person "I noticed…" or "It looks like…" framing
- End with a warm, open question (not yes/no)`;

function today(): string { return new Date().toISOString().split('T')[0]; }
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

// ─── Signal Types ─────────────────────────────────────────────────────────────
type InsightType =
  | 'relationship_neglect'
  | 'learning_gap'
  | 'maintenance_overdue'
  | 'streak_gap'
  | 'finance_awareness'
  | 'health_regression'; // mental-health-gated

interface SignalResult {
  signal: boolean;
  score: number;        // 0-100, higher = more important
  data: Record<string, unknown>;
  hubs_used: string[];
  prompt_context: string;
}

// ─── Signal Check Functions ───────────────────────────────────────────────────

async function checkRelationshipNeglect(userId: string): Promise<SignalResult> {
  // Find most overdue relationship contacts
  const contacts = await db.prepare(`
    SELECT name, relationship, last_contact, checkin_cadence, cadence_days
    FROM relationship_contacts
    WHERE user_id = ? AND last_contact IS NOT NULL
    ORDER BY last_contact ASC
    LIMIT 5
  `).all(userId) as { name: string; relationship: string; last_contact: string; checkin_cadence: string; cadence_days: number }[];

  // Also check contacts never contacted
  const neverContacted = await db.prepare(`
    SELECT name, relationship, cadence_days
    FROM relationship_contacts
    WHERE user_id = ? AND last_contact IS NULL
    LIMIT 3
  `).all(userId) as { name: string; relationship: string; cadence_days: number }[];

  let bestSignal = { name: '', relationship: '', days_overdue: 0, cadence_days: 30, total_days: 0 };

  for (const c of contacts) {
    const daysSince = Math.floor((Date.now() - new Date(c.last_contact).getTime()) / 86400000);
    const overdue = Math.max(0, daysSince - c.cadence_days);
    if (overdue > bestSignal.days_overdue) {
      bestSignal = { name: c.name, relationship: c.relationship, days_overdue: overdue, cadence_days: c.cadence_days, total_days: daysSince };
    }
  }

  // Never-contacted contacts count as very overdue
  if (neverContacted.length > 0 && bestSignal.days_overdue < 30) {
    const nc = neverContacted[0];
    bestSignal = { name: nc.name, relationship: nc.relationship, days_overdue: 30, cadence_days: nc.cadence_days, total_days: 999 };
  }

  if (bestSignal.days_overdue < 7) return { signal: false, score: 0, data: {}, hubs_used: [], prompt_context: '' };

  const score = Math.min(100, bestSignal.days_overdue * 2);
  return {
    signal: true,
    score,
    data: bestSignal,
    hubs_used: ['Relationships'],
    prompt_context: `User's contact "${bestSignal.name}" (their ${bestSignal.relationship}) hasn't been reached in ${bestSignal.total_days === 999 ? 'a long time (never logged)' : `${bestSignal.total_days} days`}. Their desired cadence is every ${bestSignal.cadence_days} days. They are ${bestSignal.days_overdue} days overdue.`,
  };
}

async function checkLearningGap(userId: string): Promise<SignalResult> {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

  const [recentLog, activeItems, prevLog] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM learning_logs WHERE user_id = ? AND logged_date >= ?').get(userId, weekAgo) as Promise<{ count: number }>,
    db.prepare("SELECT COUNT(*) as count, GROUP_CONCAT(title, ', ') as titles FROM learning_items WHERE user_id = ? AND status IN ('reading', 'in-progress') LIMIT 3").get(userId) as Promise<{ count: number; titles: string }>,
    db.prepare('SELECT COUNT(*) as count FROM learning_logs WHERE user_id = ? AND logged_date >= ? AND logged_date < ?').get(userId, twoWeeksAgo, weekAgo) as Promise<{ count: number }>,
  ]);

  const hasActiveItems = (activeItems as { count: number }).count > 0;
  const noRecentSessions = (recentLog as { count: number }).count === 0;
  const hadPriorActivity = (prevLog as { count: number }).count > 0;

  if (!hasActiveItems || !noRecentSessions) return { signal: false, score: 0, data: {}, hubs_used: [], prompt_context: '' };

  // More meaningful if they were previously active
  const score = hadPriorActivity ? 70 : 45;
  const titles = (activeItems as { count: number; titles: string }).titles ?? '';

  return {
    signal: true,
    score,
    data: { active_count: (activeItems as { count: number }).count, had_prior: hadPriorActivity },
    hubs_used: ['Learning Hub'],
    prompt_context: `User has ${(activeItems as { count: number }).count} active learning item(s) in progress${titles ? ` (including: ${titles.split(',')[0].trim()})` : ''} but hasn't logged any study or reading session in the past 7 days.${hadPriorActivity ? ' They were active the week before.' : ''}`,
  };
}

async function checkMaintenanceOverdue(userId: string): Promise<SignalResult> {
  const overdue = await db.prepare(`
    SELECT m.task_name, m.next_due, p.nickname as property_name
    FROM maintenance_tasks m
    LEFT JOIN properties p ON m.property_id = p.id
    WHERE m.user_id = ? AND m.next_due < date('now')
    ORDER BY m.next_due ASC
    LIMIT 5
  `).all(userId) as { task_name: string; next_due: string; property_name: string }[];

  if (!overdue.length) return { signal: false, score: 0, data: {}, hubs_used: [], prompt_context: '' };

  const oldest = overdue[0];
  const daysOverdue = Math.floor((Date.now() - new Date(oldest.next_due).getTime()) / 86400000);
  const score = Math.min(85, overdue.length * 15 + daysOverdue);
  const taskNames = overdue.slice(0, 3).map((t) => t.task_name).join(', ');

  return {
    signal: true,
    score,
    data: { count: overdue.length, oldest_task: oldest.task_name, days_overdue: daysOverdue },
    hubs_used: ['Home & Property'],
    prompt_context: `User has ${overdue.length} overdue home maintenance task(s), including: ${taskNames}. The oldest is ${daysOverdue} days past due.`,
  };
}

async function checkStreakGap(userId: string): Promise<SignalResult> {
  // Find streaks that had activity but have gone quiet
  const streaks = await db.prepare(`
    SELECT s.name, s.current_count, s.best_count, s.last_event_date
    FROM streaks s
    WHERE s.user_id = ?
    AND s.current_count > 0
    AND s.last_event_date < date('now', '-3 days')
    ORDER BY s.best_count DESC
    LIMIT 3
  `).all(userId) as { name: string; current_count: number; best_count: number; last_event_date: string }[];

  if (!streaks.length) return { signal: false, score: 0, data: {}, hubs_used: [], prompt_context: '' };

  const top = streaks[0];
  const daysSince = Math.floor((Date.now() - new Date(top.last_event_date).getTime()) / 86400000);

  // Only worth flagging if they had a meaningful streak
  if (top.best_count < 3) return { signal: false, score: 0, data: {}, hubs_used: [], prompt_context: '' };

  const score = Math.min(80, daysSince * 10 + top.best_count * 2);

  return {
    signal: true,
    score,
    data: { name: top.name, current: top.current_count, best: top.best_count, days_since: daysSince },
    hubs_used: ['Streaks & Wins'],
    prompt_context: `User's "${top.name}" habit hasn't been logged in ${daysSince} days. Their best streak was ${top.best_count} days and their current streak is ${top.current_count} days.`,
  };
}

async function checkFinanceAwareness(userId: string): Promise<SignalResult> {
  // See if there are unreviewed bills or upcoming renewals
  const [upcomingBills, warrantyExpiring] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) as count FROM finance_bills
      WHERE user_id = ? AND is_paid = 0 AND due_date <= date('now', '+7 days') AND due_date >= date('now')
    `).get(userId) as Promise<{ count: number }>,
    db.prepare(`
      SELECT name, warranty_expiry FROM appliances
      WHERE user_id = ? AND warranty_expiry >= date('now') AND warranty_expiry <= date('now', '+30 days')
      LIMIT 1
    `).get(userId) as Promise<{ name: string; warranty_expiry: string } | undefined>,
  ]);

  const billCount = (upcomingBills as { count: number }).count;
  const warranty = warrantyExpiring as { name: string; warranty_expiry: string } | undefined;

  if (billCount > 0) {
    return {
      signal: true,
      score: 55,
      data: { bill_count: billCount },
      hubs_used: ['Personal Finance'],
      prompt_context: `User has ${billCount} bill(s) due in the next 7 days that haven't been marked as paid yet.`,
    };
  }

  if (warranty) {
    const daysLeft = Math.floor((new Date(warranty.warranty_expiry).getTime() - Date.now()) / 86400000);
    return {
      signal: true,
      score: 50,
      data: { appliance: warranty.name, days_left: daysLeft },
      hubs_used: ['Home & Property'],
      prompt_context: `User's appliance warranty for "${warranty.name}" expires in ${daysLeft} days.`,
    };
  }

  return { signal: false, score: 0, data: {}, hubs_used: [], prompt_context: '' };
}

// Mental-health-gated signal
async function checkHealthRegression(userId: string): Promise<SignalResult> {
  // Check if health logs have dropped off
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const prevWeek = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

  const [recentHealth, prevHealth] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM health_logs WHERE user_id = ? AND logged_date >= ?').get(userId, weekAgo) as Promise<{ count: number }>,
    db.prepare('SELECT COUNT(*) as count FROM health_logs WHERE user_id = ? AND logged_date >= ? AND logged_date < ?').get(userId, prevWeek, weekAgo) as Promise<{ count: number }>,
  ]);

  const recent = (recentHealth as { count: number }).count;
  const prev = (prevHealth as { count: number }).count;

  if (prev === 0 || recent >= prev * 0.5) return { signal: false, score: 0, data: {}, hubs_used: [], prompt_context: '' };

  const dropPct = Math.round(((prev - recent) / prev) * 100);
  return {
    signal: true,
    score: 60,
    data: { recent_logs: recent, prev_logs: prev, drop_pct: dropPct },
    hubs_used: ['Health Hub'],
    prompt_context: `User's health logging has dropped ${dropPct}% compared to the prior week (${recent} logs this week vs ${prev} last week).`,
  };
}

// ─── Insight Generation Engine ────────────────────────────────────────────────

async function generateInsight(userId: string, prefs: { mental_health_enabled: number }): Promise<{
  insight_type: string;
  insight_text: string;
  hubs_used: string;
} | null> {
  // Get permanently dismissed types
  const dismissed = await db.prepare(`
    SELECT DISTINCT insight_type FROM coaching_insights
    WHERE user_id = ? AND dismiss_type = 'permanent_type'
  `).all(userId) as { insight_type: string }[];
  const dismissedTypes = new Set(dismissed.map((d) => d.insight_type));

  // Get types shown in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentTypes = await db.prepare(`
    SELECT DISTINCT insight_type FROM coaching_insights
    WHERE user_id = ? AND created_at >= ?
  `).all(userId, weekAgo) as { insight_type: string }[];
  const recentlyShown = new Set(recentTypes.map((r) => r.insight_type));

  // Run all signals concurrently
  const checks: [string, Promise<SignalResult>][] = [
    ['relationship_neglect', checkRelationshipNeglect(userId)],
    ['learning_gap',         checkLearningGap(userId)],
    ['maintenance_overdue',  checkMaintenanceOverdue(userId)],
    ['streak_gap',           checkStreakGap(userId)],
    ['finance_awareness',    checkFinanceAwareness(userId)],
  ];

  if (prefs.mental_health_enabled) {
    checks.push(['health_regression', checkHealthRegression(userId)]);
  }

  const results = await Promise.all(
    checks.map(async ([type, promise]) => ({ type, result: await promise }))
  );

  // Filter: signal present, not permanently dismissed, not shown in last 7 days
  const eligible = results
    .filter((r) => r.result.signal && !dismissedTypes.has(r.type) && !recentlyShown.has(r.type))
    .sort((a, b) => b.result.score - a.result.score);

  if (!eligible.length) return null;

  const winner = eligible[0];

  // Generate AI insight text
  const userPrompt = `${winner.result.prompt_context}\n\nGenerate a warm 2-3 sentence life coaching observation with a gentle open question at the end. Remember: observations only, no directives.`;

  let insight_text = '';
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: LIFE_COACH_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = msg.content[0];
    insight_text = block.type === 'text' ? block.text.trim() : '';
  } catch {
    insight_text = `It looks like there's something worth checking in on — ${winner.result.prompt_context.slice(0, 80)}… How are you feeling about it?`;
  }

  return {
    insight_type: winner.type,
    insight_text,
    hubs_used: winner.result.hubs_used.join(','),
  };
}

// ─── Preferences helpers ──────────────────────────────────────────────────────

async function ensurePrefs(userId: string) {
  const existing = await db.prepare('SELECT * FROM coaching_preferences WHERE user_id = ?').get(userId);
  if (!existing) {
    const id = randomUUID();
    await db.prepare('INSERT INTO coaching_preferences (id, user_id) VALUES (?, ?)').run(id, userId);
    return db.prepare('SELECT * FROM coaching_preferences WHERE user_id = ?').get(userId);
  }
  return existing;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/coaching/preferences
coachingRouter.get('/preferences', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const prefs = await ensurePrefs(userId);
    res.json({ preferences: prefs });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// PATCH /api/coaching/preferences
coachingRouter.patch('/preferences', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await ensurePrefs(userId);
    const { ai_coach_enabled, mental_health_enabled } = req.body as Record<string, unknown>;
    const updates: string[] = []; const values: unknown[] = [];
    if (ai_coach_enabled !== undefined) { updates.push('ai_coach_enabled = ?'); values.push(ai_coach_enabled ? 1 : 0); }
    if (mental_health_enabled !== undefined) { updates.push('mental_health_enabled = ?'); values.push(mental_health_enabled ? 1 : 0); }
    if (updates.length > 0) { values.push(userId); await db.prepare(`UPDATE coaching_preferences SET ${updates.join(', ')} WHERE user_id = ?`).run(...values); }
    const prefs = await db.prepare('SELECT * FROM coaching_preferences WHERE user_id = ?').get(userId);
    res.json({ preferences: prefs });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/coaching/insights — latest unread + recent history
coachingRouter.get('/insights', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { history } = req.query;

    if (history === 'true') {
      const rows = await db.prepare(`
        SELECT * FROM coaching_insights WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
      `).all(userId);
      return res.json({ insights: rows });
    }

    // Latest non-permanently-dismissed insight
    const latest = await db.prepare(`
      SELECT * FROM coaching_insights
      WHERE user_id = ? AND (dismiss_type IS NULL OR dismiss_type = 'once')
      ORDER BY created_at DESC LIMIT 1
    `).get(userId);

    res.json({ insight: latest ?? null });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/coaching/generate — check if due, then generate
coachingRouter.post('/generate', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const prefs = await ensurePrefs(userId) as { ai_coach_enabled: number; mental_health_enabled: number; last_generated: string | null };

    if (!prefs.ai_coach_enabled) return res.json({ skipped: 'coach_disabled' });

    // Rate limit: max once per 20 hours
    if (prefs.last_generated) {
      const ageHours = (Date.now() - new Date(prefs.last_generated).getTime()) / 3600000;
      if (ageHours < 20) return res.json({ skipped: 'too_soon', next_in_hours: Math.ceil(20 - ageHours) });
    }

    const result = await generateInsight(userId, { mental_health_enabled: prefs.mental_health_enabled });
    if (!result) {
      await db.prepare('UPDATE coaching_preferences SET last_generated = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
      return res.json({ skipped: 'no_signal' });
    }

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO coaching_insights (id, user_id, insight_type, insight_text, hubs_used)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, result.insight_type, result.insight_text, result.hubs_used);

    await db.prepare('UPDATE coaching_preferences SET last_generated = ? WHERE user_id = ?').run(new Date().toISOString(), userId);

    const insight = await db.prepare('SELECT * FROM coaching_insights WHERE id = ?').get(id);
    res.json({ insight });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/coaching/insights/:id/open
coachingRouter.post('/insights/:id/open', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('UPDATE coaching_insights SET opened_at = ? WHERE id = ? AND user_id = ? AND opened_at IS NULL').run(new Date().toISOString(), req.params.id, userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/coaching/insights/:id/dismiss
coachingRouter.post('/insights/:id/dismiss', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { dismiss_type } = req.body as { dismiss_type?: 'once' | 'permanent_type' };
    const type = dismiss_type === 'permanent_type' ? 'permanent_type' : 'once';
    await db.prepare('UPDATE coaching_insights SET dismissed = 1, dismiss_type = ? WHERE id = ? AND user_id = ?').run(type, req.params.id, userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});
