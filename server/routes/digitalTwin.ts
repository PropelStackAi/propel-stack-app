/**
 * Enhancement 36 — AI Personal Digital Twin
 * Propel Stack AI, LLC
 *
 * Builds a persistent behavioral model from all hub data.
 * Twin data stays in user's encrypted partition — never for model training.
 * Minimum 30 days of data required before rebuild fires.
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';
import { randomUUID } from 'node:crypto';

export const digitalTwinRouter = Router();
const ai = new Anthropic();

async function getTwinProfile(userId: string) {
  return db.prepare('SELECT * FROM digital_twin_profile WHERE user_id = ?').get(userId);
}

// POST /api/twin/rebuild — aggregate signals and regenerate behavioral model
digitalTwinRouter.post('/rebuild', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    // Data gate: need 30+ days
    const ageRow = await db.prepare(`
      SELECT EXTRACT(DAY FROM NOW() - MIN(created_at)) AS days
      FROM users WHERE id = $1
    `).get(userId);
    const days = Number((ageRow as any)?.days ?? 0);
    if (days < 30) {
      return res.json({ message: `Digital Twin requires 30 days of data. You have ${Math.round(days)} days. Keep using the app!`, generated: false });
    }

    // Aggregate cross-hub signals
    const [goals, streaks, moods, career] = await Promise.all([
      db.prepare(`SELECT title, status, progress_pct FROM goals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`).all(userId),
      db.prepare(`SELECT streak_type, current_len, longest_ever FROM streaks WHERE user_id = $1`).all(userId),
      db.prepare(`SELECT score, notes FROM mood_entries WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 30`).all(userId),
      db.prepare(`SELECT license_name, status FROM career_licenses WHERE user_id = $1 LIMIT 10`).all(userId),
    ]);

    const prompt = scrubPII(`Build a behavioral profile JSON for this user based on their Life OS data.

Goals (recent): ${JSON.stringify(goals).slice(0, 1000)}
Streaks: ${JSON.stringify(streaks).slice(0, 500)}
Mood pattern (last 30): ${JSON.stringify(moods).slice(0, 800)}
Career: ${JSON.stringify(career).slice(0, 400)}

Return compact JSON with:
{
  "top_traits": ["trait1", "trait2", "trait3"],
  "decision_tendencies": ["tendency1", "tendency2"],
  "communication_style": "description",
  "recurring_patterns": ["pattern1", "pattern2"],
  "growth_areas": ["area1", "area2"],
  "motivators": ["motivator1", "motivator2"]
}
Max 200 words. Be specific, not generic.`);

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    let behavioralModel: Record<string, unknown> = {};
    try {
      const txt = (completion.content[0] as any).text || '';
      const match = txt.match(/\{[\s\S]*\}/);
      if (match) behavioralModel = JSON.parse(match[0]);
    } catch { /* keep empty */ }

    const existing = await getTwinProfile(userId);
    if (existing) {
      await db.prepare(`
        UPDATE digital_twin_profile
        SET behavioral_model = $1, last_updated = NOW()
        WHERE user_id = $2
      `).run(JSON.stringify(behavioralModel), userId);
    } else {
      await db.prepare(`
        INSERT INTO digital_twin_profile (id, user_id, behavioral_model)
        VALUES ($1, $2, $3)
      `).run(randomUUID(), userId, JSON.stringify(behavioralModel));
    }

    res.json({ generated: true, profile: behavioralModel });
  } catch (err) {
    console.error('[digitalTwin] rebuild error', err);
    res.status(500).json({ error: 'Failed to rebuild twin profile' });
  }
});

// GET /api/twin/profile
digitalTwinRouter.get('/profile', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const profile = await getTwinProfile(userId);
    res.json(profile ?? null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch twin profile' });
  }
});

// GET /api/twin/patterns — weekly behavioral pattern cards
digitalTwinRouter.get('/patterns', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const memories = await db.prepare(
      `SELECT * FROM twin_memory_entries WHERE user_id = $1 AND category = 'pattern' ORDER BY created_at DESC LIMIT 10`
    ).all(userId);
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

// POST /api/twin/ask — decision replay / "what would I do?" query
digitalTwinRouter.post('/ask', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { question } = req.body as { question: string };
    if (!question) return res.status(400).json({ error: 'question required' });

    const profile = await getTwinProfile(userId) as any;
    const behavioralModel = profile?.behavioral_model ?? {};

    const prompt = scrubPII(`You are analyzing how this person would approach a decision, based on their behavioral profile.

Their profile:
${JSON.stringify(behavioralModel).slice(0, 1000)}

Question: ${question}

Respond as an insightful analysis of what this person would likely do and why, based on their patterns. 2-3 sentences. Frame it as "Based on your patterns..." Never claim certainty.`);

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const answer = (completion.content[0] as any).text || '';
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process question' });
  }
});

// POST /api/twin/draft — draft in user's voice
digitalTwinRouter.post('/draft', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { topic, type = 'message' } = req.body as { topic: string; type?: string };
    if (!topic) return res.status(400).json({ error: 'topic required' });

    const profile = await getTwinProfile(userId) as any;
    const voiceModel = profile?.voice_model ?? {};

    const prompt = scrubPII(`Draft a ${type} about: ${topic}

Writing style guide for this person:
${JSON.stringify(voiceModel).slice(0, 500)}

Keep it authentic to their voice. 100-150 words max.`);

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const draft = (completion.content[0] as any).text || '';
    res.json({ draft });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate draft' });
  }
});

// GET /api/twin/memories — list memory entries
digitalTwinRouter.get('/memories', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { category } = req.query as { category?: string };
    const rows = category
      ? await db.prepare(`SELECT * FROM twin_memory_entries WHERE user_id = $1 AND category = $2 ORDER BY created_at DESC LIMIT 50`).all(userId, category)
      : await db.prepare(`SELECT * FROM twin_memory_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// DELETE /api/twin/memory/:id — user can delete a specific memory
digitalTwinRouter.delete('/memory/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    await db.prepare(`DELETE FROM twin_memory_entries WHERE id = $1 AND user_id = $2`).run(req.params.id, userId);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});
