// ─── Bills Tab ────────────────────────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC

import { useState } from 'react';
import { useFinanceBills, useCreateBill, useUpdateBill, useDeleteBill } from '../api';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function BillsTab(): JSX.Element {
  const { data } = useFinanceBills();
  const create = useCreateBill();
  const update = useUpdateBill();
  const del = useDeleteBill();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [autopay, setAutopay] = useState(false);
  const [category, setCategory] = useState('Bills & Utilities');

  const bills = data?.bills ?? [];
  const totalMonthly = bills.reduce((s, b) => s + b.amount, 0);
  const today = new Date().getDate();

  function submit() {
    if (!name || !amount) return;
    create.mutate({ name, amount: Number(amount), due_day: Number(dueDay), is_autopay: autopay ? 1 : 0, category }, {
      onSuccess: () => { setShowForm(false); setName(''); setAmount(''); },
    });
  }

  function markPaid(id: string) {
    update.mutate({ id, last_paid_date: new Date().toISOString().slice(0, 10) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {bills.length > 0 && (
          <p className="text-xs text-surface-muted">
            {bills.length} bills · <span className="font-semibold text-surface-ink">{fmt(totalMonthly)}/mo</span>
          </p>
        )}
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold ml-auto">
          + Add bill
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold">New Recurring Bill</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bill name (e.g. Netflix)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm col-span-2" />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Amount ($)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <select value={dueDay} onChange={(e) => setDueDay(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>Due {ordinal(d)} of month</option>
              ))}
            </select>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm px-1">
              <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} />
              Auto-pay enabled
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {bills.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-2xl">📅</p>
          <p className="text-sm text-surface-muted mt-2">No recurring bills tracked yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bills.sort((a, b) => a.due_day - b.due_day).map((bill) => {
            const isDue = bill.due_day <= today + 3 && bill.due_day >= today;
            const isPastDue = bill.due_day < today && !bill.last_paid_date?.startsWith(new Date().toISOString().slice(0, 7));
            return (
              <div key={bill.id} className={`rounded-xl border p-3 ${isPastDue ? 'bg-red-50 border-red-100' : isDue ? 'bg-orange-50 border-orange-100' : 'bg-surface-raised border-surface-ink/10'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-surface-ink">{bill.name}</p>
                      {bill.is_autopay ? (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Auto-pay</span>
                      ) : isDue ? (
                        <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">Due soon</span>
                      ) : isPastDue ? (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">Past due</span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-surface-muted">{bill.category} · Due {ordinal(bill.due_day)} each month</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-surface-ink">{fmt(bill.amount)}</p>
                    <p className="text-[10px] text-surface-muted">/mo</p>
                  </div>
                  <div className="flex gap-1">
                    {!bill.is_autopay && (
                      <button type="button" onClick={() => markPaid(bill.id)}
                        className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold hover:bg-green-200">
                        Paid
                      </button>
                    )}
                    <button type="button" onClick={() => del.mutate(bill.id)} className="text-xs text-surface-muted hover:text-red-500 px-1">✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
