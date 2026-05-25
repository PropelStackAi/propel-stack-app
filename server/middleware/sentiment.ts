/**
 * Sentiment Middleware — Phase 2 Step 7
 * Propel Stack AI, LLC
 *
 * Runs on every AI message request. Scores the message for:
 *  1. Crisis keywords → return hardcoded crisis resources (never AI-generated)
 *  2. Low sentiment → activate compassionate mode flag for the AI response
 *  3. Session sentiment score → updated after each message for trend tracking
 *
 * SAFETY RULE: Crisis resources are ALWAYS hardcoded strings. The AI model
 * never generates crisis responses — this middleware intercepts and returns
 * before the model call is made.
 */

import { type Request, type Response, type NextFunction } from 'express';
import { db, getCurrentUserId } from '../db.js';

// ─── Crisis keywords (hardcoded — never AI) ───────────────────────────────────

const CRISIS_KEYWORDS = [
  'kill myself', 'kill my self', 'end my life', 'want to die', 'wish i was dead',
  'suicide', 'suicidal', 'hurt myself', 'harm myself', 'self harm', 'self-harm',
  'cut myself', 'overdose', 'od on', 'end it all', 'no reason to live',
  'not worth living', 'psychosis', 'hearing voices', 'seeing things', 'violent thoughts',
  'danger to myself', 'danger to others',
];

const CRISIS_RESPONSE = {
  crisis: true,
  message: [
    "I'm really glad you reached out, and I want you to know you're not alone.",
    'Please connect with someone who can help right now:',
  ].join(' '),
  resources: [
    { name: '988 Suicide & Crisis Lifeline',    contact: 'Call or text 988',           url: 'https://988lifeline.org' },
    { name: 'Crisis Text Line',                  contact: 'Text HOME to 741741',        url: 'https://www.crisistextline.org' },
    { name: 'International Association for Suicide Prevention', contact: 'https://www.iasp.info/resources/Crisis_Centres/', url: 'https://www.iasp.info/resources/Crisis_Centres/' },
    { name: 'Emergency Services',                contact: 'Call 911 (US) or your local emergency number', url: null },
  ],
  note: 'Your AI assistant is paused. Please reach out to one of the resources above.',
} as const;

// ─── Low-sentiment patterns ───────────────────────────────────────────────────

const NEGATIVE_PATTERNS = [
  /\b(depressed|depression|hopeless|worthless|empty|numb|exhausted|overwhelmed|burned?\s?out)\b/i,
  /\b(can'?t cope|falling apart|breaking down|lost it|at my limit|too much)\b/i,
  /\b(anxious|anxiety|panic|scared|terrified|paralyzed)\b/i,
];

const POSITIVE_PATTERNS = [
  /\b(great|amazing|fantastic|excited|proud|happy|grateful|accomplished|motivated|energized)\b/i,
  /\b(love|thrilled|stoked|pumped|winning|crushed it|nailed it)\b/i,
];

function scoreSentiment(text: string): number {
  // Returns -1 (very negative) to +1 (very positive); 0 = neutral
  const lower = text.toLowerCase();
  let score = 0;
  NEGATIVE_PATTERNS.forEach((p) => { if (p.test(lower)) score -= 0.25; });
  POSITIVE_PATTERNS.forEach((p) => { if (p.test(lower)) score += 0.25; });
  return Math.max(-1, Math.min(1, score));
}

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * sentimentMiddleware — attach to POST /api/ai-chat/message and POST /api/assistant/message
 *
 * Adds to req:
 *   req.sentimentScore: number (-1 to 1)
 *   req.compassionateMode: boolean
 *
 * Intercepts and returns early if crisis detected.
 */
export function sentimentMiddleware(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Record<string, unknown> | null;
  const text = typeof body?.message === 'string' ? body.message
             : typeof body?.content === 'string' ? body.content
             : '';

  if (!text) { next(); return; }

  // ── Crisis check — ALWAYS hardcoded, never AI ─────────────────────────────
  if (detectCrisis(text)) {
    // Log crisis event (non-blocking)
    try {
      const userId = getCurrentUserId();
      db.prepare(
        `INSERT OR IGNORE INTO memory_audit_log (id, user_id, action, details, created_at)
         VALUES (?, ?, 'crisis_detected', '{"source":"sentiment_middleware"}', datetime('now'))`
      ).run(crypto.randomUUID(), userId);
    } catch { /* non-fatal */ }

    res.status(200).json(CRISIS_RESPONSE);
    return;
  }

  // ── Sentiment scoring ─────────────────────────────────────────────────────
  const score = scoreSentiment(text);
  const compassionateMode = score <= -0.25;

  // Attach to request for downstream handlers
  (req as Request & { sentimentScore?: number; compassionateMode?: boolean }).sentimentScore = score;
  (req as Request & { sentimentScore?: number; compassionateMode?: boolean }).compassionateMode = compassionateMode;

  // Persist session sentiment (non-blocking)
  try {
    const userId = getCurrentUserId();
    db.prepare(
      `UPDATE users SET updated_at = datetime('now') WHERE id = ?`
    ).run(userId);
    // In future: upsert session_sentiment table for trend tracking
  } catch { /* non-fatal */ }

  next();
}

// Re-export crisis detector so ai-gateway.ts can call it without double-import
export { detectCrisis };
