// ─── Personal Finance Hub — Types ────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC

export type AccountType = 'checking' | 'savings' | 'credit' | 'loan' | 'manual' | 'investment';

export interface FinanceAccount {
  id: string;
  user_id: string;
  plaid_item_id: string;
  plaid_acct_id: string;
  account_type: AccountType;
  display_name: string;
  balance: number;
  balance_date: string;
  is_active: number;
  created_at: string;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  account_name?: string;
  plaid_txn_id: string;
  amount: number; // negative = expense, positive = income
  category: string;
  user_category: string;
  merchant_name: string;
  txn_date: string;
  is_recurring: number;
  notes: string;
  created_at: string;
}

export interface FinanceBudget {
  id: string;
  user_id: string;
  category: string;
  monthly_amt: number;
  spent: number; // joined from transactions
  created_at: string;
}

export interface FinanceBill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number;
  recurrence: string;
  is_autopay: number;
  is_active: number;
  category: string;
  last_paid_date: string;
  created_at: string;
}

export interface FinanceSavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  emoji: string;
  created_at: string;
}

export interface NetWorthItem {
  id: string;
  user_id: string;
  name: string;
  item_type: 'asset' | 'liability';
  amount: number;
  category: string;
  created_at: string;
}

export interface SpendSummary {
  start_date: string;
  end_date: string;
  by_category: Array<{ cat: string; total: number; count: number }>;
  total_spend: number;
  total_income: number;
}
