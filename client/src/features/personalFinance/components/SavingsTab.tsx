// ─── Savings Goals Tab ────────────────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC

import { useState } from 'react';
import { useSavingsGoals, useCreateSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal } from '../api';
import type { FinanceSavingsGoal } from '../types';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const EMOJIS = ['💰', '🏠', '✈️', '🎓', '🚗', '💍', '🌴', '📱', '🏋️', '🎯'];

function GoalCard({ goal, onUpdate, onDelete }: {
  goal: FinanceSavingsGoal;
  onUpdate: (d: Partial<FinanceSavingsGoal> & { id: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [addingFunds, setAddingFunds] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
  const remaining = goal.target_amount - goal.current_amount;
  const complete = pct >= 100;

  function save() {
    const newAmount = goal.current_amount + Number(addAmount);
    onUpdate({ id: goal.id, current_amount: newAmount });
    setAddingFunds(false);
    setAddAmount('');
  }

  function daysLeft(): string {
    if (!goal.target_date) return '';
    const diff = new Date(goal.target_date).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Past target date';
    if (days === 0) return 'Target date: today';
    return `${days} days left`;
  }

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${complete ? 'bg-green-50 border-green-100' : 'bg-surface-raised border-surface-ink/10'}`}>
      <div className="flex items-start gap-2">
        <span className="text-2xl">{goal.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-ink">{goal.name}</p>
          <p className="text-xs text-surface-muted">{daysLeft()}</p>
        </div>
        {complete && <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">🎉 Complete!</span>}
        <button type="button" onClick={() => onDelete(goal.id)} className="text-[10px] text-surface-muted hover:text-red-500">✕</button>
      </div>

      <div className="w-full h-2.5 bg-surface-sunk rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${complete ? 'bg-green-400' : 'bg-brand-teal'}`}
          style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-surface-muted">{fmt(goal.current_amount)} saved</span>
        <span className="font-semibold text-surface-ink">{fmt(goal.target_amount)} goal · {Math.round(pct)}%</span>
      </div>

      {!complete && (
        <p className="text-xs text-surface-muted">{fmt(remaining)} remaining</p>
      )}

      {addingFunds ? (
        <div className="flex gap-2">
          <input value={addAmount} onChange={(e) => setAddAmount(e.target.value)} type="number" min="0" step="10" placeholder="Amount to add ($)"
            className="flex-1 border border-surface-ink/10 rounded-lg px-2 py-1.5 text-xs" />
          <button type="button" onClick={save} className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-lg font-semibold">Add</button>
          <button type="button" onClick={() => setAddingFunds(false)} className="text-xs text-surface-muted">✕</button>
        </div>
      ) : (
        !complete && (
          <button type="button" onClick={() => setAddingFunds(true)}
            className="text-xs text-brand-teal font-semibold hover:underline">
            + Add funds
          </button>
        )
      )}
    </div>
  );
}

export function SavingsTab(): JSX.Element {
  const { data } = useSavingsGoals();
  const create = useCreateSavingsGoal();
  const update = useUpdateSavingsGoal();
  const del = useDeleteSavingsGoal();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [emoji, setEmoji] = useState('💰');

  const goals = data?.goals ?? [];

  function submit() {
    if (!name || !target) return;
    create.mutate({ name, target_amount: Number(target), current_amount: Number(current), target_date: targetDate, emoji }, {
      onSuccess: () => { setShowForm(false); setName(''); setTarget(''); setCurrent('0'); setTargetDate(''); },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-surface-muted">Track your savings goals and watch them grow.</p>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold">
          + New goal
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">New Savings Goal</p>
          <div className="flex gap-1 flex-wrap">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setEmoji(e)}
                className={`text-lg w-9 h-9 rounded-lg ${emoji === e ? 'bg-brand-teal/10 ring-2 ring-brand-teal' : 'bg-surface-sunk'}`}>
                {e}
              </button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goal name (e.g. Emergency Fund)"
            className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" min="0" step="100" placeholder="Target amount ($)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={current} onChange={(e) => setCurrent(e.target.value)} type="number" min="0" step="10" placeholder="Already saved ($)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={targetDate} onChange={(e) => setTargetDate(e.target.value)} type="date" placeholder="Target date (optional)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm col-span-2" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Saving…' : 'Create goal'}
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-2xl">💰</p>
          <p className="text-sm text-surface-muted mt-2">No savings goals yet.</p>
          <p className="text-xs text-surface-muted">Create a goal to start tracking your progress.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g}
              onUpdate={(d) => update.mutate(d)}
              onDelete={(id) => del.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
