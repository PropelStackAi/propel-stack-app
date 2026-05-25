/**
 * Push Token Routes — Phase 3 Step 8
 * Propel Stack AI, LLC
 *
 * Register, refresh, and revoke FCM/APNs push tokens.
 * Called by the mobile app on every launch and when tokens are refreshed.
 */

import { Router, type Request, type Response } from 'express';
import { getCurrentUserId } from '../db.js';
import { registerToken, removeToken, getTokens } from '../services/pushNotifications.js';

export const pushTokensRouter = Router();

// ─── POST /api/push-tokens — register or refresh a token ────────────────────

pushTokensRouter.post('/', async (req: Request, res: Response) => {
  const { token, platform } = req.body ?? {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required' });
  }
  if (!['ios', 'android', 'web'].includes(platform)) {
    return res.status(400).json({ error: 'platform must be ios, android, or web' });
  }

  const userId = getCurrentUserId();
  await registerToken(userId, token, platform as 'ios' | 'android' | 'web');
  res.status(201).json({ ok: true });
});

// ─── DELETE /api/push-tokens — revoke a token ────────────────────────────────

pushTokensRouter.delete('/', async (req: Request, res: Response) => {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ error: 'token is required' });

  await removeToken(token as string);
  res.status(204).end();
});

// ─── GET /api/push-tokens — list tokens for current user ────────────────────

pushTokensRouter.get('/', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const tokens = getTokens(userId).map((t) => ({
    id: t.id,
    platform: t.platform,
    token_preview: t.token.slice(0, 12) + '…',
  }));
  res.json(tokens);
});
