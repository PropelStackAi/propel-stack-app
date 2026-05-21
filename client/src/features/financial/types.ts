// Financial Hub shared types (Session 3).

export interface DisclaimerStatus {
  version: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  signatureName: string | null;
}

export type CategoryType = 'income' | 'expense';

export interface BudgetCategory {
  id: string;
  name: string;
  type: CategoryType;
  monthlyBudget: number;
  createdAt: string;
}
export interface BudgetCategoryInput {
  name: string;
  type: CategoryType;
  monthlyBudget: number;
}

export interface Transaction {
  id: string;
  categoryId: string | null;
  type: CategoryType;
  amount: number;
  description: string;
  occurredAt: string;
  createdAt: string;
}
export interface TransactionInput {
  categoryId: string | null;
  type: CategoryType;
  amount: number;
  description: string;
  occurredAt: string;
}

export type Recurrence = 'none' | 'weekly' | 'monthly' | 'yearly';
export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  recurrence: Recurrence;
  isPaid: boolean;
  createdAt: string;
}
export interface BillInput {
  name: string;
  amount: number;
  dueDate: string;
  recurrence: Recurrence;
  isPaid: boolean;
}

export type GoalKind = 'emergency_fund' | 'home' | 'retirement' | 'custom';
export interface Goal {
  id: string;
  name: string;
  kind: GoalKind;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  createdAt: string;
}
export interface GoalInput {
  name: string;
  kind: GoalKind;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
}

export interface AmountItem {
  label: string;
  value: number;
}
export interface NetWorthSnapshot {
  id: string;
  snapshotDate: string;
  assets: AmountItem[];
  liabilities: AmountItem[];
  netWorth: number;
  createdAt: string;
}
export interface NetWorthInput {
  snapshotDate: string;
  assets: AmountItem[];
  liabilities: AmountItem[];
}

export interface Investment {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
}
export interface InvestmentInput {
  name: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currentValue: number;
}

export interface AskResponse {
  answer: string;
  model: string;
  disclaimer: string;
}

export const GOAL_KIND_LABELS: Record<GoalKind, string> = {
  emergency_fund: 'Emergency fund',
  home: 'Home purchase',
  retirement: 'Retirement',
  custom: 'Custom',
};
