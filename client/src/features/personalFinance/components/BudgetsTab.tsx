// ─── Budgets Tab ──────────────────────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC

import { useState } from 'react';
import { useFinanceBudgets, useSetBudget, useDeleteBudget } from '../api';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transportation', 'Shopping', 'Entertainment',
  'Bills & Utilities', 'Health & Fitness', 'Travel', 'Education', 'Personal Care',
  'Home', 'Subscriptions', 'Gifts & Donations', 'Business', 'Other',
];

export function BudgetsTab(): JSX.Element {
  const { data } = useFinanceBudgets();
  const setBudget = useSetBudget();
  const del = useDeleteBudget();

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('Food & Dining');
  const [amount, setAmount] = useState('');

  const budgets = data?.budgets ?? [];

  function submit() {
    if (!amount) return;
    setBudget.mutate({ category, monthly_amt: Number(amount) }, {
      onSuccess: () => { setShowForm(false); setAmount(''); },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-surface-muted">Set monthly spending limits by category. Alerts at 80% and 100%.</p>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold flex-shrink-0 ml-2">
          + Budget
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="10" placeholder="Monthly budget ($)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={setBudget.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {setBudget.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-2xl">📋</p>
          <p className="text-sm text-surface-muted mt-2">No budgets set yet.</p>
          <p className="text-xs text-surface-muted">Add a budget to track spending against your goals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const pct = b.monthly_amt > 0 ? Math.min((b.spent / b.monthly_amt) * 100, 100) : 0;
            const over = b.spent > b.monthly_amt;
            const warn = pct >= 80 && !over;
            const barColor = over ? 'bg-red-500' : warn ? 'bg-orange-400' : 'bg-brand-teal';

            return (
              <div key={b.id} className={`rounded-xl border p-3 ${over ? 'bg-red-50 border-red-100' : warn ? 'bg-orange-50 border-orange-100' : 'bg-surface-raised border-surface-ink/10'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-surface-ink">{b.category}</p>
                  <div className="flex items-center gap-2">
                    {over && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">OVER BUDGET</span>}
                    {warn && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">80%+</span>}
                    <button type="button" onClick={() => del.mutate(b.id)} className="text-[10px] text-surface-muted hover:text-red-500">✕</button>
                  </div>
                </div>
                <div className="w-full h-2 bg-surface-sunk rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-surface-muted">
                  <span className={over ? 'text-red-600 font-semibold' : ''}>{fmt(b.spent)} spent</span>
                  <span>{fmt(b.monthly_amt)} budget · {Math.round(pct)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
