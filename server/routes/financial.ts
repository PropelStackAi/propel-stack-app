import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { complete, TokenBudgetExceededError } from '../ai-gateway.js';
import { crudRouter } from '../lib/crud-routes.js';
import {
  FINHUB_DISCLAIMER_VERSION,
  ackInputSchema,
  budgetCategorySchema,
  transactionSchema,
  billSchema,
  goalSchema,
  investmentSchema,
  netWorthSchema,
  computeNetWorth,
  rowToBudgetCategory,
  rowToTransaction,
  rowToBill,
  rowToGoal,
  rowToInvestment,
  rowToSnapshot,
  newId,
} from '../lib/financial.js';

/**
 * Financial Command Center API (Session 3). Synchronous sql.js access (HARD RULE #5).
 * The disclaimer gate (below) must be acknowledged before the client renders any feature.
 */
export const financialRouter = Router();

const AI_DISCLAIMER = 'AI-generated information only. Not financial advice. Consult a licensed professional.';

function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

// ---- Disclaimer gate ----

financialRouter.get('/disclaimer', (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const row = db
    .prepare(
      `SELECT version, acknowledged_at, signature_name
       FROM financial_disclaimer_acknowledgments
       WHERE user_id = ? AND version = ?
       ORDER BY acknowledged_at DESC LIMIT 1`,
    )
    .get(userId, FINHUB_DISCLAIMER_VERSION) as
    | { version: string; acknowledged_at: string; signature_name: string }
    | undefined;

  res.json({
    version: FINHUB_DISCLAIMER_VERSION,
    acknowledged: Boolean(row),
    acknowledgedAt: row?.acknowledged_at ?? null,
    signatureName: row?.signature_name ?? null,
  });
});

financialRouter.post('/disclaimer', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = ackInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A typed full-name signature is required.' });
  }
  db.prepare(
    `INSERT INTO financial_disclaimer_acknowledgments
       (id, user_id, version, signature_name, ip_address)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(newId(), userId, FINHUB_DISCLAIMER_VERSION, parsed.data.signatureName, clientIp(req));

  res.status(201).json({
    version: FINHUB_DISCLAIMER_VERSION,
    acknowledged: true,
    acknowledgedAt: new Date().toISOString(),
    signatureName: parsed.data.signatureName,
  });
});

// ---- Flat CRUD entities ----

financialRouter.use(
  '/budget-categories',
  crudRouter({
    table: 'budget_categories',
    columns: ['name', 'type', 'monthly_budget'],
    schema: budgetCategorySchema,
    mapRow: rowToBudgetCategory,
    toRow: (d) => ({ name: d.name, type: d.type, monthly_budget: d.monthlyBudget }),
  }),
);

financialRouter.use(
  '/transactions',
  crudRouter({
    table: 'transactions',
    columns: ['category_id', 'type', 'amount', 'description', 'occurred_at'],
    schema: transactionSchema,
    mapRow: rowToTransaction,
    orderBy: 'occurred_at DESC',
    toRow: (d) => ({
      category_id: d.categoryId,
      type: d.type,
      amount: d.amount,
      description: d.description,
      occurred_at: d.occurredAt,
    }),
  }),
);

financialRouter.use(
  '/bills',
  crudRouter({
    table: 'bills',
    columns: ['name', 'amount', 'due_date', 'recurrence', 'is_paid'],
    schema: billSchema,
    mapRow: rowToBill,
    orderBy: 'due_date ASC',
    toRow: (d) => ({
      name: d.name,
      amount: d.amount,
      due_date: d.dueDate,
      recurrence: d.recurrence,
      is_paid: d.isPaid ? 1 : 0,
    }),
  }),
);

financialRouter.use(
  '/goals',
  crudRouter({
    table: 'financial_goals',
    columns: ['name', 'kind', 'target_amount', 'current_amount', 'target_date'],
    schema: goalSchema,
    mapRow: rowToGoal,
    toRow: (d) => ({
      name: d.name,
      kind: d.kind,
      target_amount: d.targetAmount,
      current_amount: d.currentAmount,
      target_date: d.targetDate,
    }),
  }),
);

financialRouter.use(
  '/investments',
  crudRouter({
    table: 'investments',
    columns: ['name', 'symbol', 'shares', 'cost_basis', 'current_value'],
    schema: investmentSchema,
    mapRow: rowToInvestment,
    touchUpdatedAt: true,
    toRow: (d) => ({
      name: d.name,
      symbol: d.symbol,
      shares: d.shares,
      cost_basis: d.costBasis,
      current_value: d.currentValue,
    }),
  }),
);

// ---- Net worth snapshots (JSON columns + computed net worth) ----

financialRouter.get('/net-worth', (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = db
    .prepare('SELECT * FROM net_worth_snapshots WHERE user_id = ? ORDER BY snapshot_date ASC')
    .all(userId) as Record<string, unknown>[];
  res.json(rows.map(rowToSnapshot));
});

financialRouter.post('/net-worth', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = netWorthSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid snapshot', details: parsed.error.flatten() });

  const id = newId();
  const netWorth = computeNetWorth(parsed.data.assets, parsed.data.liabilities);
  db.prepare(
    `INSERT INTO net_worth_snapshots (id, user_id, snapshot_date, assets, liabilities, net_worth)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    parsed.data.snapshotDate,
    JSON.stringify(parsed.data.assets),
    JSON.stringify(parsed.data.liabilities),
    netWorth,
  );
  const row = db.prepare('SELECT * FROM net_worth_snapshots WHERE id = ?').get(id) as Record<string, unknown>;
  res.status(201).json(rowToSnapshot(row));
});

financialRouter.delete('/net-worth/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const result = db
    .prepare('DELETE FROM net_worth_snapshots WHERE id = ? AND user_id = ?')
    .run(req.params.id as string, userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ---- AI financial Q&A (routes through the gateway; disclaimer on every response) ----

financialRouter.post('/ask', (req: Request, res: Response) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question) return res.status(400).json({ error: 'Ask a question.' });

  try {
    const result = complete({
      prompt: question,
      mode: 'finance',
      systemPrompt:
        'You provide general financial education only. Never give personalized financial, ' +
        'investment, tax, or legal advice. Always recommend consulting a licensed professional.',
    });
    res.json({ answer: result.text, model: result.model, disclaimer: AI_DISCLAIMER });
  } catch (err) {
    if (err instanceof TokenBudgetExceededError) {
      return res.status(429).json({ error: 'Monthly AI token budget reached. Upgrade your plan for more.' });
    }
    throw err;
  }
});
