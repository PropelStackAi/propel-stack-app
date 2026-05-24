/**
 * Enhancement 37 — AI Companion Mode
 * Propel Stack AI, LLC
 *
 * Named, persistent AI companion persona with emotional memory.
 * Proactive check-ins based on Life Score drops, missed streaks, absence.
 * Full conversation history + Life OS context injected into every response.
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';
import { randomUUID } from 'node:crypto';

export const companionRouter = Router();
const ai = new Anthropic();

const PERSONALITY_PROMPTS: Record<string, string> = {
  warm: 'You are warm, empathetic, and nurturing. You celebrate small wins and gently encourage during tough times.',
  direct: 'You are direct, honest, and action-oriented. You cut to the chase and help the user focus on what matters.',
  motivating: 'You are energetic, motivating, and positive. You help the user see their potential and cheer them on.',
  gentle: 'You are calm, patient, and soothing. You create a safe space and never push too hard.',
};

async function getCompanionProfile(userId: string) {
  return db.prepare('SELECT * FROM companion_profile WHERE user_id = $1').get(userId);
}

// GET /api/companion/profile
companionRouter.get('/profile', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const profile = await getCompanionProfile(userId);
    res.json(profile ?? { companion_name: 'Alex', personality_style: 'warm' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch companion profile' });
  }
});

// PUT /api/companion/profile — set companion name and personality
companionRouter.put('/profile', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { companion_name = 'Alex', personality_style = 'warm' } = req.body as {
      companion_name?: string; personality_style?: string;
    };

    const existing = await getCompanionProfile(userId);
    if (existing) {
      await db.prepare(`
        UPDATE companion_profile SET companion_name = $1, personality_style = $2 WHERE user_id = $3
      `).run(companion_name, personality_style, userId);
    } else {
      await db.prepare(`
        INSERT INTO companion_profile (id, user_id, companion_name, personality_style)
        VALUES ($1, $2, $3, $4)
      `).run(randomUUID(), userId, companion_name, personality_style);
    }
    res.json({ companion_name, personality_style });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update companion profile' });
  }
});

// GET /api/companion/conversations — fetch history
companionRouter.get('/conversations', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const rows = await db.prepare(`
      SELECT * FROM companion_conversations WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 100
    `).all(userId);
    res.json((rows as any[]).reverse());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/companion/chat — send message to companion
companionRouter.post('/chat', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { message } = req.body as { message: string };
    if (!message) return res.status(400).json({ error: 'message required' });

    const profile = (await getCompanionProfile(userId)) as any ?? { companion_name: 'Alex', personality_style: 'warm' };
    const personalityGuide = PERSONALITY_PROMPTS[profile.personality_style] || PERSONALITY_PROMPTS.warm;

    // Get last 20 conversation turns for context
    const history = await db.prepare(`
      SELECT role, content FROM companion_conversations WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 20
    `).all(userId) as any[];

    // Get life context
    const [goals, streaks] = await Promise.all([
      db.prepare(`SELECT title, status FROM goals WHERE user_id = $1 AND status != 'complete' LIMIT 5`).all(userId),
      db.prepare(`SELECT streak_type, current_len FROM streaks WHERE user_id = $1 ORDER BY current_len DESC LIMIT 3`).all(userId),
    ]);

    const systemPrompt = `You are ${profile.companion_name}, the user's personal AI companion inside Propel Stack AI Life OS.
${personalityGuide}
You remember everything from past conversations and the user's life data.
Current context: Active goals: ${JSON.stringify(goals).slice(0, 300)}. Top streaks: ${JSON.stringify(streaks).slice(0, 200)}.
Keep responses warm and personal. 1-3 sentences unless the user asks for more. Never give medical or financial advice.`;

    const messages: Anthropic.MessageParam[] = [
      ...history.reverse().map((h: any) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: scrubPII(message) },
    ];

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    const reply = (completion.content[0] as any).text || '';

    // Save both turns
    const userMsgId = randomUUID();
    const compMsgId = randomUUID();
    await db.prepare(`INSERT INTO companion_conversations (id, user_id, role, content, trigger_type) VALUES ($1,$2,'user',$3,'user_initiated')`).run(userMsgId, userId, message);
    await db.prepare(`INSERT INTO companion_conversations (id, user_id, role, content, trigger_type) VALUES ($1,$2,'assistant',$3,'user_initiated')`).run(compMsgId, userId, reply);

    res.json({ reply, companion_name: profile.companion_name });
  } catch (err) {
    console.error('[companion] chat error', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/companion/checkin — trigger a proactive check-in
companionRouter.post('/checkin', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { trigger_type = 'check_in' } = req.body as { trigger_type?: string };

    const profile = (await getCompanionProfile(userId)) as any ?? { companion_name: 'Alex', personality_style: 'warm' };
    const personalityGuide = PERSONALITY_PROMPTS[profile.personality_style] || PERSONALITY_PROMPTS.warm;

    const prompt = `You are ${profile.companion_name}. ${personalityGuide}
Generate a brief proactive check-in message (1-2 sentences) for your user.
Trigger: ${trigger_type}. Be warm and genuine, not pushy.`;

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const checkinMsg = (completion.content[0] as any).text || `Hey! Just checking in — how are you doing today?`;

    await db.prepare(`
      INSERT INTO companion_conversations (id, user_id, role, content, trigger_type)
      VALUES ($1, $2, 'assistant', $3, $4)
    `).run(randomUUID(), userId, checkinMsg, trigger_type);

    res.json({ message: checkinMsg, companion_name: profile.companion_name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate check-in' });
  }
});
