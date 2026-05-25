/**
 * AI Safety Scanner — Propel Stack AI, LLC
 *
 * Enhancement 13: No Toxic Productivity Signals
 * Enhancement 14: AI Hallucination Guardrails
 * Enhancement 15: Sensitive Topic Detection
 * Enhancement 16: Crisis Escalation Protocol
 *
 * Central safety layer applied to ALL AI interactions.
 */

// ─── Enhancement 13: Anti-Toxic Productivity Guardrail ───────────────────────

/**
 * System prompt prefix injected into every AI call to prevent toxic productivity language.
 * Placed BEFORE the main system prompt so it takes highest priority.
 */
export const ANTI_TOXIC_GUARDRAIL = `IMPORTANT TONE RULES — always follow these:
- NEVER shame, guilt, or pressure the user. No "you should have", "why haven't you", "you're failing", "lazy", "you missed", "disappointing".
- NEVER compare the user unfavorably to others or to a perfect standard.
- NEVER use urgency or fear as motivation. No "time is running out", "you're falling behind", "everyone else is".
- DO use warm encouragement, celebrate small wins, and acknowledge real-life constraints.
- Progress, not perfection. Consistency, not intensity. Always.

`;

/** Toxic patterns and their replacements in AI-generated text */
const TOXIC_REPLACEMENTS: [RegExp, string][] = [
  [/you (should have|should've)/gi,       'you might consider'],
  [/why (haven't|have not) you/gi,        'when you get a chance'],
  [/you('re| are) (failing|falling behind)/gi, "you're making progress"],
  [/you('re| are) (lazy|procrastinating)/gi,   "you're taking things at your pace"],
  [/you missed/gi,                         'you paused on'],
  [/you need to/gi,                        'you could'],
  [/you must/gi,                           'it might help to'],
  [/you have to/gi,                        'one option is to'],
  [/stop being/gi,                         'try shifting toward being'],
  [/discipline yourself/gi,               'build a routine that works for you'],
];

/**
 * Scrubs toxic productivity language from an AI response.
 * Applied to all responses before returning to the client.
 */
export function scrubToxicLanguage(text: string): string {
  let result = text;
  for (const [pattern, replacement] of TOXIC_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ─── Enhancement 14: Hallucination Guardrails ────────────────────────────────

/**
 * System prompt suffix for finance/research mode to prevent hallucinated facts.
 */
export const HALLUCINATION_GUARD_FINANCE =
  'Always distinguish between general education and specific advice. When citing statistics, rates, or figures, add "approximately" or "as a general guideline." Never invent specific numbers, company names, or data. If uncertain, say so explicitly.';

export const HALLUCINATION_GUARD_RESEARCH =
  'When discussing facts, studies, or statistics: use hedged language ("research suggests", "studies have found", "according to available information"). Never fabricate citations, statistics, or specific figures. If you are uncertain, explicitly acknowledge it.';

/** Absolute certainty patterns that need caveating */
const CERTAINTY_PATTERNS: RegExp[] = [
  /\bguaranteed?\b/gi,
  /\b(100%|100 percent) (sure|certain|effective|accurate)\b/gi,
  /\bdefinitely will\b/gi,
  /\bprovably\b/gi,
  /\bscientifically proven to\b/gi,
  /\bwill definitely\b/gi,
];

const CAVEAT = ' (this is general guidance — verify with a qualified professional for your specific situation)';

/**
 * Adds appropriate caveats to responses containing absolute certainty language.
 * Only applied to finance and research modes where factual accuracy is critical.
 */
export function addHallucinationCaveats(text: string, mode: string): string {
  if (mode !== 'finance' && mode !== 'research') return text;

  let hasCertaintyLanguage = false;
  for (const pattern of CERTAINTY_PATTERNS) {
    if (pattern.test(text)) {
      hasCertaintyLanguage = true;
      break;
    }
  }

  if (hasCertaintyLanguage) {
    // Append caveat at end rather than inline to avoid breaking sentence flow
    return text + (text.endsWith('.') ? '' : '.') +
      '\n\n_Note: This response contains general information only. For decisions involving finance, health, or legal matters, consult a licensed professional._';
  }

  return text;
}

// ─── Enhancement 15: Sensitive Topic Detection ───────────────────────────────

export type SensitiveTopic =
  | 'crisis'
  | 'financial_distress'
  | 'relationship_distress'
  | 'grief_loss'
  | 'mental_health'
  | 'injury';

export interface SensitiveTopicResult {
  detected: boolean;
  topic: SensitiveTopic | null;
  severity: 'high' | 'medium' | 'low' | null;
  resources: string[];
  softResponse: string | null;
}

const SENSITIVE_PATTERNS: {
  topic: SensitiveTopic;
  severity: 'high' | 'medium' | 'low';
  keywords: string[];
  resources: string[];
  softResponse: string;
}[] = [
  {
    topic: 'crisis',
    severity: 'high',
    keywords: ['kill myself', 'end my life', 'want to die', 'suicide', 'hurt myself', 'hurt them',
      'psychosis', 'hearing voices', 'seeing things', 'violent', 'danger to', 'overdose'],
    resources: ['988 Suicide & Crisis Lifeline: call or text 988', 'Crisis Text Line: text HOME to 741741', 'Emergency: 911'],
    softResponse: "I can hear that you're going through something incredibly difficult. Please reach out to someone who can help right now — you don't have to face this alone.",
  },
  {
    topic: 'financial_distress',
    severity: 'medium',
    keywords: ['can\'t pay', 'losing my home', 'bankruptcy', 'evicted', 'debt collector', 'wage garnishment',
      'losing everything financially', 'can\'t afford food', 'homeless'],
    resources: ['211.org — local financial assistance', 'NFCC (nfcc.org) — free credit counseling', 'Benefits.gov — federal assistance programs'],
    softResponse: "Financial stress is real and heavy. Let's see what options are available to you — there are more resources than most people know about.",
  },
  {
    topic: 'relationship_distress',
    severity: 'high',
    keywords: ['abusing me', 'hitting me', 'scared of my partner', 'domestic violence', 'afraid to go home',
      'controlling me', 'stalking me', 'threatened me'],
    resources: ['National DV Hotline: 1-800-799-7233', 'TheHotline.org — safety planning', 'Text START to 88788'],
    softResponse: "Your safety is the most important thing. There are people trained to help with exactly this — please reach out.",
  },
  {
    topic: 'grief_loss',
    severity: 'medium',
    keywords: ['just lost my', 'died', 'passed away', 'grief', 'grieving', 'funeral', 'lost a loved one', 'bereavement'],
    resources: ['GriefShare.org — support groups', 'Psychology Today grief therapist finder'],
    softResponse: "I'm so sorry for your loss. Grief takes time, and there's no right way to move through it. I'm here to support you however I can.",
  },
  {
    topic: 'mental_health',
    severity: 'medium',
    keywords: ['severe depression', 'can\'t get out of bed', 'panic attacks', 'agoraphobia', 'ptsd', 'trauma',
      'dissociating', 'manic episode', 'bipolar', 'schizophrenia'],
    resources: ['SAMHSA helpline: 1-800-662-4357', 'NAMI: nami.org', 'Psychology Today therapist finder'],
    softResponse: "What you're experiencing sounds really hard. A mental health professional can provide the specific kind of support that makes a real difference — you deserve that care.",
  },
  {
    topic: 'injury',
    severity: 'high',
    keywords: ['chest pain', 'can\'t breathe', 'heart attack', 'stroke', 'unconscious', 'severe bleeding',
      'broken bone', 'head injury', 'concussion'],
    resources: ['Emergency: 911', 'Poison Control: 1-800-222-1222'],
    softResponse: "This sounds like a medical situation that needs immediate attention. Please call 911 or go to your nearest emergency room right away.",
  },
];

/**
 * Scans a user message for sensitive topics.
 * Returns the highest-severity detection (crisis > injury > high > medium > low).
 */
export function detectSensitiveTopics(message: string): SensitiveTopicResult {
  const lower = message.toLowerCase();

  const detections = SENSITIVE_PATTERNS.filter((p) =>
    p.keywords.some((kw) => lower.includes(kw)),
  );

  if (detections.length === 0) {
    return { detected: false, topic: null, severity: null, resources: [], softResponse: null };
  }

  // Pick highest severity
  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  detections.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const top = detections[0];

  return {
    detected: true,
    topic: top.topic,
    severity: top.severity,
    resources: top.resources,
    softResponse: top.softResponse,
  };
}

// ─── Enhancement 16: Crisis Escalation ───────────────────────────────────────

/**
 * Full safety scan: returns the action to take for a given user message.
 * 'proceed' — safe to proceed with normal AI response
 * 'crisis'  — abort and return crisis resources (Enhancement 16)
 * 'sensitive' — proceed but inject sensitivity guidance into system prompt
 */
export type SafetyAction = 'proceed' | 'crisis' | 'sensitive';

export interface SafetyCheckResult {
  action: SafetyAction;
  topic: SensitiveTopic | null;
  severity: 'high' | 'medium' | 'low' | null;
  resources: string[];
  softResponse: string | null;
}

export function checkMessageSafety(message: string): SafetyCheckResult {
  const scan = detectSensitiveTopics(message);

  if (!scan.detected) {
    return { action: 'proceed', topic: null, severity: null, resources: [], softResponse: null };
  }

  // Crisis and high-severity injury → abort and escalate
  if (scan.topic === 'crisis' || (scan.topic === 'injury' && scan.severity === 'high')) {
    return { action: 'crisis', ...scan };
  }

  // Other sensitive topics → proceed with caution + resources appended
  return { action: 'sensitive', ...scan };
}
