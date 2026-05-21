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

  // ---- STUB ----
  // Real provider call goes here in Session 4. For now we return a deterministic placeholder
  // so feature work in Sessions 2, 3, 5, 7 etc. can proceed.
  const text = `[ai-gateway stub | model=${model} | mode=${opts.mode ?? 'general'}] ${opts.prompt.slice(0, 200)}`;
  // ---------------

  const tokensOut = estimateTokens(text);
  recordUsage(userId, tokensIn + tokensOut);

  return { text, tokensIn, tokensOut, model };
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
