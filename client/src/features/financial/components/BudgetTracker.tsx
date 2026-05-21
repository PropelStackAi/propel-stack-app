import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { budgetApi, txApi } from '../api';
import { money, todayIso } from '../format';
import type { CategoryType } from '../types';
import { DeleteButton, EmptyHint, SectionTitle, inputCls } from './ui';

export function BudgetTracker() {
  const categories = budgetApi.useList();
  const transactions = txApi.useList();
  const createCat = budgetApi.useCreate();
  const removeCat = budgetApi.useRemove();
  const createTx = txApi.useCreate();
  const removeTx = txApi.useRemove();

  const [cat, setCat] = useState({ name: '', type: 'expense' as CategoryType, monthlyBudget: '' });
  const [tx, setTx] = useState({ type: 'expense' as CategoryType, amount: '', categoryId: '', description: '', occurredAt: todayIso() });

  const cats = categories.data ?? [];
  const txs = transactions.data ?? [];
  const month = todayIso().slice(0, 7);
  const monthTxs = txs.filter((t) => t.occurredAt.startsWith(month));

  const actualByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTxs) {
      if (t.type !== 'expense' || !t.categoryId) continue;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    }
    return map;
  }, [monthTxs]);

  const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const chartData = cats
    .filter((c) => c.type === 'expense')
    .map((c) => ({ name: c.name, Budget: c.monthlyBudget, Actual: actualByCat.get(c.id) ?? 0 }));

  function addCategory() {
    if (!cat.name.trim()) return;
    createCat.mutate(
      { name: cat.name.trim(), type: cat.type, monthlyBudget: Number(cat.monthlyBudget) || 0 },
      { onSuccess: () => setCat({ name: '', type: 'expense', monthlyBudget: '' }) },
    );
  }
  function addTx() {
    const amt = Number(tx.amount);
    if (!amt || amt <= 0) return;
    createTx.mutate(
      {
        type: tx.type,
        amount: amt,
        categoryId: tx.categoryId || null,
        description: tx.description.trim(),
        occurredAt: tx.occurredAt,
      },
      { onSuccess: () => setTx({ ...tx, amount: '', description: '' }) },
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Budget tracker" hint="Set monthly budgets, log income and expenses, and compare against plan." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Income (this month)" value={money(income)} tone="good" />
        <Stat label="Expenses (this month)" value={money(expense)} tone="bad" />
        <Stat label="Net" value={money(income - expense)} tone={income - expense >= 0 ? 'good' : 'bad'} />
      </div>

      {chartData.length > 0 && (
        <div className="card">
          <h3 className="font-display font-bold text-sm text-surface-ink mb-3">Budget vs actual (expenses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A162510" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => money(Number(value), true)} />
              <Legend />
              <Bar dataKey="Budget" fill="#4F35C2" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill="#F05A28" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-display font-bold text-sm text-surface-ink mb-3">Categories</h3>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 mb-3">
            <input className={inputCls} placeholder="Category name" value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} />
            <select className={inputCls} value={cat.type} onChange={(e) => setCat({ ...cat, type: e.target.value as CategoryType })} aria-label="Category type">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input className={`${inputCls} w-28`} type="number" min="0" placeholder="Budget" value={cat.monthlyBudget} onChange={(e) => setCat({ ...cat, monthlyBudget: e.target.value })} />
          </div>
          <button type="button" onClick={addCategory} className="btn-secondary !py-1.5 !text-xs mb-3">Add category</button>
          <ul className="space-y-1.5">
            {cats.length === 0 && <EmptyHint>No categories yet.</EmptyHint>}
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">
                  <span className={`chip mr-2 ${c.type === 'income' ? 'text-emerald-700' : 'text-surface-muted'}`}>{c.type}</span>
                  {c.name}
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-surface-muted">{money(c.monthlyBudget)}/mo</span>
                  <DeleteButton onClick={() => removeCat.mutate(c.id)} />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3 className="font-display font-bold text-sm text-surface-ink mb-3">Log a transaction</h3>
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <select className={inputCls} value={tx.type} onChange={(e) => setTx({ ...tx, type: e.target.value as CategoryType })} aria-label="Transaction type">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <input className={inputCls} type="number" min="0" step="0.01" placeholder="Amount" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} />
            </div>
            <select className={inputCls} value={tx.categoryId} onChange={(e) => setTx({ ...tx, categoryId: e.target.value })} aria-label="Category">
              <option value="">Uncategorized</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} type="date" value={tx.occurredAt} onChange={(e) => setTx({ ...tx, occurredAt: e.target.value })} aria-label="Date" />
              <input className={inputCls} placeholder="Description" value={tx.description} onChange={(e) => setTx({ ...tx, description: e.target.value })} />
            </div>
          </div>
          <button type="button" onClick={addTx} className="btn-primary !py-1.5 !text-xs mb-3">Add transaction</button>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto">
            {txs.length === 0 && <EmptyHint>No transactions yet.</EmptyHint>}
            {txs.slice(0, 30).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-surface-muted">{t.occurredAt} · {t.description || '—'}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className={t.type === 'income' ? 'text-emerald-600' : 'text-surface-ink'}>
                    {t.type === 'income' ? '+' : '-'}{money(t.amount, true)}
                  </span>
                  <DeleteButton onClick={() => removeTx.mutate(t.id)} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' }) {
  return (
    <div className="card">
      <div className="text-[11px] uppercase tracking-wider text-surface-muted font-semibold">{label}</div>
      <div className={`mt-1 font-display font-bold text-2xl ${tone === 'good' ? 'text-emerald-600' : 'text-surface-ink'}`}>{value}</div>
    </div>
  );
}
