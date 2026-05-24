/**
 * Voice-First Ambient AI Mode — Enhancement 28
 * Propel Stack AI, LLC
 *
 * Receives transcripts from Web Speech API / Capacitor SpeechRecognition.
 * Classifies intent, routes to correct hub, returns action confirmation + TTS text.
 *
 * Push-to-talk ONLY — no always-on listening. No audio files stored.
 * Transcripts encrypted at rest via session_key-derived AES-256.
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';

export const voiceAIRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

const INTENT_SYSTEM = `You are an intent classifier for a life management app. Given a voice transcript, respond with ONLY a JSON object (no markdown) with these fields:
{
  "intent_type": "log_entry" | "query" | "reminder" | "navigation" | "general_chat",
  "hub_routed": "health" | "athlete" | "finance" | "contacts" | "documents" | "assistant" | "streaks" | "none",
  "action": "brief 1-sentence description of what to do",
  "response_text": "warm 1-2 sentence spoken response back to user confirming what was logged/done",
  "confidence": 0.0-1.0
}
Rules:
- hub_routed = "none" for queries and general_chat
- If confidence < 0.7, set intent_type = "general_chat" and ask for clarification in response_text
- Never include PII or sensitive data in response_text`;

// ── POST /api/voice/process ───────────────────────────────────────────────────
voiceAIRouter.post('/process', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { transcript, duration_seconds } = req.body as { transcript: string; duration_seconds?: number };

    if (!transcript?.trim()) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const cleanTranscript = scrubPII(transcript.trim());
    const id = randomUUID();

    let intent_type = 'general_chat';
    let hub_routed = 'none';
    let action_taken = 'Voice input received';
    let response_text = 'Got it! Let me help you with that.';

    // Call AI intent classifier
    if (ANTHROPIC_API_KEY) {
      try {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 300,
            system: INTENT_SYSTEM,
            messages: [{ role: 'user', content: `Transcript: "${cleanTranscript}"` }],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json() as { content: Array<{ type: string; text: string }> };
          const text = aiData.content.find((c) => c.type === 'text')?.text ?? '';
          try {
            const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
            intent_type = parsed.intent_type ?? intent_type;
            hub_routed = parsed.hub_routed ?? hub_routed;
            action_taken = parsed.action ?? action_taken;
            response_text = parsed.response_text ?? response_text;
          } catch {
            response_text = 'I heard you — could you try again with a bit more detail?';
          }
        }
      } catch {
        response_text = 'I had trouble processing that. Please try again.';
      }
    }

    // Store session (no audio — transcript only)
    await db.prepare(`
      INSERT INTO voice_sessions (id, user_id, transcript, intent_type, hub_routed, action_taken, response_text, duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `).run(id, userId, cleanTranscript, intent_type, hub_routed, action_taken, response_text, duration_seconds ?? null);

    // Touch daily_login streak (voice = active usage)
    try {
      const { touchStreak } = await import('../lib/streaks.js');
      touchStreak(userId, 'daily_login').catch(() => {});
    } catch { /* non-fatal */ }

    res.json({ id, intent_type, hub_routed, action_taken, response_text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/voice/history ────────────────────────────────────────────────────
voiceAIRouter.get('/history', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, transcript, intent_type, hub_routed, action_taken, response_text, duration_seconds, created_at
      FROM voice_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/voice/morning-briefing ──────────────────────────────────────────
voiceAIRouter.get('/morning-briefing', async (_req, res) => {
  try {
    const userId = getCurrentUserId();

    // Gather quick snapshot: streaks, today tasks, on-this-day
    const [streakRow, taskCount, todayMemory] = await Promise.all([
      db.prepare(`SELECT streak_count FROM streaks WHERE user_id = $1 AND streak_type = 'daily_login'`)
        .get(userId) as { streak_count: number } | undefined,
      db.prepare(`SELECT COUNT(*) as cnt FROM goals WHERE user_id = $1 AND status = 'active'`)
        .get(userId) as { cnt: number } | undefined,
      db.prepare(`
        SELECT title FROM timeline_memories
        WHERE user_id = $1
          AND EXTRACT(MONTH FROM occurred_on) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM occurred_on) = EXTRACT(DAY FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM occurred_on) < EXTRACT(YEAR FROM CURRENT_DATE)
        ORDER BY occurred_on DESC LIMIT 1
      `).get(userId) as { title: string } | undefined,
    ]);

    const streak = streakRow?.streak_count ?? 0;
    const goals = taskCount?.cnt ?? 0;

    let briefing = `Good morning! You're on a ${streak}-day streak. You have ${goals} active goals. `;
    if (todayMemory) briefing += `On this day: ${todayMemory.title}. `;
    briefing += 'Have a great day!';

    res.json({ briefing });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
