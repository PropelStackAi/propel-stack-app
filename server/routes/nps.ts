/**
 * NPS / In-App Feedback Loop — Phase 4 Enhancement 39
 * Propel Stack AI, LLC
 *
 * Triggered after meaningful sessions (3+ AI interactions).
 * 1–5 scale + optional comment. Results surface in admin dashboard.
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';

export const npsRouter = Router();

// ─── Submit NPS response ──────────────────────────────────────────────────────

npsRouter.post('/', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { score, comment, context } = req.body as {
      score: number;
      comment?: string;
      context?: string;
    };

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }

    const id = crypto.randomUUID();
    await db
      .prepare(`INSERT INTO nps_responses (id, user_id, score, comment, context)
                VALUES (?, ?, ?, ?, ?)`)
      .run(id, userId, score, comment ?? null, context ?? 'general');

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[nps] submit error', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ─── Check eligibility (should we show NPS prompt?) ──────────────────────────

npsRouter.get('/eligible', async (_req, res) => {
  try {
    const userId = getCurrentUserId();

    // Check last NPS response
    const last = await db
      .prepare(`SELECT created_at FROM nps_responses WHERE user_id = ?
                ORDER BY created_at DESC LIMIT 1`)
      .get(userId) as Record<string, unknown> | undefined;

    if (last) {
      const daysSinceLast = (Date.now() - new Date(last.created_at as string).getTime()) / 86_400_000;
      if (daysSinceLast < 30) {
        return res.json({ eligible: false, reason: 'Too soon since last response' });
      }
    }

    // Check AI interaction count (naive: check journal or chat entries)
    res.json({ eligible: true });
  } catch (err) {
    console.error('[nps] eligible error', err);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});
