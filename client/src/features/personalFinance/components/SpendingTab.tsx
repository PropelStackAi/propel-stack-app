// ─── Spending Tab ─────────────────────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC

import { useState } from 'react';
import { useFinanceTransactions, useCreateTransaction, useDeleteTransaction, useSpendSummary } from '../api';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transportation', 'Shopping', 'Entertainment',
  'Bills & Utilities', 'Health & Fitness', 'Travel', 'Education', 'Personal Care',
  'Home', 'Subscriptions', 'Gifts & Donations', 'Business', 'Other',
];

const CAT_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-orange-400', 'Groceries': 'bg-green-400',
  'Transportation': 'bg-blue-400', 'Shopping': 'bg-pink-400',
  'Entertainment': 'bg-purple-400', 'Bills & Utilities': 'bg-gray-400',
  'Health & Fitness': 'bg-red-400', 'Travel': 'bg-teal-400',
  'Education': 'bg-indigo-400', 'Other': 'bg-gray-300',
};

function getColor(cat: string): string {
  return CAT_COLORS[cat] ?? 'bg-gray-300';
}

export function SpendingTab(): JSX.Element {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: txData } = useFinanceTransactions({ start_date: monthStart });
  const { data: summary } = useSpendSummary(monthStart);
  const create = useCreateTransaction();
  const del = useDeleteTransaction();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [merchant, setMerchant] = useState('');
  const [txnDate, setTxnDate] = useState(now.toISOString().slice(0, 10));
  const [isIncome, setIsIncome] = useState(false);

  const transactions = txData?.transactions ?? [];
  const byCategory = summary?.by_category ?? [];
  const maxSpend = byCategory.length > 0 ? Number(byCategory[0].total) : 1;

  function submit() {
    if (!amount || !txnDate) return;
    const signed = isIncome ? Math.abs(Number(amount)) : -Math.abs(Number(amount));
    create.mutate({ amount: signed, category, merchant_name: merchant, txn_date: txnDate }, {
      onSuccess: () => { setShowForm(false); setAmount(''); setMerchant(''); },
    });
  }

  return (
    <div className="space-y-4">
      {/* Spend by Category chart */}
      {byCategory.length > 0 && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">This Month by Category</p>
            <p className="text-sm font-bold text-surface-ink">{fmt(summary?.total_spend ?? 0)}</p>
          </div>
          {byCategory.slice(0, 8).map((c) => (
            <div key={c.cat} className="flex items-center gap-2">
              <span className="text-xs text-surface-muted w-28 truncate flex-shrink-0">{c.cat}</span>
              <div className="flex-1 h-2 bg-surface-sunk rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getColor(c.cat)}`}
                  style={{ width: `${Math.min((Number(c.total) / maxSpend) * 100, 100)}%` }} />
              </div>
              <span className="text-xs font-semibold text-surface-ink w-16 text-right flex-shrink-0">{fmt(Number(c.total))}</span>
            </div>
          ))}
          {(summary?.total_income ?? 0) > 0 && (
            <div className="pt-1 border-t border-surface-ink/10 flex justify-between text-xs">
              <span className="text-surface-muted">Income this month</span>
              <span className="font-semibold text-green-600">+{fmt(summary?.total_income ?? 0)}</span>
            </div>
          )}
        </div>
      )}

      {/* Add transaction */}
      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Transactions ({transactions.length})</p>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold">
          + Add
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setIsIncome(false)}
              className={`px-3 py-1.5 rounded-xl font-semibold ${!isIncome ? 'bg-red-100 text-red-700' : 'bg-surface-sunk text-surface-muted'}`}>
              💸 Expense
            </button>
            <button type="button" onClick={() => setIsIncome(true)}
              className={`px-3 py-1.5 rounded-xl font-semibold ${isIncome ? 'bg-green-100 text-green-700' : 'bg-surface-sunk text-surface-muted'}`}>
              💵 Income
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Amount ($)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm col-span-2" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={txnDate} onChange={(e) => setTxnDate(e.target.value)} type="date"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Merchant / description"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm col-span-2" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-2xl">📊</p>
          <p className="text-sm text-surface-muted mt-2">No transactions this month yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {transactions.map((t) => {
            const isExpense = t.amount < 0;
            const cat = t.user_category || t.category;
            return (
              <div key={t.id} className="flex items-center gap-2 bg-surface-raised border border-surface-ink/10 rounded-xl px-3 py-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getColor(cat)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-surface-ink truncate">{t.merchant_name || cat}</p>
                  <p className="text-[10px] text-surface-muted">{cat} · {t.txn_date}</p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                  {isExpense ? '-' : '+'}{fmt(Math.abs(t.amount))}
                </span>
                <button type="button" onClick={() => del.mutate(t.id)} className="text-[10px] text-surface-muted hover:text-red-500 flex-shrink-0">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
