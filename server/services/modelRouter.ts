/**
 * Model Router — Phase 3 Step 3
 * Propel Stack AI, LLC
 *
 * Intelligence layer wrapping the AI gateway.
 * Classifies every incoming message BEFORE routing to a provider.
 *
 * Task categories → model assignment:
 *   crisis         → claude-sonnet (hardcoded; warmest, most careful)
 *   finance        → claude-sonnet (nuanced reasoning)
 *   research       → claude-sonnet (depth)
 *   code           → gpt-mini (fast, cheap)
 *   quick_lookup   → gpt-mini (fast, cheap)
 *   creative       → gpt-mini (fluent)
 *   general        → gpt-mini (default)
 *   vision/multimodal → gemini-flash (future)
 *
 * Routing decision is logged for PostHog + cost visibility.
 * Falls back to quick_lookup on classifier failure (never throws).
 *
 * Classifier adds ~200–400ms per message — results are cached per session.
 */

import { complete, type ModelId, type AssistantMode } from '../ai-gateway.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskCategory =
  | 'crisis'
  | 'finance'
  | 'research'
  | 'code'
  | 'creative'
  | 'quick_lookup'
  | 'general';

interface RoutingDecision {
  category: TaskCategory;
  model: ModelId;
  mode: AssistantMode;
  confidence: number;
  cached: boolean;
}

interface RouteLogEntry {
  category: TaskCategory;
  model: ModelId;
  confidence: number;
  timestamp: number;
}

// ─── Session-level classification cache ──────────────────────────────────────
// key = sessionId, value = last routing decision
const sessionCache = new Map<string, RouteLogEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(sessionId: string): RouteLogEntry | null {
  const entry = sessionCache.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    sessionCache.delete(sessionId);
    return null;
  }
  return entry;
}

// ─── Rule-based pre-classifier (fast, zero latency) ─────────────────────────

const CRISIS_WORDS = ['suicide', 'kill myself', 'hurt myself', 'end my life', 'want to die', 'overdose'];
const FINANCE_WORDS = ['invest', 'stock', 'budget', 'debt', 'savings', 'mortgage', 'tax', 'retirement', '401k', 'ira', 'portfolio', 'dividend', 'compound', 'net worth'];
const CODE_WORDS = ['code', 'function', 'bug', 'script', 'python', 'javascript', 'typescript', 'debug', 'api', 'sql', 'regex', 'algorithm', 'git'];
const RESEARCH_WORDS = ['explain', 'research', 'study', 'analyze', 'compare', 'what is', 'how does', 'why does', 'evidence', 'literature'];
const CREATIVE_WORDS = ['write', 'story', 'poem', 'email', 'draft', 'creative', 'brainstorm', 'ideas', 'caption', 'bio'];

function ruleBasedClassify(message: string): { category: TaskCategory; confidence: number } | null {
  const lower = message.toLowerCase();

  if (CRISIS_WORDS.some((w) => lower.includes(w)))   return { category: 'crisis',       confidence: 0.99 };
  if (FINANCE_WORDS.some((w) => lower.includes(w)))   return { category: 'finance',      confidence: 0.85 };
  if (CODE_WORDS.some((w) => lower.includes(w)))      return { category: 'code',         confidence: 0.80 };
  if (RESEARCH_WORDS.some((w) => lower.includes(w)))  return { category: 'research',     confidence: 0.75 };
  if (CREATIVE_WORDS.some((w) => lower.includes(w)))  return { category: 'creative',     confidence: 0.75 };

  return null;
}

// ─── Model mapping ────────────────────────────────────────────────────────────

const CATEGORY_MODEL: Record<TaskCategory, ModelId> = {
  crisis:       'claude-sonnet',
  finance:      'claude-sonnet',
  research:     'claude-sonnet',
  code:         'gpt-mini',
  creative:     'gpt-mini',
  quick_lookup: 'gpt-mini',
  general:      'gpt-mini',
};

const CATEGORY_MODE: Record<TaskCategory, AssistantMode> = {
  crisis:       'general',
  finance:      'finance',
  research:     'research',
  code:         'code',
  creative:     'writing',
  quick_lookup: 'general',
  general:      'general',
};

// ─── AI-based classifier (used when rules don't match) ───────────────────────

async function aiClassify(message: string): Promise<{ category: TaskCategory; confidence: number }> {
  try {
    const result = complete({
      prompt: `Classify this user message into exactly one category. Message: "${message.slice(0, 300)}"
Categories: crisis, finance, research, code, creative, quick_lookup, general
Respond ONLY with JSON: { "category": string, "confidence": 0.0-1.0 }`,
      model: 'gpt-mini',
      maxTokens: 40,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { category: TaskCategory; confidence: number };
      if (parsed.category && parsed.confidence) return parsed;
    }
  } catch { /* fall through */ }

  return { category: 'quick_lookup', confidence: 0.5 };
}

// ─── Main routing function ────────────────────────────────────────────────────

/**
 * Classify and route a message to the optimal model.
 *
 * @param message  The user's message text
 * @param sessionId  Used for caching (optional — pass conversation ID)
 * @returns RoutingDecision with model + mode to use
 */
export async function routeMessage(
  message: string,
  sessionId?: string,
): Promise<RoutingDecision> {
  // 1. Check session cache (same topic, same session = same model)
  if (sessionId) {
    const cached = getCached(sessionId);
    if (cached && cached.category !== 'crisis') {
      return {
        category: cached.category,
        model: CATEGORY_MODEL[cached.category],
        mode: CATEGORY_MODE[cached.category],
        confidence: cached.confidence,
        cached: true,
      };
    }
  }

  // 2. Fast rule-based check
  const ruleResult = ruleBasedClassify(message);
  let category: TaskCategory;
  let confidence: number;

  if (ruleResult && ruleResult.confidence >= 0.75) {
    category = ruleResult.category;
    confidence = ruleResult.confidence;
  } else {
    // 3. AI-based classifier (slower but smarter)
    const aiResult = await aiClassify(message);
    category = aiResult.category;
    confidence = aiResult.confidence;
  }

  // 4. Cache decision
  if (sessionId) {
    sessionCache.set(sessionId, { category, model: CATEGORY_MODEL[category], confidence, timestamp: Date.now() });
  }

  return {
    category,
    model: CATEGORY_MODEL[category],
    mode: CATEGORY_MODE[category],
    confidence,
    cached: false,
  };
}

/**
 * Convenience: given a routing decision, get the system prompt prefix
 * that primes the model for the detected category.
 */
export function categorySystemPrompt(category: TaskCategory): string {
  const MAP: Record<TaskCategory, string> = {
    crisis:       'You are a compassionate, careful support companion. Never suggest dangerous actions. Always validate feelings and offer professional resources.',
    finance:      'You are a knowledgeable financial guide. Be precise, cite principles, add disclaimers where appropriate. Never give personalized investment advice.',
    research:     'You are a thorough research assistant. Cite reasoning, acknowledge uncertainty, distinguish fact from speculation.',
    code:         'You are a pragmatic software engineer. Write clean, working code with brief explanations. Prefer existing patterns over new abstractions.',
    creative:     'You are a creative collaborator. Be expressive, varied, and original. Match the user\'s tone.',
    quick_lookup: 'You are a fast, accurate assistant. Give direct answers without unnecessary preamble.',
    general:      'You are a helpful life assistant. Be warm, practical, and concise.',
  };
  return MAP[category] ?? MAP.general;
}
