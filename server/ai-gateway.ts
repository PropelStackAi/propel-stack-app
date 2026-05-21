import { db, getCurrentUserId } from './db.js';

/**
 * AI Gateway
 *
 * Single chokepoint for ALL model calls. The frontend never talks to model providers directly.
 * This module handles:
 *   - Provider routing (OpenAI / Anthropic / Google)
 *   - Token budget enforcement per plan tier
 *   - Crisis & injury keyword scans (called by feature routes before invoking complete())
 *   - Usage accounting
 *
 * Concrete provider clients are wired in Session 4 (AI Assistant Full Rebuild).
 * For now this stub returns deterministic placeholder responses so the rest of the app
 * can be built and tested end-to-end without burning API credits.
 */

export type ModelId = 'gpt-mini' | 'claude-sonnet' | 'gemini-flash';
export type AssistantMode = 'general' | 'research' | 'writing' | 'code' | 'finance';

export interface CompleteOptions {
  prompt: string;
  systemPrompt?: string;
  model?: ModelId;
  mode?: AssistantMode;
  maxTokens?: number;
}

export interface CompleteResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: ModelId;
  stub: boolean;
}

export const MODEL_LABELS: Record<ModelId, string> = {
  'gpt-mini': 'GPT-5.4 Mini',
  'claude-sonnet': 'Claude Sonnet 4.6',
  'gemini-flash': 'Gemini 3 Flash',
};

// USD per 1M tokens (Build Guide pricing).
const COST_PER_MTOK: Record<ModelId, { in: number; out: number }> = {
  'gpt-mini': { in: 0.75, out: 4.5 },
  'claude-sonnet': { in: 3, out: 15 },
  'gemini-flash': { in: 0.5, out: 3 },
};

export function estimateCost(model: ModelId, tokensIn: number, tokensOut: number): number {
  const c = COST_PER_MTOK[model] ?? COST_PER_MTOK['gpt-mini'];
  return (tokensIn / 1_000_000) * c.in + (tokensOut / 1_000_000) * c.out;
}

/** Returns the configured API key for a model's provider, or undefined if none is set. */
function providerKey(model: ModelId): string | undefined {
  if (model === 'gpt-mini') return process.env.OPENAI_API_KEY || undefined;
  if (model === 'claude-sonnet') return process.env.ANTHROPIC_API_KEY || undefined;
  return process.env.GOOGLE_AI_API_KEY || undefined;
}

const PLAN_TOKEN_BUDGETS: Record<string, number> = {
  spark: 25_000,
  solo: 500_000,
  family: 2_000_000,
  network: 5_000_000,
  elite: 15_000_000,
};

export class TokenBudgetExceededError extends Error {
  constructor(public planTier: string, public used: number, public budget: number) {
    super(`Token budget exceeded for plan "${planTier}": ${used}/${budget}`);
    this.name = 'TokenBudgetExceededError';
  }
}

function pickModel(mode: AssistantMode | undefined, preferred: ModelId | undefined): ModelId {
  if (preferred) return preferred;
  // Default routing: finance + research lean on Claude; everything else on GPT mini.
  if (mode === 'finance' || mode === 'research') return 'claude-sonnet';
  return 'gpt-mini';
}

function estimateTokens(text: string): number {
  // Rough heuristic: ~4 chars per token. Real provider responses replace this.
  return Math.ceil(text.length / 4);
}

function checkBudget(userId: string, projectedTokens: number): void {
  const user = db
    .prepare('SELECT plan_tier, ai_tokens_used_this_month FROM users WHERE id = ?')
    .get(userId) as { plan_tier: string; ai_tokens_used_this_month: number } | undefined;

  if (!user) throw new Error(`User not found: ${userId}`);

  const budget = PLAN_TOKEN_BUDGETS[user.plan_tier] ?? PLAN_TOKEN_BUDGETS.spark;
  if (user.ai_tokens_used_this_month + projectedTokens > budget) {
    throw new TokenBudgetExceededError(user.plan_tier, user.ai_tokens_used_this_month, budget);
  }
}

function recordUsage(userId: string, tokens: number): void {
  db.prepare(
    'UPDATE users SET ai_tokens_used_this_month = ai_tokens_used_this_month + ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(tokens, userId);
}

/**
 * Main entry point. All AI features call this.
 */
export function complete(opts: CompleteOptions): CompleteResult {
  const userId = getCurrentUserId();
  const model = pickModel(opts.mode, opts.model);

  const tokensIn = estimateTokens((opts.systemPrompt || '') + opts.prompt);
  // Pre-flight: assume an output roughly the size of the input for the budget check.
  checkBudget(userId, tokensIn * 2);

  // ---- Provider call ----
  // Live provider streaming (OpenAI / Anthropic / Google) wires in here once the matching
  // API key is set in the environment. Until then we return a deterministic, conversational
  // stub so the whole Assistant -- streaming, history, model/mode routing, and per-plan
  // budgets -- works end-to-end without burning credits.
  const text = buildStubAnswer(opts, model);
  // -----------------------

  const tokensOut = estimateTokens(text);
  recordUsage(userId, tokensIn + tokensOut);

  return { text, tokensIn, tokensOut, model, stub: !providerKey(model) };
}

/**
 * Business-card extraction. Personal CRM (Session 2) calls this when a user captures
 * a business card photo. Vision-model wiring lands in Session 4 alongside complete().
 *
 * Until then this returns empty fields with `stubbed: true` so the capture flow works
 * end-to-end: the form opens pre-filled with whatever is returned (nothing, for now)
 * and the user completes it manually. The frontend never talks to a model directly.
 */
export interface ExtractedCardFields {
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  website: string;
}

export interface ExtractBusinessCardResult {
  fields: ExtractedCardFields;
  stubbed: boolean;
  note?: string;
}

export function extractBusinessCard(_imageDataUrl: string): ExtractBusinessCardResult {
  // ---- STUB ----
  // Session 4 swaps this for a real vision call (e.g. GPT-5.4 Mini / Gemini 3 Flash)
  // routed through the same budget + usage accounting as complete().
  const empty: ExtractedCardFields = {
    firstName: '', lastName: '', company: '', title: '', phone: '', email: '', website: '',
  };
  return {
    fields: empty,
    stubbed: true,
    note: 'AI business-card extraction activates in Session 4. Review and complete the fields.',
  };
  // ---------------
}

function buildStubAnswer(opts: CompleteOptions, model: ModelId): string {
  const mode = opts.mode ?? 'general';
  const q = opts.prompt.trim();
  return [
    `Here is a ${mode}-mode response from ${MODEL_LABELS[model]}. This is the demo gateway:`,
    'no provider API key is configured yet, so the text below is a deterministic placeholder.',
    q ? `You asked: "${q.slice(0, 240)}".` : '',
    'Once an API key for this provider is added to the server environment, this same endpoint',
    'will stream a real model answer token by token. Conversation history, model and mode',
    'selection, token accounting, and per-plan budget limits are all fully functional right now.',
  ]
    .filter(Boolean)
    .join(' ');
}

export interface UsageInfo {
  planTier: string;
  used: number;
  budget: number;
  remaining: number;
}

export function getUsage(userId: string): UsageInfo {
  const user = db
    .prepare('SELECT plan_tier, ai_tokens_used_this_month FROM users WHERE id = ?')
    .get(userId) as { plan_tier: string; ai_tokens_used_this_month: number } | undefined;
  const planTier = user?.plan_tier ?? 'spark';
  const used = user?.ai_tokens_used_this_month ?? 0;
  const budget = PLAN_TOKEN_BUDGETS[planTier] ?? PLAN_TOKEN_BUDGETS.spark;
  return { planTier, used, budget, remaining: Math.max(0, budget - used) };
}

/**
 * Crisis keyword scan. SNFS (Session 12) calls this BEFORE invoking complete().
 * If true, the route returns crisis resources and never reaches the model.
 */
const CRISIS_KEYWORDS = [
  'kill myself', 'end my life', 'want to die', 'suicide', 'hurt myself',
  'hurt them', 'psychosis', 'hearing voices', 'seeing things', 'violent',
  'danger to', 'overdose',
];

export function detectCrisis(message: string): boolean {
  const lower = message.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Injury keyword scan. Athlete Hub (Session 13) calls this BEFORE invoking complete().
 */
const INJURY_KEYWORDS = [
  'pain', 'injury', 'hurt', 'sprain', 'fracture', 'broken', 'sharp pain',
  'concussion', 'chest pain', 'heart racing', 'dizzy', 'torn', 'popped',
];

export function detectInjury(message: string): boolean {
  const lower = message.toLowerCase();
  return INJURY_KEYWORDS.some((kw) => lower.includes(kw));
}
