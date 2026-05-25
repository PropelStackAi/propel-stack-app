/**
 * Billing Routes — Phase 3 Step 10
 * Propel Stack AI, LLC
 *
 * Stripe Checkout integration with monthly + annual billing periods.
 * Annual = monthly × 10 (2 months free). Annual trial = 14 days.
 *
 * ACTIVATION CHECKLIST (set in Railway env vars):
 *   STRIPE_SECRET_KEY           — sk_live_xxx (from Stripe Dashboard)
 *   STRIPE_WEBHOOK_SECRET       — whsec_xxx (from webhook endpoint config)
 *   STRIPE_PRICE_SOLO_MONTHLY   — price_xxx
 *   STRIPE_PRICE_SOLO_ANNUAL    — price_xxx
 *   STRIPE_PRICE_FAMILY_MONTHLY — price_xxx
 *   STRIPE_PRICE_FAMILY_ANNUAL  — price_xxx
 *   STRIPE_PRICE_NETWORK_MONTHLY— price_xxx
 *   STRIPE_PRICE_NETWORK_ANNUAL — price_xxx
 *   STRIPE_PRICE_ELITE_MONTHLY  — price_xxx
 *   STRIPE_PRICE_ELITE_ANNUAL   — price_xxx
 *   FRONTEND_URL                — https://propel-stack-app.vercel.app
 */

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';

export const billingRouter = Router();

// ─── Price ID map (env vars override hardcoded stubs) ─────────────────────────

const PRICE_IDS: Record<string, Record<string, string>> = {
  solo:    { monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY    ?? 'price_solo_monthly',    annual: process.env.STRIPE_PRICE_SOLO_ANNUAL    ?? 'price_solo_annual'    },
  family:  { monthly: process.env.STRIPE_PRICE_FAMILY_MONTHLY  ?? 'price_family_monthly',  annual: process.env.STRIPE_PRICE_FAMILY_ANNUAL  ?? 'price_family_annual'  },
  network: { monthly: process.env.STRIPE_PRICE_NETWORK_MONTHLY ?? 'price_network_monthly', annual: process.env.STRIPE_PRICE_NETWORK_ANNUAL ?? 'price_network_annual' },
  elite:   { monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY   ?? 'price_elite_monthly',   annual: process.env.STRIPE_PRICE_ELITE_ANNUAL   ?? 'price_elite_annual'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateStripeCustomer(userId: string, stripe: unknown): Promise<string> {
  const s = stripe as {
    customers: {
      create: (opts: { email: string; metadata: Record<string, string> }) => Promise<{ id: string }>;
    };
  };
  const user = await db
    .prepare('SELECT email, stripe_customer_id FROM users WHERE id = ?')
    .get(userId) as { email: string; stripe_customer_id?: string } | undefined;

  if (user?.stripe_customer_id) return user.stripe_customer_id;

  const customer = await s.customers.create({
    email: user?.email ?? '',
    metadata: { userId },
  });

  await db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customer.id, userId);
  return customer.id;
}

// ─── POST /api/billing/checkout ───────────────────────────────────────────────

billingRouter.post('/checkout', async (req: Request, res: Response) => {
  const { planId, billingPeriod = 'monthly' } = req.body ?? {};

  if (!planId || !PRICE_IDS[planId]) {
    return res.status(400).json({ error: 'Invalid plan ID. Valid: solo, family, network, elite' });
  }
  if (!['monthly', 'annual'].includes(billingPeriod)) {
    return res.status(400).json({ error: 'billingPeriod must be "monthly" or "annual"' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({
      error: 'Billing not configured',
      message: 'Set STRIPE_SECRET_KEY in Railway environment variables to activate checkout.',
    });
  }

  const userId = getCurrentUserId();
  const priceId = PRICE_IDS[planId][billingPeriod];
  const frontendUrl = process.env.FRONTEND_URL ?? 'https://propel-stack-app.vercel.app';

  try {
    // Dynamic import so server starts without stripe package installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe') as (key: string) => {
      customers: { create: (opts: unknown) => Promise<{ id: string }> };
      checkout: {
        sessions: {
          create: (opts: unknown) => Promise<{ url: string }>;
        };
      };
    };
    const stripe = Stripe(stripeKey);

    const customerId = await getOrCreateStripeCustomer(userId, stripe);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/#/dashboard?upgraded=true&plan=${planId}`,
      cancel_url:  `${frontendUrl}/#/plans`,
      subscription_data: {
        trial_period_days: billingPeriod === 'annual' ? 14 : 7,
        metadata: { userId, planId, billingPeriod },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing] Stripe checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ─── POST /api/billing/portal — billing management portal ────────────────────

billingRouter.post('/portal', async (req: Request, res: Response) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({ error: 'Billing not configured' });
  }

  const userId = getCurrentUserId();
  const frontendUrl = process.env.FRONTEND_URL ?? 'https://propel-stack-app.vercel.app';

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe') as (key: string) => {
      billingPortal: { sessions: { create: (opts: unknown) => Promise<{ url: string }> } };
    };
    const stripe = Stripe(stripeKey);

    const user = await db
      .prepare('SELECT stripe_customer_id FROM users WHERE id = ?')
      .get(userId) as { stripe_customer_id?: string } | undefined;

    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found. Subscribe first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${frontendUrl}/#/settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing] Portal error:', err);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// ─── POST /api/webhooks/stripe — Stripe webhook handler ──────────────────────
// NOTE: This route is registered with express.raw() in index.ts BEFORE express.json().
// That means req.body here is a Buffer, not parsed JSON.

billingRouter.post('/webhooks/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[billing] STRIPE_WEBHOOK_SECRET not set — webhook ignored');
    return res.status(200).json({ received: true });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe') as (key: string) => {
      webhooks: { constructEvent: (body: unknown, sig: unknown, secret: string) => typeof event };
    };
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY ?? '');
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[billing] Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Webhook signature invalid' });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = (sub.metadata as Record<string, string>)?.userId;
        const planId = (sub.metadata as Record<string, string>)?.planId;
        const billingPeriod = (sub.metadata as Record<string, string>)?.billingPeriod;
        if (userId && planId) {
          // Update token budget immediately (proration)
          const BUDGETS: Record<string, number> = {
            spark: 25_000, solo: 500_000, family: 2_000_000, network: 5_000_000, elite: 15_000_000,
          };
          await db.prepare(
            `UPDATE users SET plan_tier = ?, billing_period = ?, stripe_subscription_id = ?, updated_at = datetime('now') WHERE id = ?`
          ).run(planId, billingPeriod ?? 'monthly', sub.id as string, userId);
          console.log(`[billing] Subscription updated: user=${userId} plan=${planId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = (sub.metadata as Record<string, string>)?.userId;
        if (userId) {
          await db.prepare(
            `UPDATE users SET plan_tier = 'spark', stripe_subscription_id = NULL, updated_at = datetime('now') WHERE id = ?`
          ).run(userId);
          console.log(`[billing] Subscription cancelled: user=${userId} → downgraded to spark`);
        }
        break;
      }

      default:
        // Ignore other events
        break;
    }
  } catch (err) {
    console.error('[billing] Webhook handler error:', err);
    // Return 200 so Stripe doesn't retry
  }

  res.json({ received: true });
});
