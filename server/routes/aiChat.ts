// ─── AI Chat with Full Life OS Memory ────────────────────────────────────────
// Session 14 Enhancement 7 — Propel Stack AI, LLC

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import { complete } from '../ai-gateway.js';
import { buildMemoryContext } from '../lib/memoryStore.js';
import { sentimentMiddleware } from '../middleware/sentiment.js'; // Phase 2 Step 7

export const aiChatRouter = Router();

// Apply sentiment middleware to all message endpoints (crisis detection + compassionate mode)
aiChatRouter.use('/threads/:id/messages', sentimentMiddleware);

// ─── GET /api/ai-chat/threads — list threads ─────────────────────────────────
aiChatRouter.get('/threads', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare('SELECT id, title, hub_context, last_message_at, created_at FROM chat_threads WHERE user_id = ? ORDER BY last_message_at DESC LIMIT 50')
    .all(userId);
  res.json(rows);
});

// ─── POST /api/ai-chat/threads — create thread ────────────────────────────────
aiChatRouter.post('/threads', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { hub_context = [] } = req.body ?? {};
  const id = randomUUID();
  await db.prepare('INSERT INTO chat_threads (id, user_id, hub_context) VALUES (?, ?, ?)').run(id, userId, JSON.stringify(hub_context));
  res.status(201).json({ id });
});

// ─── GET /api/ai-chat/threads/:id/messages — get messages ────────────────────
aiChatRouter.get('/threads/:id/messages', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const thread = await db.prepare('SELECT * FROM chat_threads WHERE id = ? AND user_id = ?').get(req.params.id, userId) as Record<string, unknown> | undefined;
  if (!thread) return res.status(404).json({ error: 'not found' });

  const messages = await db
    .prepare('SELECT id, role, content, tokens_used, model_used, created_at FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC')
    .all(req.params.id);
  res.json({ thread, messages });
});

// ─── POST /api/ai-chat/threads/:id/messages — send message ───────────────────
aiChatRouter.post('/threads/:id/messages', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { content } = req.body ?? {};
  if (!content) return res.status(400).json({ error: 'content required' });

  const thread = await db.prepare('SELECT * FROM chat_threads WHERE id = ? AND user_id = ?').get(req.params.id, userId) as Record<string, unknown> | undefined;
  if (!thread) return res.status(404).json({ error: 'thread not found' });

  // Save user message
  const userMsgId = randomUUID();
  await db.prepare('INSERT INTO chat_messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)').run(userMsgId, req.params.id, 'user', content);

  // Get recent messages for context
  const history = await db
    .prepare("SELECT role, content FROM chat_messages WHERE thread_id = ? AND role IN ('user','assistant') ORDER BY created_at ASC LIMIT 20")
    .all(req.params.id) as Array<{ role: string; content: string }>;

  // Build system prompt with Life OS memory
  const memCtx = await buildMemoryContext(userId).catch(() => '');

  // Determine hub context + pull relevant data
  const hubCtx = JSON.parse(thread.hub_context as string || '[]') as string[];
  const hubData: Record<string, unknown> = {};

  if (hubCtx.includes('financial') || /spend|budget|money|finance|invest/i.test(content)) {
    hubData.recentTransactions = await db.prepare('SELECT description, amount, category FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 5').all(userId).catch(() => []);
  }
  if (hubCtx.includes('health') || /health|symptom|medication|sleep|workout/i.test(content)) {
    hubData.healthMetrics = await db.prepare('SELECT metric_type, value, recorded_at FROM health_metrics WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 5').all(userId).catch(() => []);
  }
  if (hubCtx.includes('goals') || /goal|progress|target/i.test(content)) {
    hubData.activeGoals = await db.prepare("SELECT title, current_value, target_value, unit FROM goals WHERE user_id = ? AND status = 'active' LIMIT 5").all(userId).catch(() => []);
  }

  const systemPrompt = `${memCtx}
You are an AI life OS assistant for Propel Stack AI with full access to the user's Life OS data.
Answer questions about their specific data with precise citations (e.g., 'Based on your March transactions...').
Be warm, direct, and data-driven. Never make up data — only reference what's provided.
${Object.keys(hubData).length > 0 ? `Hub data: ${JSON.stringify(hubData)}` : ''}
DISCLAIMER: This is not financial, medical, or legal advice.`.trim();

  const messages = history.slice(-10).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  // The last message in history IS the user message we just saved — no need to add again

  // Auto-title thread on first message
  if (history.length <= 1) {
    const title = content.slice(0, 60) + (content.length > 60 ? '…' : '');
    await db.prepare('UPDATE chat_threads SET title = ? WHERE id = ?').run(title, req.params.id);
  }

  let responseText = 'I encountered an issue processing your request. Please try again.';
  let tokensUsed = 0;
  let modelUsed = 'claude-haiku-4-5';

  // Route: long/complex → sonnet, simple → haiku
  const isComplex = content.length > 100 || /analyze|compare|summarize|explain|why|how/i.test(content);
  if (isComplex) modelUsed = 'claude-sonnet-4-5';

  try {
    const result = complete({
      model: modelUsed as 'claude-haiku-4-5' | 'claude-sonnet-4-5',
      system: systemPrompt,
      messages,
      maxTokens: isComplex ? 1000 : 400,
    });
    responseText = result.text.trim();
    tokensUsed = result.inputTokens + result.outputTokens;
  } catch (err) {
    console.error('[aiChat] complete error', err);
  }

  const assistantMsgId = randomUUID();
  await db.prepare('INSERT INTO chat_messages (id, thread_id, role, content, tokens_used, model_used) VALUES (?, ?, ?, ?, ?, ?)').run(assistantMsgId, req.params.id, 'assistant', responseText, tokensUsed, modelUsed);
  await db.prepare('UPDATE chat_threads SET last_message_at = NOW() WHERE id = ?').run(req.params.id);

  // Deduct tokens from user budget
  await db.prepare('UPDATE users SET ai_tokens_used_this_month = ai_tokens_used_this_month + ? WHERE id = ?').run(tokensUsed, userId).catch(() => {});

  res.json({ id: assistantMsgId, role: 'assistant', content: responseText, tokens_used: tokensUsed, model_used: modelUsed });
});

// ─── DELETE /api/ai-chat/threads/:id — delete thread ─────────────────────────
aiChatRouter.delete('/threads/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  await db.prepare('DELETE FROM chat_threads WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ ok: true });
});
