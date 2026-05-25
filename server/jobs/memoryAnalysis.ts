/**
 * Memory Analysis Job — Propel Stack AI, LLC
 *
 * Enhancement 2: Cross-session context stitching (semantic/procedural distillation)
 * Enhancement 3: Longitudinal Trend Detection (90-day pattern analysis)
 *
 * Runs weekly per user. Uses AI to:
 *  1. Distill episodic memories → semantic beliefs/preferences
 *  2. Extract procedural patterns from interaction history
 *  3. Detect longitudinal trends (sleep vs. stress, goal completion, etc.)
 *
 * Can be triggered:
 *  - Via POST /api/memory/analyze (manual / Railway cron endpoint)
 *  - Via the server's daily interval check (runs for users due every 7 days)
 */
import { db, getCurrentUserId } from '../db.js';
import { upsertSemantic, upsertProcedural } from '../lib/memoryStore.js';

// ─── Core analysis function ───────────────────────────────────────────────────

export async function runMemoryAnalysis(userId: string): Promise<void> {
  const jobId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO memory_job_runs (id, user_id, job_type, status) VALUES (?, ?, 'weekly_analysis', 'running')`,
    )
    .run(jobId, userId);

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch raw episodic memories (last 90 days)
    const episodic = await db
      .prepare(
        `SELECT content, context_key, created_at FROM user_memories
         WHERE user_id = ? AND namespace = 'episodic' AND is_stale = FALSE
           AND created_at > ?
         ORDER BY created_at DESC LIMIT 200`,
      )
      .all(userId, ninetyDaysAgo) as { content: string; context_key: string | null; created_at: string }[];

    if (episodic.length < 3) {
      // Not enough data yet — mark complete and return
      await db
        .prepare(`UPDATE memory_job_runs SET status = 'skipped', result = ?, ran_at = NOW() WHERE id = ?`)
        .run(JSON.stringify({ reason: 'insufficient_data', count: episodic.length }), jobId);
      return;
    }

    // Build a text corpus for analysis
    const corpus = episodic.map((e) => e.content).join('\n');

    // ── Semantic distillation ────────────────────────────────────────────────
    // Use rule-based extraction (AI stub) — extracts patterns from episodic content
    const semanticInsights = extractSemanticInsights(corpus, episodic);
    for (const { key, value } of semanticInsights) {
      await upsertSemantic(userId, value, key);
    }

    // ── Procedural extraction ────────────────────────────────────────────────
    const proceduralPrefs = extractProceduralPrefs(corpus);
    for (const { key, value } of proceduralPrefs) {
      await upsertProcedural(userId, value, key);
    }

    // ── Longitudinal trend detection (Enhancement 3) ─────────────────────────
    const trends = detectTrends(episodic);
    for (const trend of trends) {
      // Upsert trend (replace existing of same type)
      const existing = await db
        .prepare(`SELECT id FROM memory_trends WHERE user_id = ? AND trend_type = ? ORDER BY created_at DESC LIMIT 1`)
        .get(userId, trend.type) as { id: string } | undefined;

      if (existing) {
        await db
          .prepare(
            `UPDATE memory_trends SET description = ?, confidence = ?, period_start = ?, period_end = ?, data = ?, created_at = NOW()
             WHERE id = ?`,
          )
          .run(trend.description, trend.confidence, trend.periodStart, trend.periodEnd, JSON.stringify(trend.data), existing.id);
      } else {
        await db
          .prepare(
            `INSERT INTO memory_trends (user_id, trend_type, description, confidence, period_start, period_end, data)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(userId, trend.type, trend.description, trend.confidence, trend.periodStart, trend.periodEnd, JSON.stringify(trend.data));
      }
    }

    await db
      .prepare(`UPDATE memory_job_runs SET status = 'completed', result = ?, ran_at = NOW() WHERE id = ?`)
      .run(JSON.stringify({ semanticInsights: semanticInsights.length, proceduralPrefs: proceduralPrefs.length, trends: trends.length }), jobId);

    console.log(`[memory] Analysis completed for user ${userId}: ${semanticInsights.length} semantic, ${proceduralPrefs.length} procedural, ${trends.length} trends`);
  } catch (err) {
    await db
      .prepare(`UPDATE memory_job_runs SET status = 'failed', result = ?, ran_at = NOW() WHERE id = ?`)
      .run(JSON.stringify({ error: String(err) }), jobId);
    throw err;
  }
}

// ─── Rule-based semantic insight extraction ───────────────────────────────────
// Production: replace with AI call. Stub provides meaningful patterns from text.

interface Insight { key: string; value: string }

function extractSemanticInsights(
  corpus: string,
  entries: { content: string; context_key: string | null; created_at: string }[],
): Insight[] {
  const insights: Insight[] = [];
  const lower = corpus.toLowerCase();

  // Goal tracking
  const goalMatches = entries.filter((e) => /goal|target|want to|trying to/i.test(e.content));
  if (goalMatches.length >= 2) {
    const goalTopics = goalMatches.slice(0, 3).map((e) => e.content.slice(0, 60)).join('; ');
    insights.push({ key: 'goals', value: `User has expressed goals around: ${goalTopics}` });
  }

  // Health focus
  if (/sleep|workout|exercise|health|gym|run/i.test(lower)) {
    insights.push({ key: 'health_focus', value: 'User actively tracks health and fitness habits' });
  }

  // Financial awareness
  if (/budget|savings?|invest|debt|money|finance/i.test(lower)) {
    insights.push({ key: 'financial_awareness', value: 'User engages regularly with financial topics' });
  }

  // Family/relationships
  if (/family|partner|spouse|kids?|children|friend/i.test(lower)) {
    insights.push({ key: 'relationships', value: 'Relationships and family are important context for this user' });
  }

  // Work/career
  if (/work|job|career|business|meeting|project|client/i.test(lower)) {
    insights.push({ key: 'work', value: 'User regularly discusses work and career topics' });
  }

  // Stress indicators
  const stressCount = (lower.match(/stress|overwhelm|anxious|tired|burnout/g) || []).length;
  if (stressCount >= 3) {
    insights.push({ key: 'stress_level', value: 'User has mentioned stress or overwhelm multiple times recently' });
  }

  return insights;
}

function extractProceduralPrefs(corpus: string): Insight[] {
  const prefs: Insight[] = [];
  const lower = corpus.toLowerCase();

  if (/bullet|list|step.by.step/i.test(lower)) {
    prefs.push({ key: 'response_format', value: 'Prefers bullet points and step-by-step lists' });
  }
  if (/brief|short|quick|concise/i.test(lower)) {
    prefs.push({ key: 'response_length', value: 'Prefers concise, brief responses' });
  }
  if (/detail|thorough|explain|elaborate/i.test(lower)) {
    prefs.push({ key: 'response_depth', value: 'Appreciates detailed, thorough explanations' });
  }
  if (/morning|early|am\b/i.test(lower)) {
    prefs.push({ key: 'active_time', value: 'Most active in the morning hours' });
  }
  if (/evening|night|pm\b/i.test(lower)) {
    prefs.push({ key: 'active_time', value: 'Most active in the evening' });
  }

  return prefs;
}

// ─── Longitudinal trend detection ────────────────────────────────────────────

interface Trend {
  type: string;
  description: string;
  confidence: number;
  periodStart: string;
  periodEnd: string;
  data: Record<string, unknown>;
}

function detectTrends(
  entries: { content: string; context_key: string | null; created_at: string }[],
): Trend[] {
  const trends: Trend[] = [];
  if (entries.length < 10) return trends;

  const now = new Date().toISOString();
  const oldest = entries[entries.length - 1]?.created_at ?? now;

  // Split into two halves (older half vs recent half)
  const mid = Math.floor(entries.length / 2);
  const olderHalf = entries.slice(mid);
  const recentHalf = entries.slice(0, mid);

  const countMatches = (arr: typeof entries, pattern: RegExp) =>
    arr.filter((e) => pattern.test(e.content)).length;

  // Sleep trend
  const sleepOlder = countMatches(olderHalf, /sleep|tired|rest/i);
  const sleepRecent = countMatches(recentHalf, /sleep|tired|rest/i);
  if (sleepRecent > sleepOlder * 1.5 && sleepRecent >= 2) {
    trends.push({
      type: 'sleep_concern',
      description: 'Sleep mentions have increased recently — you may be dealing with rest issues',
      confidence: 0.65,
      periodStart: oldest,
      periodEnd: now,
      data: { older: sleepOlder, recent: sleepRecent },
    });
  }

  // Work stress trend
  const stressOlder = countMatches(olderHalf, /stress|overwhelm|busy|hectic/i);
  const stressRecent = countMatches(recentHalf, /stress|overwhelm|busy|hectic/i);
  if (stressRecent > stressOlder * 1.5 && stressRecent >= 2) {
    trends.push({
      type: 'stress_increase',
      description: 'Stress-related topics have increased over the past few weeks',
      confidence: 0.7,
      periodStart: oldest,
      periodEnd: now,
      data: { older: stressOlder, recent: stressRecent },
    });
  }

  // Positive momentum
  const positiveOlder = countMatches(olderHalf, /achiev|complet|win|success|progress/i);
  const positiveRecent = countMatches(recentHalf, /achiev|complet|win|success|progress/i);
  if (positiveRecent > positiveOlder && positiveRecent >= 2) {
    trends.push({
      type: 'positive_momentum',
      description: 'You\'ve been on a positive streak — achievements and completions are up',
      confidence: 0.75,
      periodStart: oldest,
      periodEnd: now,
      data: { older: positiveOlder, recent: positiveRecent },
    });
  }

  return trends;
}

// ─── Scheduler — runs daily, processes users due for weekly analysis ──────────

export function startMemoryAnalysisScheduler(): void {
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  async function tick() {
    try {
      // Find users who either have never had analysis or haven't had it in 7+ days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const users = await db
        .prepare(
          `SELECT DISTINCT u.id FROM users u
           LEFT JOIN (
             SELECT user_id, MAX(ran_at) as last_run
             FROM memory_job_runs WHERE job_type = 'weekly_analysis' AND status = 'completed'
             GROUP BY user_id
           ) j ON j.user_id = u.id
           WHERE j.last_run IS NULL OR j.last_run < ?`,
        )
        .all(sevenDaysAgo) as { id: string }[];

      for (const user of users) {
        // Check they have enough episodic data before running
        const count = await db
          .prepare(`SELECT COUNT(*) as n FROM user_memories WHERE user_id = ? AND namespace = 'episodic'`)
          .get(user.id) as { n: number } | undefined;
        if ((count?.n ?? 0) >= 3) {
          runMemoryAnalysis(user.id).catch((err) =>
            console.error(`[memory] analysis failed for ${user.id}:`, err),
          );
        }
      }
    } catch (err) {
      console.error('[memory] scheduler tick error:', err);
    }
  }

  // Run immediately on startup, then every 24h
  setTimeout(tick, 30_000); // 30-second delay on startup
  setInterval(tick, INTERVAL_MS);
  console.log('[memory] Analysis scheduler started (daily tick, 7-day user cadence)');
}
