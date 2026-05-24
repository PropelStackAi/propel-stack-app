// ─── Business Expenses ────────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useState } from 'react';
import { useBusinessExpenses, useCreateExpense, useDeleteExpense, useBusinessProjects } from '../api';

const CATEGORIES = [
  'Software & Tools', 'Marketing', 'Travel', 'Equipment', 'Office', 'Contractors',
  'Professional Services', 'Subscriptions', 'Meals & Entertainment', 'Other',
];

export function ExpensesTab(): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [form, setForm] = useState({
    description: '', category: 'Other', amount: '', expense_date: new Date().toISOString().slice(0, 10),
    project_id: '', is_billable: false, receipt_note: '',
  });

  const { data: expData } = useBusinessExpenses();
  const { data: projData } = useBusinessProjects();
  const create = useCreateExpense();
  const del = useDeleteExpense();

  const expenses = expData?.expenses ?? [];
  const projects = projData?.projects ?? [];
  const filtered = filterCat === 'all' ? expenses : expenses.filter((e) => e.category === filterCat);
  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  function reset() {
    setForm({ description: '', category: 'Other', amount: '', expense_date: new Date().toISOString().slice(0, 10), project_id: '', is_billable: false, receipt_note: '' });
    setShowForm(false);
  }

  function submit() {
    if (!form.description.trim() || !form.expense_date) return;
    create.mutate({
      ...form, amount: Number(form.amount) || 0,
      project_id: form.project_id || undefined,
      is_billable: form.is_billable ? 1 : 0,
    } as Parameters<typeof create.mutate>[0], { onSuccess: reset });
  }

  // Used categories for filter chips
  const usedCats = [...new Set(expenses.map((e) => e.category))].sort();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-surface-muted">
            {filterCat === 'all' ? `${expenses.length} total` : filterCat} ·{' '}
            <span className="font-semibold text-surface-ink">{fmt(totalFiltered)}</span>
          </p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold flex-shrink-0">
          + Log expense
        </button>
      </div>

      {/* Category filter */}
      {usedCats.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button type="button" onClick={() => setFilterCat('all')}
            className={['flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold',
              filterCat === 'all' ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted',
            ].join(' ')}>
            All
          </button>
          {usedCats.map((c) => (
            <button key={c} type="button" onClick={() => setFilterCat(c)}
              className={['flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold',
                filterCat === c ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted',
              ].join(' ')}>
              {c}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold">Log expense</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description *"
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              type="number" min="0" step="0.01" placeholder="Amount ($)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <input type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <select value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="col-span-2 flex items-center gap-2 text-sm text-surface-muted cursor-pointer">
              <input type="checkbox" checked={form.is_billable} onChange={(e) => setForm((f) => ({ ...f, is_billable: e.target.checked }))}
                className="rounded" />
              Billable to client
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={reset} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              Save
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-surface-muted text-center py-8">
          {expenses.length === 0 ? 'No expenses logged yet.' : 'None in this category.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((e) => (
            <div key={e.id} className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-surface-ink truncate">{e.description}</p>
                  {e.is_billable === 1 && (
                    <span className="text-[10px] bg-brand-teal/10 text-brand-teal px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                      Billable
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-muted">
                  {e.category} · {e.expense_date}{e.project_name ? ` · ${e.project_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-surface-ink">{fmt(e.amount)}</span>
                <button type="button" onClick={() => del.mutate(e.id)} className="text-xs text-surface-muted hover:text-red-500">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
