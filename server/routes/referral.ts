// ─── Referral Loop — Enhancement 30 ──────────────────────────────────────────
// Propel Stack AI, LLC
//
// Unique referral link per user; credit on successful conversion;
// share template pre-populated with personal win.

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import { complete } from '../ai-gateway.js';

export const referralRouter = Router();

const CREDIT_AMOUNT = 500; // tokens credited per successful referral

// ─── GET /api/referral/my-code — get or create referral code ─────────────────
referralRouter.get('/my-code', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();

  let code = await db.prepare(
    'SELECT * FROM referral_codes WHERE user_id = ?'
  ).get(userId) as Record<string, unknown> | undefined;

  if (!code) {
    // Generate unique 8-char alphanumeric code
    const newCode = generateCode();
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO referral_codes (id, user_id, code)
      VALUES (?, ?, ?)
    `).run(id, userId, newCode);
    code = { id, user_id: userId, code: newCode, credits_earned: 0, conversions: 0 };
  }

  const referralUrl = `https://propelstackai.com/join?ref=${code.code}`;

  res.json({
    code: code.code,
    referral_url: referralUrl,
    credits_earned: code.credits_earned,
    conversions: code.conversions,
    share_text: buildShareText(code.code as string),
  });
});

// ─── GET /api/referral/stats — referral stats ────────────────────────────────
referralRouter.get('/stats', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();

  const code = await db.prepare(
    'SELECT code, credits_earned, conversions FROM referral_codes WHERE user_id = ?'
  ).get(userId) as Record<string, unknown> | undefined;

  if (!code) {
    return res.json({ has_code: false, conversions: 0, credits_earned: 0, recent_conversions: [] });
  }

  const recent = await db.prepare(`
    SELECT converted_at, credit_amount
    FROM referral_conversions
    WHERE referrer_user_id = ?
    ORDER BY converted_at DESC LIMIT 10
  `).all(userId);

  res.json({
    has_code: true,
    code: code.code,
    conversions: code.conversions,
    credits_earned: code.credits_earned,
    credit_amount_per_referral: CREDIT_AMOUNT,
    recent_conversions: recent,
  });
});

// ─── POST /api/referral/convert — register a conversion (called at signup) ───
referralRouter.post('/convert', async (req: Request, res: Response) => {
  const { code, new_user_id } = req.body ?? {};
  if (!code || !new_user_id) return res.status(400).json({ error: 'code and new_user_id required' });

  const referralCode = await db.prepare(
    'SELECT * FROM referral_codes WHERE code = ?'
  ).get(code) as Record<string, unknown> | undefined;

  if (!referralCode) return res.status(404).json({ error: 'invalid referral code' });

  // Prevent self-referral
  if (referralCode.user_id === new_user_id) return res.status(400).json({ error: 'cannot self-refer' });

  // Check not already converted
  const existing = await db.prepare(
    'SELECT id FROM referral_conversions WHERE converted_user_id = ?'
  ).get(new_user_id);
  if (existing) return res.status(409).json({ error: 'user already converted' });

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO referral_conversions (id, referral_code, referrer_user_id, converted_user_id, credit_amount)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, code, referralCode.user_id, new_user_id, CREDIT_AMOUNT);

  // Credit the referrer
  await db.prepare(`
    UPDATE referral_codes
    SET credits_earned = credits_earned + ?, conversions = conversions + 1
    WHERE code = ?
  `).run(CREDIT_AMOUNT, code);

  // Add tokens to referrer's budget
  await db.prepare(`
    UPDATE users SET ai_tokens_used_this_month = GREATEST(0, ai_tokens_used_this_month - ?)
    WHERE id = ?
  `).run(CREDIT_AMOUNT, referralCode.user_id).catch(() => {});

  res.status(201).json({ ok: true, credit_amount: CREDIT_AMOUNT });
});

// ─── GET /api/referral/share-text — AI-generated share message ────────────────
referralRouter.get('/share-text', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();

  const code = await db.prepare(
    'SELECT code FROM referral_codes WHERE user_id = ?'
  ).get(userId) as { code: string } | undefined;

  const referralCode = code?.code ?? '';
  const referralUrl = `https://propelstackai.com/join?ref=${referralCode}`;

  // Try to get a personal win to feature
  const latestWin = await db.prepare(`
    SELECT title FROM life_wins WHERE user_id = ? ORDER BY occurred_on DESC LIMIT 1
  `).get(userId).catch(() => null) as { title: string } | null;

  let shareText = buildShareText(referralCode, latestWin?.title);

  try {
    if (latestWin?.title) {
      const result = complete({
        prompt: `Personal win: "${latestWin.title}". Referral URL: ${referralUrl}. Write a 1-2 sentence social share message (friendly, not salesy) mentioning the win and app. Under 240 chars.`,
        systemPrompt: 'You write genuine, personal social media messages. Never say "I\'m excited to share" or use buzzwords.',
        mode: 'general',
        maxTokens: 60,
      });
      if (result.text) shareText = result.text.trim();
    }
  } catch { /* use default */ }

  res.json({ share_text: shareText, referral_url: referralUrl });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function buildShareText(code: string, personalWin?: string): string {
  const url = `https://propelstackai.com/join?ref=${code}`;
  if (personalWin) {
    return `Just hit a milestone: "${personalWin}" — been using Propel Stack AI to actually track my life. Worth trying → ${url}`;
  }
  return `I've been using Propel Stack AI to manage every corner of my life in one place. It's genuinely changed how I plan and reflect. Check it out → ${url}`;
}
