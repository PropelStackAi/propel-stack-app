/**
 * Enhancement 43 — Smart Bill Negotiation & Subscription Audit
 * Propel Stack AI, LLC
 *
 * Scans Plaid transactions for recurring subscriptions, benchmarks against
 * market rates, generates negotiation scripts, tracks savings.
 * ONE-CLICK CANCEL requires explicit confirmation before any action.
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';
import { randomUUID } from 'node:crypto';

export const billsRouter = Router();
const ai = new Anthropic();

// Market rate benchmarks (monthly averages, USD)
const MARKET_RATES: Record<string, number> = {
  internet: 65, cable: 80, phone: 45, gym: 35,
  streaming: 15, software: 12, music: 10, cloud_storage: 5,
  insurance: 150, mortgage: 0, utilities: 120, other: 20,
};

function detectCategory(merchant: string): string {
  const m = merchant.toLowerCase();
  if (m.includes('netflix') || m.includes('hulu') || m.includes('disney') || m.includes('peacock') || m.includes('hbo') || m.includes('paramount')) return 'streaming';
  if (m.includes('spotify') || m.includes('apple music') || m.includes('tidal')) return 'music';
  if (m.includes('gym') || m.includes('planet fitness') || m.includes('equinox') || m.includes('anytime') || m.includes('la fitness') || m.includes('ymca')) return 'gym';
  if (m.includes('comcast') || m.includes('xfinity') || m.includes('spectrum') || m.includes('cox') || m.includes('att') || m.includes('verizon')) return 'internet';
  if (m.includes('google') || m.includes('dropbox') || m.includes('icloud') || m.includes('microsoft') || m.includes('adobe') || m.includes('notion') || m.includes('slack')) return 'software';
  if (m.includes('t-mobile') || m.includes('sprint') || m.includes('mint mobile')) return 'phone';
  if (m.includes('geico') || m.includes('progressive') || m.includes('allstate') || m.includes('state farm')) return 'insurance';
  return 'other';
}

// POST /api/bills/scan — trigger subscription scan from Plaid transactions
billsRouter.post('/scan', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    // Pull Plaid transactions (Enhancement 18 table)
    const transactions = await db.prepare(`
      SELECT merchant_name, amount, date
      FROM plaid_transactions
      WHERE user_id = $1
        AND amount > 1
        AND amount < 500
        AND date >= CURRENT_DATE - INTERVAL '90 days'
      ORDER BY merchant_name, date
    `).all(userId) as any[];

    // Group by merchant, find recurring (appears >2 months)
    const merchantMap = new Map<string, number[]>();
    for (const t of transactions) {
      if (!t.merchant_name) continue;
      const existing = merchantMap.get(t.merchant_name) ?? [];
      existing.push(t.amount);
      merchantMap.set(t.merchant_name, existing);
    }

    const detected: Array<{
      merchant_name: string; monthly_amount: number; annual_amount: number;
      category: string; overpaying_flag: boolean; savings_opportunity: number;
    }> = [];

    merchantMap.forEach((amounts, merchant) => {
      if (amounts.length < 2) return; // not recurring
      const avgMonthly = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const category = detectCategory(merchant);
      const marketRate = MARKET_RATES[category] ?? MARKET_RATES.other;
      const overpaying = avgMonthly > marketRate * 1.15;
      const savings = overpaying ? Math.round((avgMonthly - marketRate) * 12) : 0;

      detected.push({
        merchant_name: merchant,
        monthly_amount: Math.round(avgMonthly * 100) / 100,
        annual_amount: Math.round(avgMonthly * 12 * 100) / 100,
        category,
        overpaying_flag: overpaying,
        savings_opportunity: savings,
      });
    });

    // Upsert into subscription_scans
    let inserted = 0;
    for (const sub of detected) {
      const existing = await db.prepare('SELECT id FROM subscription_scans WHERE user_id = $1 AND merchant_name = $2').get(userId, sub.merchant_name) as any;
      if (existing) {
        await db.prepare(`
          UPDATE subscription_scans SET monthly_amount=$1, annual_amount=$2, overpaying_flag=$3, savings_opportunity=$4, last_charged=CURRENT_DATE WHERE id=$5
        `).run(sub.monthly_amount, sub.annual_amount, sub.overpaying_flag, sub.savings_opportunity, existing.id);
      } else {
        await db.prepare(`
          INSERT INTO subscription_scans (id, user_id, merchant_name, category, monthly_amount, annual_amount, first_detected, last_charged, overpaying_flag, savings_opportunity)
          VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,CURRENT_DATE,$7,$8)
        `).run(randomUUID(), userId, sub.merchant_name, sub.category, sub.monthly_amount, sub.annual_amount, sub.overpaying_flag, sub.savings_opportunity);
        inserted++;
      }
    }

    res.json({
      scanned: detected.length,
      new_found: inserted,
      total_monthly: Math.round(detected.reduce((a, b) => a + b.monthly_amount, 0) * 100) / 100,
      flagged_overpaying: detected.filter(d => d.overpaying_flag).length,
      potential_annual_savings: detected.reduce((a, b) => a + b.savings_opportunity, 0),
    });
  } catch (err) {
    console.error('[bills] scan error', err);
    res.status(500).json({ error: 'Failed to scan subscriptions' });
  }
});

// GET /api/bills/subscriptions — list all detected subscriptions
billsRouter.get('/subscriptions', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const subs = await db.prepare(`
      SELECT * FROM subscription_scans WHERE user_id = $1 ORDER BY monthly_amount DESC
    `).all(userId);
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// POST /api/bills/generate-script/:id — generate 3 negotiation scripts for a subscription
billsRouter.post('/generate-script/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const sub = await db.prepare('SELECT * FROM subscription_scans WHERE id = $1 AND user_id = $2').get(req.params.id, userId) as any;
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const marketRate = MARKET_RATES[sub.category] ?? MARKET_RATES.other;
    const tenure = sub.first_detected
      ? Math.max(1, Math.round((Date.now() - new Date(sub.first_detected).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 12;

    const scriptTypes = [
      { type: 'cancel_threat', label: 'Cancel Threat', opener: "I'm thinking of cancelling" },
      { type: 'loyalty_discount', label: 'Loyalty Discount', opener: `I've been a customer for ${tenure} months` },
      { type: 'market_rate', label: 'Market Rate', opener: `Competitors offer this for $${marketRate}/month` },
    ];

    const scripts = [];
    for (const st of scriptTypes) {
      const prompt = scrubPII(`Generate a concise, word-for-word phone/chat negotiation script for:
Provider: ${sub.merchant_name}
Current monthly charge: $${sub.monthly_amount}
Market average: $${marketRate}/month
Customer tenure: ~${tenure} months
Script type: ${st.label} (opener: "${st.opener}")

Write a natural 3-4 sentence script the customer says verbatim. Include specific dollar amounts. End with a clear ask.`);

      const completion = await ai.messages.create({
        model: 'claude-haiku-4-5', max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const scriptText = (completion.content[0] as any).text || '';
      const scriptId = randomUUID();
      const estimatedSavings = sub.monthly_amount - marketRate;

      await db.prepare(`
        INSERT INTO negotiation_scripts (id, subscription_id, user_id, script_text, provider_name, estimated_savings, script_type)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `).run(scriptId, sub.id, userId, scriptText, sub.merchant_name, Math.max(0, estimatedSavings), st.type);

      scripts.push({ id: scriptId, type: st.type, label: st.label, script_text: scriptText, estimated_savings: Math.max(0, estimatedSavings) });
    }

    res.json({ scripts, provider: sub.merchant_name, current_monthly: sub.monthly_amount, market_rate: marketRate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate scripts' });
  }
});

// POST /api/bills/cancel/:id — initiate AI-assisted cancellation (requires confirmation flag)
billsRouter.post('/cancel/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { confirmed } = req.body as { confirmed: boolean };

    if (!confirmed) {
      return res.status(400).json({
        error: 'confirmation_required',
        message: 'You must explicitly confirm cancellation. This action cannot be undone.',
        confirm_prompt: 'Set confirmed: true to proceed with cancellation guidance.',
      });
    }

    const sub = await db.prepare('SELECT * FROM subscription_scans WHERE id = $1 AND user_id = $2').get(req.params.id, userId) as any;
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    // In production this would use Credential Bridge to navigate to cancel page.
    // For MVP: return cancel page URL guidance.
    const cancelGuidance = `To cancel ${sub.merchant_name}: (1) Log into your ${sub.merchant_name} account, (2) Go to Account Settings > Subscription, (3) Select 'Cancel Subscription', (4) Complete any retention flow that appears. Once cancelled, return here and click 'Mark as Cancelled' to log your savings.`;

    // Mark as cancelled
    await db.prepare('UPDATE subscription_scans SET status = $1 WHERE id = $2').run('cancelled', sub.id);

    // Log savings
    await db.prepare(`
      INSERT INTO savings_log (id, user_id, subscription_id, action_type, monthly_savings, annual_savings)
      VALUES ($1,$2,$3,'cancelled',$4,$5)
    `).run(randomUUID(), userId, sub.id, sub.monthly_amount, sub.annual_amount);

    res.json({
      cancelled: true,
      guidance: cancelGuidance,
      monthly_savings: sub.monthly_amount,
      annual_savings: sub.annual_amount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process cancellation' });
  }
});

// GET /api/bills/savings — total savings summary
billsRouter.get('/savings', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const rows = await db.prepare(`
      SELECT
        SUM(monthly_savings) AS total_monthly_savings,
        SUM(annual_savings) AS total_annual_savings,
        COUNT(*) AS actions_taken
      FROM savings_log WHERE user_id = $1
    `).get(userId) as any;

    const recent = await db.prepare(`
      SELECT sl.*, ss.merchant_name FROM savings_log sl
      LEFT JOIN subscription_scans ss ON ss.id = sl.subscription_id
      WHERE sl.user_id = $1 ORDER BY sl.achieved_at DESC LIMIT 10
    `).all(userId);

    res.json({
      total_monthly_savings: Math.round((rows?.total_monthly_savings ?? 0) * 100) / 100,
      total_annual_savings: Math.round((rows?.total_annual_savings ?? 0) * 100) / 100,
      actions_taken: Number(rows?.actions_taken ?? 0),
      recent,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch savings' });
  }
});

// POST /api/bills/log-savings — manually log a confirmed savings event
billsRouter.post('/log-savings', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { subscription_id, action_type = 'negotiated', monthly_savings, annual_savings } = req.body as {
      subscription_id?: string; action_type?: string; monthly_savings: number; annual_savings?: number;
    };
    if (!monthly_savings) return res.status(400).json({ error: 'monthly_savings required' });

    await db.prepare(`
      INSERT INTO savings_log (id, user_id, subscription_id, action_type, monthly_savings, annual_savings)
      VALUES ($1,$2,$3,$4,$5,$6)
    `).run(randomUUID(), userId, subscription_id ?? null, action_type, monthly_savings, annual_savings ?? monthly_savings * 12);

    res.status(201).json({ logged: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log savings' });
  }
});
