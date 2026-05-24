// ─── Personal Finance Hub Routes ─────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC
//
// COMPLIANCE: Visibility & organisation tool only. No investment advice.
// No buy/sell/hold recommendations. AI observations only — never advice.
// Account numbers, routing numbers, and card numbers NEVER passed to AI.

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';

export const personalFinanceRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ─── AI helper ────────────────────────────────────────────────────────────────

async function callAI(system: string, userMsg: string, maxTokens = 500): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((c) => c.type === 'text')?.text ?? '';
}

// COMPLIANCE: AI system prompt — observations only, zero financial advice
const INSIGHTS_SYSTEM = `You are a spend observation assistant for Propel Stack AI Life OS.
Your role is to surface factual observations about the user's spending patterns — nothing more.

STRICT RULES you must follow every response:
- NEVER give investment, financial, tax, or legal advice
- NEVER say "you should buy/sell/invest/allocate"
- NEVER recommend specific financial products, funds, or accounts
- Only describe what the numbers show (observations, patterns, trends)
- Keep it under 200 words
- Use friendly, supportive language — not judgmental

Format with 3 short sections:
1. 📊 This Month — top spending categories vs last month
2. 📈 Trends — any notable patterns in the data
3. 💡 Observation — one factual spending observation

End with: "This is a spending summary, not financial advice. Consult a licensed financial advisor for personal guidance."`;

// ─── Accounts ─────────────────────────────────────────────────────────────────

personalFinanceRouter.get('/accounts', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare('SELECT * FROM finance_accounts WHERE user_id = ? AND is_active = 1 ORDER BY account_type, display_name')
      .all(userId);
    res.json({ accounts: rows });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.post('/accounts', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { account_type = 'checking', display_name, balance = 0, balance_date } = req.body as Record<string, unknown>;
    if (!display_name) return res.status(400).json({ error: 'display_name required' });
    const id = randomUUID();
    const today = new Date().toISOString().slice(0, 10);
    await db.prepare(`
      INSERT INTO finance_accounts (id, user_id, account_type, display_name, balance, balance_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, account_type, display_name, Number(balance), balance_date || today);
    const row = await db.prepare('SELECT * FROM finance_accounts WHERE id = ?').get(id);
    res.json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.patch('/accounts/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { display_name, balance, balance_date, account_type } = req.body as Record<string, unknown>;
    const today = new Date().toISOString().slice(0, 10);
    await db.prepare(`
      UPDATE finance_accounts
      SET display_name = COALESCE(?, display_name),
          balance = COALESCE(?, balance),
          balance_date = COALESCE(?, ?),
          account_type = COALESCE(?, account_type)
      WHERE id = ? AND user_id = ?
    `).run(display_name ?? null, balance !== undefined ? Number(balance) : null, balance_date ?? null, today, account_type ?? null, req.params.id, userId);
    const row = await db.prepare('SELECT * FROM finance_accounts WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.delete('/accounts/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('UPDATE finance_accounts SET is_active = 0 WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Transactions ─────────────────────────────────────────────────────────────

personalFinanceRouter.get('/transactions', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { account_id, category, start_date, end_date, limit = '50' } = req.query as Record<string, string>;
    let sql = 'SELECT ft.*, fa.display_name as account_name FROM finance_transactions ft LEFT JOIN finance_accounts fa ON fa.id = ft.account_id WHERE ft.user_id = ?';
    const params: unknown[] = [userId];
    if (account_id) { sql += ' AND ft.account_id = ?'; params.push(account_id); }
    if (category)   { sql += ' AND (ft.user_category = ? OR (ft.user_category = \'\' AND ft.category = ?))'; params.push(category, category); }
    if (start_date) { sql += ' AND ft.txn_date >= ?'; params.push(start_date); }
    if (end_date)   { sql += ' AND ft.txn_date <= ?'; params.push(end_date); }
    sql += ` ORDER BY ft.txn_date DESC LIMIT ${Math.min(Number(limit), 200)}`;
    const rows = await db.prepare(sql).all(...params);
    res.json({ transactions: rows });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.post('/transactions', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { account_id, amount, category = 'Other', merchant_name = '', txn_date, is_recurring = false, notes = '' } = req.body as Record<string, unknown>;
    if (!amount || !txn_date) return res.status(400).json({ error: 'amount and txn_date required' });
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO finance_transactions (id, user_id, account_id, amount, category, merchant_name, txn_date, is_recurring, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, account_id || null, Number(amount), category, merchant_name, txn_date, is_recurring ? 1 : 0, notes);
    const row = await db.prepare('SELECT * FROM finance_transactions WHERE id = ?').get(id);
    res.json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.patch('/transactions/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { user_category, notes } = req.body as Record<string, unknown>;
    await db.prepare(`
      UPDATE finance_transactions SET user_category = COALESCE(?, user_category), notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
    `).run(user_category ?? null, notes ?? null, req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.delete('/transactions/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM finance_transactions WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Spend Summary ────────────────────────────────────────────────────────────

personalFinanceRouter.get('/summary', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const { start_date = monthStart, end_date = now.toISOString().slice(0, 10) } = req.query as Record<string, string>;

    const byCategory = await db.prepare(`
      SELECT COALESCE(NULLIF(user_category,''), category) as cat,
             SUM(ABS(amount)) as total,
             COUNT(*) as count
      FROM finance_transactions
      WHERE user_id = ? AND txn_date BETWEEN ? AND ? AND amount < 0
      GROUP BY cat
      ORDER BY total DESC
    `).all(userId, start_date, end_date);

    const totalSpend = (byCategory as Record<string, unknown>[]).reduce((s, r) => s + Number(r.total), 0);
    const totalIncome = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions
      WHERE user_id = ? AND txn_date BETWEEN ? AND ? AND amount > 0
    `).get(userId, start_date, end_date) as Record<string, unknown> | undefined;

    res.json({
      start_date,
      end_date,
      by_category: byCategory,
      total_spend: totalSpend,
      total_income: Number(totalIncome?.total ?? 0),
    });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Budgets ──────────────────────────────────────────────────────────────────

personalFinanceRouter.get('/budgets', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    // Return budgets with this month's spend
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const budgets = await db.prepare(`
      SELECT fb.*,
        COALESCE((
          SELECT SUM(ABS(ft.amount))
          FROM finance_transactions ft
          WHERE ft.user_id = fb.user_id
            AND (COALESCE(NULLIF(ft.user_category,''), ft.category)) = fb.category
            AND ft.txn_date >= ?
            AND ft.amount < 0
        ), 0) as spent
      FROM finance_budgets fb
      WHERE fb.user_id = ?
      ORDER BY fb.category
    `).all(monthStart, userId);
    res.json({ budgets });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.post('/budgets', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { category, monthly_amt } = req.body as Record<string, unknown>;
    if (!category || monthly_amt === undefined) return res.status(400).json({ error: 'category and monthly_amt required' });
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO finance_budgets (id, user_id, category, monthly_amt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, category) DO UPDATE SET monthly_amt = EXCLUDED.monthly_amt
    `).run(id, userId, category, Number(monthly_amt));
    const row = await db.prepare('SELECT * FROM finance_budgets WHERE user_id = ? AND category = ?').get(userId, category);
    res.json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.delete('/budgets/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM finance_budgets WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Bills ────────────────────────────────────────────────────────────────────

personalFinanceRouter.get('/bills', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare('SELECT * FROM finance_bills WHERE user_id = ? AND is_active = 1 ORDER BY due_day').all(userId);
    res.json({ bills: rows });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.post('/bills', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, amount, due_day = 1, recurrence = 'monthly', is_autopay = false, category = 'Bills & Utilities' } = req.body as Record<string, unknown>;
    if (!name || !amount) return res.status(400).json({ error: 'name and amount required' });
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO finance_bills (id, user_id, name, amount, due_day, recurrence, is_autopay, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, Number(amount), Number(due_day), recurrence, is_autopay ? 1 : 0, category);
    const row = await db.prepare('SELECT * FROM finance_bills WHERE id = ?').get(id);
    res.json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.patch('/bills/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, amount, due_day, is_autopay, last_paid_date, is_active } = req.body as Record<string, unknown>;
    await db.prepare(`
      UPDATE finance_bills
      SET name = COALESCE(?, name),
          amount = COALESCE(?, amount),
          due_day = COALESCE(?, due_day),
          is_autopay = COALESCE(?, is_autopay),
          last_paid_date = COALESCE(?, last_paid_date),
          is_active = COALESCE(?, is_active)
      WHERE id = ? AND user_id = ?
    `).run(name ?? null, amount !== undefined ? Number(amount) : null, due_day !== undefined ? Number(due_day) : null,
           is_autopay !== undefined ? (is_autopay ? 1 : 0) : null, last_paid_date ?? null,
           is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.delete('/bills/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('UPDATE finance_bills SET is_active = 0 WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Savings Goals ────────────────────────────────────────────────────────────

personalFinanceRouter.get('/savings-goals', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare('SELECT * FROM finance_savings_goals WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    res.json({ goals: rows });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.post('/savings-goals', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, target_amount, current_amount = 0, target_date = '', emoji = '💰' } = req.body as Record<string, unknown>;
    if (!name || !target_amount) return res.status(400).json({ error: 'name and target_amount required' });
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO finance_savings_goals (id, user_id, name, target_amount, current_amount, target_date, emoji)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, Number(target_amount), Number(current_amount), target_date, emoji);
    const row = await db.prepare('SELECT * FROM finance_savings_goals WHERE id = ?').get(id);
    res.json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.patch('/savings-goals/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, target_amount, current_amount, target_date, emoji } = req.body as Record<string, unknown>;
    await db.prepare(`
      UPDATE finance_savings_goals
      SET name = COALESCE(?, name),
          target_amount = COALESCE(?, target_amount),
          current_amount = COALESCE(?, current_amount),
          target_date = COALESCE(?, target_date),
          emoji = COALESCE(?, emoji)
      WHERE id = ? AND user_id = ?
    `).run(name ?? null, target_amount !== undefined ? Number(target_amount) : null,
           current_amount !== undefined ? Number(current_amount) : null,
           target_date ?? null, emoji ?? null, req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.delete('/savings-goals/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM finance_savings_goals WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Net Worth ────────────────────────────────────────────────────────────────

personalFinanceRouter.get('/net-worth', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const items = await db.prepare('SELECT * FROM finance_net_worth_items WHERE user_id = ? ORDER BY item_type, category').all(userId) as Record<string, unknown>[];
    const assets = items.filter((i) => i.item_type === 'asset').reduce((s, i) => s + Number(i.amount), 0);
    const liabilities = items.filter((i) => i.item_type === 'liability').reduce((s, i) => s + Number(i.amount), 0);
    res.json({ items, total_assets: assets, total_liabilities: liabilities, net_worth: assets - liabilities });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.post('/net-worth', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, item_type = 'asset', amount, category = 'Other' } = req.body as Record<string, unknown>;
    if (!name || amount === undefined) return res.status(400).json({ error: 'name and amount required' });
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO finance_net_worth_items (id, user_id, name, item_type, amount, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, item_type, Number(amount), category);
    const row = await db.prepare('SELECT * FROM finance_net_worth_items WHERE id = ?').get(id);
    res.json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.patch('/net-worth/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, amount, category } = req.body as Record<string, unknown>;
    await db.prepare(`
      UPDATE finance_net_worth_items
      SET name = COALESCE(?, name), amount = COALESCE(?, amount), category = COALESCE(?, category)
      WHERE id = ? AND user_id = ?
    `).run(name ?? null, amount !== undefined ? Number(amount) : null, category ?? null, req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

personalFinanceRouter.delete('/net-worth/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM finance_net_worth_items WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── AI Spend Insights ────────────────────────────────────────────────────────

personalFinanceRouter.post('/insights', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

    // Build category spend snapshot — NO account numbers, NO merchant details beyond category
    const thisMonthSpend = await db.prepare(`
      SELECT COALESCE(NULLIF(user_category,''), category) as cat, SUM(ABS(amount)) as total
      FROM finance_transactions WHERE user_id = ? AND txn_date >= ? AND amount < 0
      GROUP BY cat ORDER BY total DESC LIMIT 10
    `).all(userId, thisMonth) as Record<string, unknown>[];

    const lastMonthSpend = await db.prepare(`
      SELECT COALESCE(NULLIF(user_category,''), category) as cat, SUM(ABS(amount)) as total
      FROM finance_transactions WHERE user_id = ? AND txn_date >= ? AND txn_date < ? AND amount < 0
      GROUP BY cat ORDER BY total DESC LIMIT 10
    `).all(userId, lastMonth, thisMonth) as Record<string, unknown>[];

    const budgets = await db.prepare('SELECT category, monthly_amt FROM finance_budgets WHERE user_id = ?').all(userId) as Record<string, unknown>[];

    if (thisMonthSpend.length === 0) {
      return res.json({ insight: 'No spending data available yet. Add some transactions to get personalised spending observations.' });
    }

    const snapshot = {
      this_month_by_category: thisMonthSpend,
      last_month_by_category: lastMonthSpend,
      budgets_set: budgets,
    };

    const insight = await callAI(INSIGHTS_SYSTEM, JSON.stringify(snapshot), 500);
    res.json({ insight });
  } catch (err) {
    console.error('[personal-finance/insights]', err);
    res.status(500).json({ error: String(err) });
  }
});
