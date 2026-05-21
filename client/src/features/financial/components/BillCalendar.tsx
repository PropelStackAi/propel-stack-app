import { useState } from 'react';
import { billsApi } from '../api';
import { money, todayIso } from '../format';
import type { Recurrence } from '../types';
import { DeleteButton, EmptyHint, SectionTitle, inputCls } from './ui';

const blank = { name: '', amount: '', dueDate: todayIso(), recurrence: 'monthly' as Recurrence };

export function BillCalendar() {
  const list = billsApi.useList();
  const create = billsApi.useCreate();
  const update = billsApi.useUpdate();
  const remove = billsApi.useRemove();
  const [form, setForm] = useState(blank);

  const bills = list.data ?? [];
  const today = todayIso();
  const overdue = bills.filter((b) => !b.isPaid && b.dueDate < today);
  const unpaidTotal = bills.filter((b) => !b.isPaid).reduce((s, b) => s + b.amount, 0);

  function add() {
    if (!form.name.trim()) return;
    create.mutate(
      { name: form.name.trim(), amount: Number(form.amount) || 0, dueDate: form.dueDate, recurrence: form.recurrence, isPaid: false },
      { onSuccess: () => setForm({ ...blank, dueDate: form.dueDate }) },
    );
  }

  function togglePaid(b: (typeof bills)[number]) {
    update.mutate({
      id: b.id,
      input: { name: b.name, amount: b.amount, dueDate: b.dueDate, recurrence: b.recurrence, isPaid: !b.isPaid },
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Bill calendar" hint="Track upcoming bills and never miss a due date." />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label="Unpaid total" value={money(unpaidTotal)} />
        <Stat label="Overdue" value={String(overdue.length)} tone={overdue.length ? 'bad' : undefined} />
        <Stat label="Tracked" value={String(bills.length)} />
      </div>

      <div className="card">
        <h3 className="font-display font-bold text-sm text-surface-ink mb-3">Add bill</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <input className={inputCls} placeholder="Bill name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} type="number" min="0" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className={inputCls} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} aria-label="Due date" />
          <select className={inputCls} value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as Recurrence })} aria-label="Recurrence">
            <option value="none">One-time</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <button type="button" onClick={add} className="btn-primary !py-1.5 !text-xs">Add bill</button>
      </div>

      <div className="card">
        {bills.length === 0 ? (
          <EmptyHint>No bills yet.</EmptyHint>
        ) : (
          <ul className="divide-y divide-surface-ink/[0.06]">
            {bills.map((b) => {
              const isOverdue = !b.isPaid && b.dueDate < today;
              return (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex items-center gap-3">
                    <input type="checkbox" checked={b.isPaid} onChange={() => togglePaid(b)} aria-label={`Mark ${b.name} paid`} className="w-4 h-4 accent-brand-indigo" />
                    <div className="min-w-0">
                      <div className={`font-medium text-sm truncate ${b.isPaid ? 'line-through text-surface-muted' : 'text-surface-ink'}`}>{b.name}</div>
                      <div className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-surface-muted'}`}>
                        due {b.dueDate}{isOverdue ? ' · overdue' : ''}{b.recurrence !== 'none' ? ` · ${b.recurrence}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-surface-ink">{money(b.amount, true)}</span>
                    <DeleteButton onClick={() => remove.mutate(b.id)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'bad' }) {
  return (
    <div className="card">
      <div className="text-[11px] uppercase tracking-wider text-surface-muted font-semibold">{label}</div>
      <div className={`mt-1 font-display font-bold text-xl ${tone === 'bad' ? 'text-red-600' : 'text-surface-ink'}`}>{value}</div>
    </div>
  );
}
