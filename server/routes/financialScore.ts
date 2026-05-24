/**
 * Enhancement 46 — Financial Life Score Sub-Engine
 * Propel Stack AI, LLC
 *
 * Composite Financial Wellness Score (0–100) across 6 dimensions.
 * Weights: Net Worth 20%, DTI 20%, Savings Rate 20%, Emergency Fund 20%, Investment 15%, Bill Payment 5%
 * Feeds into master Life Score (Enhancement 3).
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';

export const financialScoreRouter = Router();
const ai = new Anthropic();

/** Age-bracket net worth benchmarks for normalizing net worth score */
function netWorthBenchmark(age: number): number {
  if (age < 30) return 25000;
  if (age < 40) return 100000;
  if (age < 50) return 250000;
  if (age < 60) return 500000;
  return 750000;
}

/** Compute sub-scores 0–100, return composite weighted score */
function computeScores(data: {
  netWorth: number; dtiRatio: number; savingsRate: number;
  emergencyFundMonths: number; investmentScore: number; billPaymentRate: number;
  age: number;
}) {
  // Net Worth Score (20%): normalize vs age benchmark, capped at 100
  const nwBench = netWorthBenchmark(data.age);
  const net_worth_score = Math.min(100, Math.round((data.netWorth / nwBench) * 100));

  // DTI Score (20%): 100 if DTI <20%, slides to 0 at DTI >60%
  const dti_score = data.dtiRatio <= 0.20
    ? 100
    : data.dtiRatio >= 0.60
      ? 0
      : Math.round(100 - ((data.dtiRatio - 0.20) / 0.40) * 100);

  // Savings Rate Score (20%): 100 if >=20%, 0 if 0%
  const savings_score = Math.min(100, Math.round((data.savingsRate / 0.20) * 100));

  // Emergency Fund Score (20%): 100 if >=6 months, 50 at 3 months, 0 at 0
  const emergency_fund_score = data.emergencyFundMonths >= 6 ? 100
    : data.emergencyFundMonths >= 3 ? 50
    : Math.round((data.emergencyFundMonths / 3) * 50);

  // Investment Score (15%): already computed 0–100 externally
  const investment_score = Math.min(100, Math.max(0, Math.round(data.investmentScore)));

  // Bill Payment Score (5%): on-time payments / total payments
  const bill_payment_score = Math.min(100, Math.round(data.billPaymentRate * 100));

  const composite_score = Math.round(
    net_worth_score * 0.20 +
    dti_score * 0.20 +
    savings_score * 0.20 +
    emergency_fund_score * 0.20 +
    investment_score * 0.15 +
    bill_payment_score * 0.05
  );

  return { net_worth_score, dti_score, savings_score, emergency_fund_score, investment_score, bill_payment_score, composite_score };
}

// POST /api/finance/score/recalculate — trigger full score recalculation
financialScoreRouter.post('/score/recalculate', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    // Pull user age (approximate from account age since no DOB)
    const userRow = await db.prepare('SELECT created_at FROM users WHERE id = $1').get(userId) as any;
    const age = 35; // default - real app would use DOB from profile

    // Net worth: assets - liabilities
    const assetsRow = await db.prepare('SELECT COALESCE(SUM(current_value),0) AS total FROM financial_assets WHERE user_id = $1').get(userId) as any;
    const liabsRow = await db.prepare('SELECT COALESCE(SUM(balance),0) AS total FROM financial_liabilities WHERE user_id = $1').get(userId) as any;
    const netWorth = (assetsRow?.total ?? 0) - (liabsRow?.total ?? 0);

    // DTI: sum monthly_payment / user-entered gross income (from life_signals or manual)
    const monthlyPaymentsRow = await db.prepare('SELECT COALESCE(SUM(monthly_payment),0) AS total FROM financial_liabilities WHERE user_id = $1').get(userId) as any;
    const monthlyPayments = monthlyPaymentsRow?.total ?? 0;

    // Pull income from Plaid 30-day transactions (credit transactions = income)
    const incomeRow = await db.prepare(`
      SELECT COALESCE(SUM(amount),0) AS total FROM plaid_transactions
      WHERE user_id = $1 AND amount < 0 AND date >= CURRENT_DATE - INTERVAL '30 days'
    `).get(userId).catch(() => ({ total: 0 })) as any;
    const grossMonthlyIncome = Math.abs(incomeRow?.total ?? 0) || 5000; // default $5k if no Plaid
    const dtiRatio = grossMonthlyIncome > 0 ? monthlyPayments / grossMonthlyIncome : 0;

    // Savings rate: (income - expenses) / income (30-day Plaid)
    const expensesRow = await db.prepare(`
      SELECT COALESCE(SUM(amount),0) AS total FROM plaid_transactions
      WHERE user_id = $1 AND amount > 0 AND date >= CURRENT_DATE - INTERVAL '30 days'
    `).get(userId).catch(() => ({ total: 0 })) as any;
    const monthlyExpenses = expensesRow?.total ?? 0;
    const savingsRate = grossMonthlyIncome > 0
      ? Math.max(0, (grossMonthlyIncome - monthlyExpenses) / grossMonthlyIncome)
      : 0;

    // Emergency fund: liquid assets / avg monthly expenses
    const liquidAssetsRow = await db.prepare(`
      SELECT COALESCE(SUM(current_value),0) AS total FROM financial_assets
      WHERE user_id = $1 AND asset_type IN ('checking','savings')
    `).get(userId) as any;
    const liquidAssets = liquidAssetsRow?.total ?? 0;
    const avgMonthlyExpenses = monthlyExpenses || 3000;
    const emergencyFundMonths = avgMonthlyExpenses > 0 ? liquidAssets / avgMonthlyExpenses : 0;

    // Investment diversification: simplified score based on asset diversity
    const investmentTypes = await db.prepare(`
      SELECT DISTINCT asset_type FROM financial_assets WHERE user_id = $1 AND asset_type = 'investment'
    `).all(userId) as any[];
    const investmentScore = investmentTypes.length > 0 ? 65 : 30; // simplified: has investments = 65, else 30

    // Bill payment consistency (30-day Plaid): on-time proxy
    const billPaymentRate = 0.95; // default — real app would analyze late payment patterns

    const scores = computeScores({ netWorth, dtiRatio, savingsRate, emergencyFundMonths, investmentScore, billPaymentRate, age });

    const today = new Date().toISOString().split('T')[0];
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO financial_score_history (id, user_id, score_date, composite_score, net_worth_score, dti_score, savings_score, emergency_fund_score, investment_score, bill_payment_score, net_worth, monthly_savings_rate, emergency_fund_months, dti_ratio)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (user_id, score_date) DO UPDATE SET
        composite_score=$4, net_worth_score=$5, dti_score=$6, savings_score=$7, emergency_fund_score=$8,
        investment_score=$9, bill_payment_score=$10, net_worth=$11, monthly_savings_rate=$12,
        emergency_fund_months=$13, dti_ratio=$14
    `).run(id, userId, today, scores.composite_score, scores.net_worth_score, scores.dti_score, scores.savings_score, scores.emergency_fund_score, scores.investment_score, scores.bill_payment_score, netWorth, savingsRate, emergencyFundMonths, dtiRatio);

    // Wire to life_signals for master Life Score
    await db.prepare(`
      INSERT INTO life_signals (id, user_id, hub, score, logged_at)
      VALUES ($1,$2,'finance',$3,NOW())
    `).run(randomUUID(), userId, scores.composite_score).catch(() => {/* non-fatal */});

    // Milestone notifications
    const prevRow = await db.prepare(`
      SELECT composite_score FROM financial_score_history WHERE user_id = $1 AND score_date < $2
      ORDER BY score_date DESC LIMIT 1
    `).get(userId, today) as any;

    const milestones: string[] = [];
    if (prevRow) {
      const prev = prevRow.composite_score;
      for (const threshold of [70, 80, 90]) {
        if (prev < threshold && scores.composite_score >= threshold) {
          milestones.push(`🏆 Financial milestone: your score crossed ${threshold} for the first time!`);
        }
      }
    }

    res.json({ score: scores, milestones, net_worth: netWorth, dti_ratio: Math.round(dtiRatio * 1000) / 10, savings_rate: Math.round(savingsRate * 1000) / 10, emergency_fund_months: Math.round(emergencyFundMonths * 10) / 10 });
  } catch (err) {
    console.error('[financialScore] recalculate error', err);
    res.status(500).json({ error: 'Failed to recalculate financial score' });
  }
});

// GET /api/finance/score — current Financial Wellness Score + breakdown
financialScoreRouter.get('/score', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const latest = await db.prepare(`
      SELECT * FROM financial_score_history WHERE user_id = $1 ORDER BY score_date DESC LIMIT 1
    `).get(userId);
    if (!latest) {
      return res.json({ message: 'No score yet. Run a recalculation to generate your Financial Wellness Score.', score: null });
    }
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch financial score' });
  }
});

// GET /api/finance/score/history — 52-week rolling score history
financialScoreRouter.get('/score/history', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const history = await db.prepare(`
      SELECT score_date, composite_score, net_worth_score, dti_score, savings_score, emergency_fund_score, investment_score, bill_payment_score
      FROM financial_score_history WHERE user_id = $1
        AND score_date >= CURRENT_DATE - INTERVAL '52 weeks'
      ORDER BY score_date ASC
    `).all(userId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch score history' });
  }
});

// GET /api/finance/net-worth — current net worth calculation
financialScoreRouter.get('/net-worth', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const assets = await db.prepare('SELECT * FROM financial_assets WHERE user_id = $1 ORDER BY asset_type, asset_name').all(userId) as any[];
    const liabilities = await db.prepare('SELECT * FROM financial_liabilities WHERE user_id = $1 ORDER BY liability_type, liability_name').all(userId) as any[];

    const totalAssets = assets.reduce((s, a) => s + a.current_value, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const netWorth = totalAssets - totalLiabilities;

    res.json({ net_worth: netWorth, total_assets: totalAssets, total_liabilities: totalLiabilities, assets, liabilities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate net worth' });
  }
});

// POST /api/finance/assets — add manual asset
financialScoreRouter.post('/assets', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { asset_name, asset_type = 'other', current_value } = req.body as {
      asset_name: string; asset_type?: string; current_value: number;
    };
    if (!asset_name || current_value === undefined) return res.status(400).json({ error: 'asset_name and current_value required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO financial_assets (id, user_id, asset_name, asset_type, current_value, source)
      VALUES ($1,$2,$3,$4,$5,'manual')
    `).run(id, userId, asset_name, asset_type, current_value);

    res.status(201).json({ id, asset_name, current_value });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

// POST /api/finance/liabilities — add manual liability
financialScoreRouter.post('/liabilities', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { liability_name, liability_type = 'other', balance, monthly_payment, interest_rate } = req.body as {
      liability_name: string; liability_type?: string; balance: number;
      monthly_payment?: number; interest_rate?: number;
    };
    if (!liability_name || balance === undefined) return res.status(400).json({ error: 'liability_name and balance required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO financial_liabilities (id, user_id, liability_name, liability_type, balance, monthly_payment, interest_rate, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'manual')
    `).run(id, userId, liability_name, liability_type, balance, monthly_payment ?? null, interest_rate ?? null);

    res.status(201).json({ id, liability_name, balance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add liability' });
  }
});

// GET /api/finance/coach-note — weekly AI financial coaching note
financialScoreRouter.get('/coach-note', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const history = await db.prepare(`
      SELECT score_date, composite_score, net_worth_score, dti_score, savings_score,
        emergency_fund_score, investment_score, net_worth, dti_ratio, emergency_fund_months
      FROM financial_score_history WHERE user_id = $1
      ORDER BY score_date DESC LIMIT 4
    `).all(userId) as any[];

    if (history.length === 0) {
      return res.json({ message: 'Recalculate your financial score to unlock your AI coaching note.', note: null });
    }

    const latest = history[0];
    const prev = history[1] ?? null;

    const prompt = `You are a caring financial advisor. In 3-4 sentences, explain what changed in this person's financial score this week and give ONE specific action they should take. Be encouraging, specific, and use plain English.

Latest score: ${latest.composite_score}/100 (${latest.score_date})
${prev ? `Previous score: ${prev.composite_score}/100` : ''}
Sub-scores: Net Worth: ${latest.net_worth_score}, DTI: ${latest.dti_score}, Savings: ${latest.savings_score}, Emergency Fund: ${latest.emergency_fund_score}, Investment: ${latest.investment_score}
Net worth: $${Math.round(latest.net_worth ?? 0).toLocaleString()}, DTI ratio: ${Math.round((latest.dti_ratio ?? 0) * 100)}%, Emergency fund: ${Math.round(latest.emergency_fund_months ?? 0)} months`;

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5', max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const note = (completion.content[0] as any).text || '';
    res.json({ note, score: latest.composite_score, score_date: latest.score_date });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate coach note' });
  }
});
