// AI Assistant shared types + constants (Session 4).

export const MODELS = ['gpt-mini', 'claude-sonnet', 'gemini-flash'] as const;
export type Model = (typeof MODELS)[number];
export const MODES = ['general', 'research', 'writing', 'code', 'finance'] as const;
export type Mode = (typeof MODES)[number];

export interface Conversation {
  id: string;
  title: string;
  model: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  rating: number;
  createdAt: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface Usage {
  planTier: string;
  used: number;
  budget: number;
  remaining: number;
}

export interface DoneEvent {
  id: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  modelLabel: string;
  cost: number;
  stub: boolean;
}

export const MODEL_OPTIONS: Array<{ id: Model; label: string; hint: string }> = [
  { id: 'gpt-mini', label: 'GPT-5.4 Mini', hint: 'Fast' },
  { id: 'claude-sonnet', label: 'Claude Sonnet 4.6', hint: 'Thorough' },
  { id: 'gemini-flash', label: 'Gemini 3 Flash', hint: 'Quick lookups' },
];
export const MODEL_LABELS: Record<string, string> = {
  'gpt-mini': 'GPT-5.4 Mini',
  'claude-sonnet': 'Claude Sonnet 4.6',
  'gemini-flash': 'Gemini 3 Flash',
};

export const MODE_OPTIONS: Array<{ id: Mode; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'research', label: 'Research' },
  { id: 'writing', label: 'Writing' },
  { id: 'code', label: 'Code' },
  { id: 'finance', label: 'Finance' },
];

export const SUGGESTED_PROMPTS: Record<Mode, string[]> = {
  general: ['Plan my week around 3 priorities', 'Summarize this idea in plain English', 'Give me a packing list for a weekend trip'],
  research: ['Compare two options with pros and cons', 'Explain this topic like I am new to it', 'What questions should I ask before deciding?'],
  writing: ['Draft a friendly follow-up email', 'Rewrite this to be more concise', 'Suggest 5 titles for this post'],
  code: ['Explain this error message', 'Write a function to debounce calls', 'Review this snippet for bugs'],
  finance: ['How does compound interest work?', 'What is an emergency fund?', 'Explain index funds simply'],
};

// USD per 1M tokens (mirror of the gateway) for per-message cost display.
const COST: Record<string, { in: number; out: number }> = {
  'gpt-mini': { in: 0.75, out: 4.5 },
  'claude-sonnet': { in: 3, out: 15 },
  'gemini-flash': { in: 0.5, out: 3 },
};
export function messageCost(model: string, tokensIn: number, tokensOut: number): number {
  const c = COST[model] ?? COST['gpt-mini'];
  return (tokensIn / 1_000_000) * c.in + (tokensOut / 1_000_000) * c.out;
}

export const UPGRADE_HINT: Record<string, string> = {
  spark: 'Upgrade to Solo for 500K tokens.',
  solo: 'Upgrade to Family for 2M tokens.',
  family: 'Upgrade to Network for 5M tokens.',
  network: 'Upgrade to Elite for 15M tokens.',
  elite: '',
};
