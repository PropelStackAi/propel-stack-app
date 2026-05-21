import { useState } from 'react';
import { goalsApi } from '../api';
import { money } from '../format';
import { GOAL_KIND_LABELS, type Goal, type GoalKind } from '../types';
import { DeleteButton, EmptyHint, SectionTitle, inputCls } from './ui';

const blank = { name: '', kind: 'emergency_fund' as GoalKind, targetAmount: '', currentAmount: '', targetDate: '' };

export function GoalsTracker() {
  const list = goalsApi.useList();
  const create = goalsApi.useCreate();
  const update = goalsApi.useUpdate();
  const remove = goalsApi.useRemove();
  const [form, setForm] = useState(blank);

  const goals = list.data ?? [];

  function add() {
    if (!form.name.trim()) return;
    create.mutate(
      {
        name: form.name.trim(),
        kind: form.kind,
        targetAmount: Number(form.targetAmount) || 0,
        currentAmount: Number(form.currentAmount) || 0,
        targetDate: form.targetDate || null,
      },
      { onSuccess: () => setForm(blank) },
    );
  }

  function addFunds(goal: Goal, delta: number) {
    update.mutate({
      id: goal.id,
      input: {
        name: goal.name,
        kind: goal.kind,
        targetAmount: goal.targetAmount,
        currentAmount: Math.max(0, goal.currentAmount + delta),
        targetDate: goal.targetDate,
      },
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Financial goals" hint="Track milestones like an emergency fund, a home, or retirement." />

      <div className="card">
        <h3 className="font-display font-bold text-sm text-surface-ink mb-3">New goal</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          <input className={inputCls} placeholder="Goal name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as GoalKind })} aria-label="Goal type">
            {(Object.keys(GOAL_KIND_LABELS) as GoalKind[]).map((k) => <option key={k} value={k}>{GOAL_KIND_LABELS[k]}</option>)}
          </select>
          <input className={inputCls} type="number" min="0" placeholder="Target" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
          <input className={inputCls} type="number" min="0" placeholder="Saved" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
          <input className={inputCls} type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} aria-label="Target date" />
        </div>
        <button type="button" onClick={add} className="btn-primary !py-1.5 !text-xs">Add goal</button>
      </div>

      {goals.length === 0 ? (
        <EmptyHint>No goals yet.</EmptyHint>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            return (
              <div key={g.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-base text-surface-ink">{g.name}</h3>
                    <span className="chip text-surface-muted">{GOAL_KIND_LABELS[g.kind as GoalKind] ?? g.kind}</span>
                  </div>
                  <DeleteButton onClick={() => remove.mutate(g.id)} />
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface-sunk overflow-hidden">
                  <div className="h-full bg-brand-indigo" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-surface-ink font-medium">{money(g.currentAmount)} <span className="text-surface-muted">/ {money(g.targetAmount)}</span></span>
                  <span className="text-surface-muted">{pct.toFixed(0)}%{g.targetDate ? ` · by ${g.targetDate}` : ''}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => addFunds(g, 100)} className="btn-secondary !py-1 !px-3 !text-xs">+ $100</button>
                  <button type="button" onClick={() => addFunds(g, 500)} className="btn-secondary !py-1 !px-3 !text-xs">+ $500</button>
                  <button type="button" onClick={() => addFunds(g, -100)} className="btn-secondary !py-1 !px-3 !text-xs">− $100</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
