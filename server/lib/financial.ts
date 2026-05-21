import crypto from 'node:crypto';
import { z } from 'zod';

/**
 * Financial Hub domain helpers (Session 3).
 * Pure functions only -- routes own the synchronous sql.js calls.
 */

export const FINHUB_DISCLAIMER_VERSION = 'PSAI-FINHUB-DISC-v1.0';

export function newId(): string {
  return crypto.randomUUID();
}

const amount = z.number().finite();
const isoDate = z.string().trim().min(1).max(40);
const isoDateOrNull = z
  .string()
  .trim()
  .max(40)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

// ---- Disclaimer ----
export const ackInputSchema = z.object({
  signatureName: z.string().trim().min(1).max(120),
});
export type AckInput = z.infer<typeof ackInputSchema>;

// ---- Budget categories ----
export const budgetCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['income', 'expense']).default('expense'),
  monthlyBudget: amount.min(0).default(0),
});
export function rowToBudgetCategory(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as 'income' | 'expense',
    monthlyBudget: Number(r.monthly_budget),
    createdAt: r.created_at as string,
  };
}

// ---- Transactions ----
export const transactionSchema = z.object({
  categoryId: z.string().nullable().optional().transform((v) => v ?? null),
  type: z.enum(['income', 'expense']).default('expense'),
  amount: amount.min(0),
  description: z.string().trim().max(300).default(''),
  occurredAt: isoDate,
});
export function rowToTransaction(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    categoryId: (r.category_id as string | null) ?? null,
    type: r.type as 'income' | 'expense',
    amount: Number(r.amount),
    description: r.description as string,
    occurredAt: r.occurred_at as string,
    createdAt: r.created_at as string,
  };
}

// ---- Bills ----
export const billSchema = z.object({
  name: z.string().trim().min(1).max(160),
  amount: amount.min(0).default(0),
  dueDate: isoDate,
  recurrence: z.enum(['none', 'weekly', 'monthly', 'yearly']).default('none'),
  isPaid: z.boolean().default(false),
});
export function rowToBill(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    amount: Number(r.amount),
    dueDate: r.due_date as string,
    recurrence: r.recurrence as string,
    isPaid: Number(r.is_paid) === 1,
    createdAt: r.created_at as string,
  };
}

// ---- Financial goals ----
export const goalSchema = z.object({
  name: z.string().trim().min(1).max(160),
  kind: z.enum(['emergency_fund', 'home', 'retirement', 'custom']).default('custom'),
  targetAmount: amount.min(0).default(0),
  currentAmount: amount.min(0).default(0),
  targetDate: isoDateOrNull,
});
export function rowToGoal(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    kind: r.kind as string,
    targetAmount: Number(r.target_amount),
    currentAmount: Number(r.current_amount),
    targetDate: (r.target_date as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

// ---- Net worth snapshots ----
const amountItem = z.object({ label: z.string().trim().max(80).default(''), value: amount });
export type AmountItem = z.infer<typeof amountItem>;
export const netWorthSchema = z.object({
  snapshotDate: isoDate,
  assets: z.array(amountItem).max(50).default([]),
  liabilities: z.array(amountItem).max(50).default([]),
});
export function computeNetWorth(assets: AmountItem[], liabilities: AmountItem[]): number {
  const sum = (xs: AmountItem[]) => xs.reduce((t, x) => t + (Number.isFinite(x.value) ? x.value : 0), 0);
  return sum(assets) - sum(liabilities);
}
function safeParseArr(json: unknown): AmountItem[] {
  try {
    const v = JSON.parse(String(json));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function rowToSnapshot(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    snapshotDate: r.snapshot_date as string,
    assets: safeParseArr(r.assets),
    liabilities: safeParseArr(r.liabilities),
    netWorth: Number(r.net_worth),
    createdAt: r.created_at as string,
  };
}

// ---- Investments ----
export const investmentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  symbol: z.string().trim().max(20).default(''),
  shares: amount.min(0).default(0),
  costBasis: amount.min(0).default(0),
  currentValue: amount.min(0).default(0),
});
export function rowToInvestment(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    symbol: r.symbol as string,
    shares: Number(r.shares),
    costBasis: Number(r.cost_basis),
    currentValue: Number(r.current_value),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}
