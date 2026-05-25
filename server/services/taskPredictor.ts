/**
 * Task Predictor — Phase 3 Step 2
 * Propel Stack AI, LLC
 *
 * Predictive task surfacing service.
 * Triggered on session.started — reads recent events, goals, and memories
 * to predict the single most relevant task for the user right now.
 *
 * Confidence threshold: 0.7 — below this we stay silent.
 * Max 1 prediction per session (enforced by caller).
 *
 * Emits: task.predicted → in-app notification (handled by notifications route)
 */

import { db } from '../db.js';
import { complete } from '../ai-gateway.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PredictedTask {
  task: string;
  reason: string;
  confidence: number; // 0–1
  source: 'goal' | 'pattern' | 'event' | 'memory';
}

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Builds a context string from the user's recent goals, events, and memories
 * then asks the AI to predict the single most important task.
 */
export async function predictNextTask(userId: string): Promise<PredictedTask | null> {
  try {
    // Gather context
    const goals = db
      .prepare(`SELECT title, status, priority FROM goals WHERE user_id = ? AND status = 'active' ORDER BY priority DESC, updated_at DESC LIMIT 5`)
      .all(userId) as unknown as { title: string; status: string; priority: string }[];

    const recentMemories = db
      .prepare(`SELECT content FROM user_memories WHERE user_id = ? AND namespace = 'procedural' AND is_stale = FALSE ORDER BY created_at DESC LIMIT 5`)
      .all(userId) as unknown as { content: string }[];

    const recentEvents = db
      .prepare(`SELECT title, event_date FROM life_events WHERE user_id = ? ORDER BY event_date DESC LIMIT 3`)
      .all(userId) as unknown as { title: string; event_date: string }[];

    // If no goals, no useful prediction possible
    if (!goals.length && !recentMemories.length) return null;

    const goalContext = goals.map((g) => `- ${g.title} (${g.priority} priority)`).join('\n');
    const memoryContext = recentMemories.map((m) => `- ${m.content}`).join('\n');
    const eventContext = (recentEvents ?? []).map((e) => `- ${e.title}`).join('\n');
    const timeOfDay = (() => {
      const h = new Date().getHours();
      if (h < 12) return 'morning';
      if (h < 17) return 'afternoon';
      return 'evening';
    })();

    const prompt = [
      `It is ${timeOfDay}. The user just opened their Life OS app.`,
      goalContext ? `Active goals:\n${goalContext}` : '',
      memoryContext ? `Known patterns:\n${memoryContext}` : '',
      eventContext ? `Recent events:\n${eventContext}` : '',
      '',
      'Predict the single most important task the user should do right now.',
      'Respond in JSON: { "task": string, "reason": string (1 sentence), "confidence": 0.0-1.0, "source": "goal"|"pattern"|"event"|"memory" }',
      'Only predict if confidence >= 0.7. If not confident, respond: { "task": null }',
    ].filter(Boolean).join('\n');

    const result = complete({
      prompt,
      systemPrompt: 'You are a predictive life assistant. Be specific and actionable. Never be generic.',
      model: 'gpt-mini',
      maxTokens: 120,
    });

    // Parse AI response
    let parsed: { task?: string | null; reason?: string; confidence?: number; source?: PredictedTask['source'] } = { task: null };
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch { /* unparseable — skip */ }

    if (!parsed.task || (parsed.confidence ?? 0) < 0.7) return null;

    return {
      task: parsed.task,
      reason: parsed.reason ?? '',
      confidence: parsed.confidence ?? 0.7,
      source: parsed.source ?? 'goal',
    };
  } catch (err) {
    console.error('[taskPredictor] Error:', err);
    return null;
  }
}

/**
 * Check whether a prediction has already been made this session.
 * Callers should pass the session ID (or a daily timestamp as a simple guard).
 */
export function shouldPredict(userId: string): boolean {
  try {
    const last = db
      .prepare(`SELECT created_at FROM memory_audit_log WHERE user_id = ? AND action = 'task_predicted' ORDER BY created_at DESC LIMIT 1`)
      .get(userId) as unknown as { created_at: string } | undefined;

    if (!last) return true;

    const lastMs = new Date(last.created_at).getTime();
    const hoursSince = (Date.now() - lastMs) / (1000 * 60 * 60);
    return hoursSince >= 4; // Max 1 prediction per 4-hour window
  } catch {
    return true;
  }
}

/**
 * Record that a prediction was made (for rate-limiting and audit).
 */
export function recordPrediction(userId: string, task: PredictedTask): void {
  try {
    db.prepare(
      `INSERT INTO memory_audit_log (id, user_id, action, details, created_at)
       VALUES (?, ?, 'task_predicted', ?, datetime('now'))`
    ).run(
      crypto.randomUUID(),
      userId,
      JSON.stringify({ task: task.task, confidence: task.confidence, source: task.source }),
    );
  } catch { /* non-fatal */ }
}
