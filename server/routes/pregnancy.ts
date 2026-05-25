// ─── Pregnancy & Motherhood Hub — Server Routes ───────────────────────────────
// Propel Stack AI, LLC
//
// Cycle tracking, pregnancy week progression, postpartum logging, AI advisor.
// Disclaimer: PSAI-PREG-DISC-v1.0 — Not a medical provider. Always consult
// your OB/GYN, midwife, or healthcare professional for clinical guidance.

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { complete } from '../ai-gateway.js';

export const pregnancyRouter = Router();

// ─── Profile helpers ──────────────────────────────────────────────────────────

function calcWeek(lmpDate: string | null): number | null {
  if (!lmpDate) return null;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.floor((Date.now() - new Date(lmpDate).getTime()) / msPerWeek);
  return Math.max(1, Math.min(42, weeks));
}

function calcDueDate(lmpDate: string): string {
  const lmp = new Date(lmpDate);
  lmp.setDate(lmp.getDate() + 280); // Naegele's rule: LMP + 280 days
  return lmp.toISOString().split('T')[0];
}

// ─── GET /api/pregnancy/profile ──────────────────────────────────────────────

pregnancyRouter.get('/profile', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const profile = await db
      .prepare('SELECT * FROM pregnancy_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1')
      .get(userId);

    if (!profile) {
      return res.json({ profile: null });
    }

    const week = (profile as any).week_override ?? calcWeek((profile as any).lmp_date);
    return res.json({ profile: { ...(profile as any), current_week: week } });
  } catch (err) {
    console.error('[pregnancy] profile error', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ─── POST /api/pregnancy/profile ─────────────────────────────────────────────

pregnancyRouter.post('/profile', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { phase, lmp_date, baby_name, cycle_length, week_override } = req.body as {
      phase: string;
      lmp_date?: string;
      baby_name?: string;
      cycle_length?: number;
      week_override?: number;
    };

    const due_date = lmp_date ? calcDueDate(lmp_date) : null;

    const existing = await db
      .prepare('SELECT id FROM pregnancy_profiles WHERE user_id = ? LIMIT 1')
      .get(userId);

    if (existing) {
      await db.prepare(`
        UPDATE pregnancy_profiles
        SET phase = ?, lmp_date = ?, due_date = ?, baby_name = ?,
            cycle_length = ?, week_override = ?, updated_at = NOW()
        WHERE user_id = ?
      `).run(phase, lmp_date ?? null, due_date, baby_name ?? null, cycle_length ?? 28, week_override ?? null, userId);
    } else {
      await db.prepare(`
        INSERT INTO pregnancy_profiles (user_id, phase, lmp_date, due_date, baby_name, cycle_length, week_override)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, phase, lmp_date ?? null, due_date, baby_name ?? null, cycle_length ?? 28, week_override ?? null);
    }

    const profile = await db
      .prepare('SELECT * FROM pregnancy_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1')
      .get(userId);
    res.json({ profile });
  } catch (err) {
    console.error('[pregnancy] save profile error', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// ─── GET /api/pregnancy/week-info ────────────────────────────────────────────

pregnancyRouter.get('/week-info', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const profile = await db
      .prepare('SELECT * FROM pregnancy_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1')
      .get(userId) as any;

    if (!profile || profile.phase !== 'pregnant') {
      return res.json({ week: null, info: null });
    }

    const week = profile.week_override ?? calcWeek(profile.lmp_date) ?? 1;

    // Week-based milestones (static data — real app would use a full 40-week database)
    const MILESTONES: Record<number, { size: string; development: string }> = {
      4:  { size: 'poppy seed', development: 'Neural tube forming. Heart begins to beat.' },
      8:  { size: 'raspberry', development: 'All major organs forming. Tiny fingers developing.' },
      12: { size: 'lime', development: 'Reflexes forming. Risk of miscarriage drops significantly.' },
      16: { size: 'avocado', development: 'You may feel first movements (quickening).' },
      20: { size: 'banana', development: 'Anatomy scan week. Can often determine sex.' },
      24: { size: 'corn', development: 'Viable outside womb with intensive care. Hearing developing.' },
      28: { size: 'eggplant', development: 'Third trimester begins. Brain developing rapidly.' },
      32: { size: 'squash', development: 'Bones hardening. Baby practicing breathing motions.' },
      36: { size: 'cantaloupe', development: 'Considered early term. Most organs ready.' },
      40: { size: 'watermelon', development: 'Full term. Ready to meet your baby!' },
    };

    // Find the nearest milestone week
    const milestoneWeeks = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);
    const nearestWeek = milestoneWeeks.reduce((prev, curr) =>
      Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev
    );
    const milestone = MILESTONES[nearestWeek];

    res.json({
      week,
      due_date: profile.due_date,
      baby_name: profile.baby_name,
      trimester: week <= 12 ? 1 : week <= 28 ? 2 : 3,
      days_until_due: profile.due_date
        ? Math.max(0, Math.ceil((new Date(profile.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
      milestone,
    });
  } catch (err) {
    console.error('[pregnancy] week-info error', err);
    res.status(500).json({ error: 'Failed to load week info' });
  }
});

// ─── POST /api/pregnancy/baby-log ────────────────────────────────────────────

pregnancyRouter.post('/baby-log', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { log_type, log_value, note, log_date } = req.body as {
      log_type: string;
      log_value?: string;
      note?: string;
      log_date?: string;
    };

    const profile = await db
      .prepare('SELECT id FROM pregnancy_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1')
      .get(userId) as any;

    if (!profile) {
      return res.status(400).json({ error: 'No pregnancy profile found' });
    }

    await db.prepare(`
      INSERT INTO baby_logs (user_id, profile_id, log_type, log_value, log_date, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, profile.id, log_type, log_value ?? null, log_date ?? new Date().toISOString().split('T')[0], note ?? null);

    res.json({ ok: true });
  } catch (err) {
    console.error('[pregnancy] baby-log error', err);
    res.status(500).json({ error: 'Failed to log' });
  }
});

// ─── GET /api/pregnancy/baby-logs ────────────────────────────────────────────

pregnancyRouter.get('/baby-logs', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const logs = await db
      .prepare('SELECT * FROM baby_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(userId);
    res.json({ logs });
  } catch (err) {
    console.error('[pregnancy] baby-logs error', err);
    res.status(500).json({ error: 'Failed to load logs' });
  }
});

// ─── POST /api/pregnancy/cycle-log ───────────────────────────────────────────

pregnancyRouter.post('/cycle-log', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { cycle_date, period_flow, symptoms, mood, basal_temp, cm_type } = req.body as {
      cycle_date: string;
      period_flow?: string;
      symptoms?: string[];
      mood?: string;
      basal_temp?: number;
      cm_type?: string;
    };

    await db.prepare(`
      INSERT INTO cycle_tracking
        (user_id, cycle_date, period_flow, symptoms, mood, basal_temp, cm_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, cycle_date) DO UPDATE SET
        period_flow = EXCLUDED.period_flow,
        symptoms    = EXCLUDED.symptoms,
        mood        = EXCLUDED.mood,
        basal_temp  = EXCLUDED.basal_temp,
        cm_type     = EXCLUDED.cm_type
    `).run(
      userId,
      cycle_date,
      period_flow ?? null,
      JSON.stringify(symptoms ?? []),
      mood ?? null,
      basal_temp ?? null,
      cm_type ?? null,
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[pregnancy] cycle-log error', err);
    res.status(500).json({ error: 'Failed to log cycle data' });
  }
});

// ─── GET /api/pregnancy/cycle-history ────────────────────────────────────────

pregnancyRouter.get('/cycle-history', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const logs = await db
      .prepare('SELECT * FROM cycle_tracking WHERE user_id = ? ORDER BY cycle_date DESC LIMIT 90')
      .all(userId);
    res.json({ logs });
  } catch (err) {
    console.error('[pregnancy] cycle-history error', err);
    res.status(500).json({ error: 'Failed to load cycle history' });
  }
});

// ─── POST /api/pregnancy/ai-advice ───────────────────────────────────────────

pregnancyRouter.post('/ai-advice', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { question, phase, week } = req.body as {
      question: string;
      phase?: string;
      week?: number;
    };

    const contextStr = [
      phase ? `Phase: ${phase}` : '',
      week  ? `Pregnancy week: ${week}` : '',
    ].filter(Boolean).join('. ');

    const systemPrompt = `You are a warm, knowledgeable pregnancy and motherhood companion for Propel Stack AI.
${contextStr ? `User context: ${contextStr}.` : ''}

IMPORTANT DISCLAIMER: You are not a medical provider. Always remind users to consult their OB/GYN, midwife, or healthcare professional for any medical concerns. Never diagnose, treat, or recommend specific medications.

Provide supportive, evidence-informed guidance about pregnancy, postpartum recovery, breastfeeding, baby development, and maternal wellness. Keep responses warm, concise (150-200 words), and always end with a reminder to consult their healthcare provider for medical questions.`;

    const result = complete({
      prompt: question,
      systemPrompt,
      mode: 'fast',
      maxTokens: 400,
    });

    res.json({ advice: result.text, tokens_used: result.tokensOut });
  } catch (err) {
    console.error('[pregnancy] ai-advice error', err);
    res.status(500).json({ error: 'Failed to get AI advice' });
  }
});
