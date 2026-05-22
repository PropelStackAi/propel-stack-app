import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
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
  return db.prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?').get(id, userId) as
    | Record<string, unknown>
    | undefined;
}

// ---- Usage ----
assistantRouter.get('/usage', (_req: Request, res: Response) => {
  res.json(getUsage(getCurrentUserId()));
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

  let result;
  try {
    result = complete({
      prompt: message,
      model,
      mode,
      systemPrompt:
        mode === 'finance'
          ? 'You provide general financial education only. Never give personalized advice. Recommend a licensed professional.'
          : undefined,
    });
  } catch (err) {
    if (err instanceof TokenBudgetExceededError) {
      send('budget', { error: 'Monthly AI token budget reached. Upgrade your plan for more tokens.' });
    } else {
      send('error', { error: 'Generation failed.' });
    }
    return res.end();
  }

  let closed = false;
  req.on('close', () => { closed = true; });

  const tokens = result.text.split(/(\s+)/);
  for (const t of tokens) {
    if (closed) break;
    if (t) send('token', { t });
    await sleep(12);
  }

  const asstId = newId();
  await db.prepare(
    'INSERT INTO ai_messages (id, conversation_id, user_id, role, content, tokens_in, tokens_out, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(asstId, conversationId, userId, 'assistant', result.text, result.tokensIn, result.tokensOut, result.model);
  await db.prepare('UPDATE ai_conversations SET updated_at = NOW() WHERE id = ?').run(conversationId);

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
