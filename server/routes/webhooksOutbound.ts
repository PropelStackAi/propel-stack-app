/**
 * Outbound Webhooks — Phase 4 Step 8
 * Propel Stack AI, LLC
 *
 * Users register webhook endpoints; the platform fires signed POST requests
 * on key lifecycle events (task.completed, goal.achieved, etc.).
 * HMAC-SHA256 signature header `X-Propel-Signature: sha256=<hex>` on every call.
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';

export const webhooksOutboundRouter = Router();

// ─── Available events ────────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  'task.completed',
  'task.created',
  'goal.achieved',
  'goal.created',
  'streak.milestone',
  'weekly_review.generated',
  'morning_briefing.sent',
  'memory.created',
  'health.synced',
  'sentiment.low',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

// ─── CRUD: List webhooks ──────────────────────────────────────────────────────

webhooksOutboundRouter.get('/', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const hooks = await db
      .prepare(`SELECT id, url, events, description, is_active, failure_count, last_triggered_at, created_at
                FROM user_webhooks WHERE user_id = ? ORDER BY created_at DESC`)
      .all(userId);

    // Mask secret in list responses
    res.json({ webhooks: hooks });
  } catch (err) {
    console.error('[webhooks] list error', err);
    res.status(500).json({ error: 'Failed to load webhooks' });
  }
});

// ─── Create webhook ───────────────────────────────────────────────────────────

webhooksOutboundRouter.post('/', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { url, events, description } = req.body as {
      url: string;
      events: string[];
      description?: string;
    };

    if (!url || !url.startsWith('https://')) {
      return res.status(400).json({ error: 'url must be a valid HTTPS URL' });
    }
    if (!events || events.length === 0) {
      return res.status(400).json({ error: 'At least one event must be selected' });
    }

    const secret = crypto.randomBytes(32).toString('hex');
    const id = crypto.randomUUID();

    await db
      .prepare(`INSERT INTO user_webhooks (id, user_id, url, secret, events, description)
                VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, userId, url, secret, JSON.stringify(events), description ?? '');

    res.status(201).json({ id, secret, message: 'Webhook created. Save the secret — it is shown only once.' });
  } catch (err) {
    console.error('[webhooks] create error', err);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// ─── Update webhook ───────────────────────────────────────────────────────────

webhooksOutboundRouter.patch('/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params;
    const { is_active, events, description } = req.body as {
      is_active?: boolean;
      events?: string[];
      description?: string;
    };

    const hook = await db
      .prepare('SELECT id FROM user_webhooks WHERE id = ? AND user_id = ?')
      .get(id, userId);
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });

    if (is_active !== undefined) {
      await db.prepare('UPDATE user_webhooks SET is_active = ?, failure_count = 0 WHERE id = ?').run(is_active, id);
    }
    if (events) {
      await db.prepare('UPDATE user_webhooks SET events = ? WHERE id = ?').run(JSON.stringify(events), id);
    }
    if (description !== undefined) {
      await db.prepare('UPDATE user_webhooks SET description = ? WHERE id = ?').run(description, id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[webhooks] update error', err);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// ─── Delete webhook ───────────────────────────────────────────────────────────

webhooksOutboundRouter.delete('/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params;
    await db
      .prepare('DELETE FROM user_webhooks WHERE id = ? AND user_id = ?')
      .run(id, userId);
    res.json({ success: true });
  } catch (err) {
    console.error('[webhooks] delete error', err);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// ─── Test webhook (sends a ping) ─────────────────────────────────────────────

webhooksOutboundRouter.post('/:id/test', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params;

    const hook = await db
      .prepare('SELECT * FROM user_webhooks WHERE id = ? AND user_id = ?')
      .get(id, userId) as Record<string, unknown> | undefined;
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });

    const payload = {
      event: 'ping',
      timestamp: new Date().toISOString(),
      user_id: userId,
      data: { message: 'This is a test delivery from Propel Stack AI' },
    };

    const result = await deliverWebhook(hook as unknown as WebhookRow, 'ping', payload);
    res.json(result);
  } catch (err) {
    console.error('[webhooks] test error', err);
    res.status(500).json({ error: 'Failed to send test' });
  }
});

// ─── Delivery engine (exported for use by other routes) ──────────────────────

interface WebhookRow {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  events: string | string[];
  is_active: boolean;
  failure_count: number;
}

export async function triggerUserWebhooks(
  userId: string,
  eventType: WebhookEvent | string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const hooks = await db
      .prepare('SELECT * FROM user_webhooks WHERE user_id = ? AND is_active = true')
      .all(userId) as unknown as WebhookRow[];

    const matching = hooks.filter((h) => {
      const evts = Array.isArray(h.events) ? h.events : JSON.parse(h.events as string);
      return evts.includes(eventType) || evts.includes('*');
    });

    await Promise.allSettled(
      matching.map((hook) => deliverWebhook(hook, eventType, payload))
    );
  } catch (err) {
    console.error('[webhooks] trigger error', err);
  }
}

async function deliverWebhook(
  hook: WebhookRow,
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    user_id: hook.user_id,
    data: payload,
  });

  const signature = crypto
    .createHmac('sha256', hook.secret)
    .update(body)
    .digest('hex');

  try {
    const response = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Propel-Signature': `sha256=${signature}`,
        'X-Propel-Event': eventType,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      await db
        .prepare('UPDATE user_webhooks SET last_triggered_at = NOW(), failure_count = 0 WHERE id = ?')
        .run(hook.id);
      return { ok: true, status: response.status };
    } else {
      await incrementFailure(hook.id, hook.failure_count);
      return { ok: false, status: response.status };
    }
  } catch (err: unknown) {
    await incrementFailure(hook.id, hook.failure_count);
    return { ok: false, error: String(err) };
  }
}

async function incrementFailure(id: string, currentCount: number) {
  const newCount = (currentCount || 0) + 1;
  await db
    .prepare('UPDATE user_webhooks SET failure_count = ?, is_active = ? WHERE id = ?')
    .run(newCount, newCount < 5, id);
}
