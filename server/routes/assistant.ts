import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js'; // Enhancement 41
import { buildMemoryContext, logEpisodic } from '../lib/memoryStore.js'; // Enhancement 1-2
import { predictNextTask, shouldPredict, recordPrediction } from '../services/taskPredictor.js'; // Phase 3 Step 2
import {
  ANTI_TOXIC_GUARDRAIL,
  HALLUCINATION_GUARD_FINANCE,
  HALLUCINATION_GUARD_RESEARCH,
  scrubToxicLanguage,
  addHallucinationCaveats,
  checkMessageSafety,
} from '../lib/safetyScanner.js'; // Enhancement 13-16
import {
  complete,
  estimateCost,
  getUsage,
  MODEL_LABELS,
  TokenBudgetExceededError,
} from '../ai-gateway.js';
import {
  asMode,
  asModel,
  conversationSchema,
  newId,
  ratingSchema,
  rowToConversation,
  rowToMessage,
  type Model,
  type Mode,
} from '../lib/assistant.js';

/** AI Assistant API (Session 4). Responses stream over SSE; everything else is plain JSON. */
export const assistantRouter = Router();

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getConversation(id: string, userId: string) {
  return db.prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?').get(id, userId) as unknown as
    | Record<string, unknown>
    | undefined;
}

// ---- Session start — fires predictive task surfacing (Phase 3 Step 2) ----
assistantRouter.post('/session-start', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  if (!shouldPredict(userId)) {
    return res.json({ prediction: null });
  }
  const prediction = await predictNextTask(userId);
  if (prediction) recordPrediction(userId, prediction);
  res.json({ prediction });
});

// ---- Usage ----
assistantRouter.get('/usage', (_req: Request, res: Response) => {
  res.json(getUsage(getCurrentUserId()));
});

// ---- Token Budget (Phase 2 Step 11 — TokenUsage component) ----
assistantRouter.get('/token-budget', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const base = getUsage(userId);

  // Approximate breakdown by feature from ai_message_log (if exists) or fallback
  let breakdown = { ai_chat: 0, morning_briefing: 0, weekly_review: 0, background_analysis: 0 };
  try {
    // If the message log table exists, break down by source
    const rows = await db
      .prepare(`SELECT source, SUM(tokens_total) as t FROM ai_message_log WHERE user_id = ? GROUP BY source`)
      .all(userId) as { source: string; t: number }[];

    for (const r of rows) {
      if (r.source === 'morning_briefing')   breakdown.morning_briefing   = r.t;
      else if (r.source === 'weekly_review') breakdown.weekly_review      = r.t;
      else if (r.source === 'background')    breakdown.background_analysis = r.t;
      else                                   breakdown.ai_chat            += r.t;
    }
  } catch {
    // Table doesn't exist yet — distribute usage proportionally (70/15/10/5)
    const u = base.used;
    breakdown = {
      ai_chat:            Math.round(u * 0.70),
      morning_briefing:   Math.round(u * 0.15),
      weekly_review:      Math.round(u * 0.10),
      background_analysis: Math.round(u * 0.05),
    };
  }

  const burnRatePerDay = base.used / Math.max(1, new Date().getDate());
  const daysRemaining  = burnRatePerDay > 0 ? Math.round(base.remaining / burnRatePerDay) : 999;

  res.json({
    used: base.used,
    budget: base.budget,
    plan: base.planTier,
    burn_rate_per_day: Math.round(burnRatePerDay),
    days_remaining: Math.min(daysRemaining, 99),
    breakdown,
  });
});

// ---- Conversations ----
assistantRouter.get('/conversations', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC')
    .all(userId);
  res.json(rows.map(rowToConversation));
});

assistantRouter.post('/conversations', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = conversationSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid conversation' });
  const id = newId();
  await db.prepare(
    'INSERT INTO ai_conversations (id, user_id, title, model, mode) VALUES (?, ?, ?, ?, ?)',
  ).run(id, userId, parsed.data.title || 'New conversation', parsed.data.model, parsed.data.mode);
  res.status(201).json(rowToConversation(await getConversation(id, userId) as Record<string, unknown>));
});

assistantRouter.get('/conversations/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const conv = await getConversation(req.params.id as string, userId);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  const messages = await db
    .prepare('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(req.params.id as string);
  res.json({ ...rowToConversation(conv), messages: messages.map(rowToMessage) });
});

assistantRouter.patch('/conversations/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const conv = await getConversation(req.params.id as string, userId);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  const parsed = conversationSchema.partial().safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid update' });
  await db.prepare(
    'UPDATE ai_conversations SET title = ?, model = ?, mode = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
  ).run(
    parsed.data.title ?? (conv.title as string),
    parsed.data.model ?? (conv.model as string),
    parsed.data.mode ?? (conv.mode as string),
    req.params.id as string,
    userId,
  );
  res.json(rowToConversation(await getConversation(req.params.id as string, userId) as Record<string, unknown>));
});

assistantRouter.delete('/conversations/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const result = await db.prepare('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ---- Message rating ----
assistantRouter.post('/messages/:id/rate', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid rating' });
  const result = await db
    .prepare('UPDATE ai_messages SET rating = ? WHERE id = ? AND user_id = ?')
    .run(parsed.data.rating, req.params.id as string, userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ id: req.params.id, rating: parsed.data.rating });
});

// ---- SSE streaming ----
assistantRouter.get('/stream', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const conversationId = String(req.query.conversationId ?? '');
  const message = String(req.query.message ?? '').trim();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const conv = conversationId ? await getConversation(conversationId, userId) : undefined;
  if (!conv) {
    send('error', { error: 'Conversation not found' });
    return res.end();
  }
  if (!message) {
    send('error', { error: 'Empty message' });
    return res.end();
  }

  const model: Model = asModel(req.query.model, conv.model as Model);
  const mode: Mode = asMode(req.query.mode, conv.mode as Mode);

  // Persist the user's message + bump conversation metadata (auto-title on first message).
  const userMsgId = newId();
  await db.prepare('INSERT INTO ai_messages (id, conversation_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)').run(
    userMsgId, conversationId, userId, 'user', message,
  );
  const isFirstTitle = !conv.title || conv.title === 'New conversation';
  await db.prepare('UPDATE ai_conversations SET title = ?, model = ?, mode = ?, updated_at = NOW() WHERE id = ?').run(
    isFirstTitle ? message.slice(0, 48) : (conv.title as string), model, mode, conversationId,
  );
  send('user', { id: userMsgId });

  // Enhancement 15-16: Safety scan before AI call
  const safetyCheck = checkMessageSafety(message);
  if (safetyCheck.action === 'crisis') {
    send('crisis', {
      topic: safetyCheck.topic,
      softResponse: safetyCheck.softResponse,
      resources: safetyCheck.resources,
    });
    logEpisodic(userId, `[SAFETY] Crisis signal detected in message — escalated to resources`, 'safety').catch(() => {});
    return res.end();
  }

  // Enhancement 2: Cross-Session Context Stitching — prepend memory context to every conversation
  const memCtx = await buildMemoryContext(userId).catch(() => '');

  // Enhancement 13: Anti-Toxic Productivity Guardrail
  // Enhancement 14: Hallucination Guard (finance/research modes)
  const hallucinationGuard =
    mode === 'finance' ? HALLUCINATION_GUARD_FINANCE
    : mode === 'research' ? HALLUCINATION_GUARD_RESEARCH
    : '';

  // Enhancement 15: Sensitive topic — append soft guidance
  const sensitiveGuidance = safetyCheck.action === 'sensitive'
    ? `\nSensitivity note: the user may be dealing with ${safetyCheck.topic?.replace(/_/g, ' ')}. Be especially empathetic, non-judgmental, and suggest professional resources if appropriate.\n`
    : '';

  const baseSystemPrompt =
    mode === 'finance'
      ? `You provide general financial education only. Never give personalized advice. Recommend a licensed professional. ${hallucinationGuard}`
      : `You are a proactive Life OS assistant. Be concise, warm, and action-oriented. ${hallucinationGuard}${sensitiveGuidance}`;

  const systemPromptWithMemory = ANTI_TOXIC_GUARDRAIL + memCtx + baseSystemPrompt;

  let result;
  try {
    result = complete({
      prompt: scrubPII(message), // Enhancement 41: strip PII before AI
      model,
      mode,
      systemPrompt: systemPromptWithMemory,
    });
  } catch (err) {
    if (err instanceof TokenBudgetExceededError) {
      send('budget', { error: 'Monthly AI token budget reached. Upgrade your plan for more tokens.' });
    } else {
      send('error', { error: 'Generation failed.' });
    }
    return res.end();
  }

  // Enhancement 13: Scrub toxic language from response
  // Enhancement 14: Add hallucination caveats where needed
  const safeText = addHallucinationCaveats(scrubToxicLanguage(result.text), mode);

  // Append sensitive topic resources if detected
  const finalText = safetyCheck.action === 'sensitive' && safetyCheck.resources.length > 0
    ? safeText + `\n\n---\n**If you need support:** ${safetyCheck.resources.join(' | ')}`
    : safeText;

  let closed = false;
  req.on('close', () => { closed = true; });

  const tokens = finalText.split(/(\s+)/);
  for (const t of tokens) {
    if (closed) break;
    if (t) send('token', { t });
    await sleep(12);
  }

  const asstId = newId();
  await db.prepare(
    'INSERT INTO ai_messages (id, conversation_id, user_id, role, content, tokens_in, tokens_out, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(asstId, conversationId, userId, 'assistant', finalText, result.tokensIn, result.tokensOut, result.model);
  await db.prepare('UPDATE ai_conversations SET updated_at = NOW() WHERE id = ?').run(conversationId);

  // Enhancement 1: Log this exchange as an episodic memory for future context stitching
  const episodicSummary = `User asked: "${message.slice(0, 120)}${message.length > 120 ? '…' : ''}"`;
  logEpisodic(userId, episodicSummary, mode).catch(() => {/* non-fatal */});

  if (!closed) {
    send('done', {
      id: asstId,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      model: result.model,
      modelLabel: MODEL_LABELS[result.model],
      cost: estimateCost(result.model, result.tokensIn, result.tokensOut),
      stub: result.stub,
    });
  }
  res.end();
});
