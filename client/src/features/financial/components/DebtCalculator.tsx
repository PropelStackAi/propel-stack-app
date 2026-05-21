import { useMemo, useState } from 'react';
import { money } from '../format';
import { EmptyHint, SectionTitle, inputCls } from './ui';

interface Debt {
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
}
type Strategy = 'snowball' | 'avalanche';
interface Result {
  months: number;
  totalInterest: number;
  paidOff: boolean;
}

function simulate(debts: Debt[], extra: number, strategy: Strategy): Result {
  const active = debts.map((d) => ({ ...d }));
  const totalBudget = active.reduce((s, d) => s + d.minPayment, 0) + extra;
  let months = 0;
  let totalInterest = 0;
  const MAX = 600;

  while (active.some((d) => d.balance > 0.005) && months < MAX) {
    months += 1;
    let budget = totalBudget;
    for (const d of active) {
      if (d.balance > 0) {
        const interest = d.balance * (d.apr / 1200);
        d.balance += interest;
        totalInterest += interest;
      }
    }
    for (const d of active) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance, budget);
      d.balance -= pay;
      budget -= pay;
    }
    let guard = 0;
    while (budget > 0.005 && active.some((d) => d.balance > 0.005) && guard < 100) {
      guard += 1;
      const target = active
        .filter((d) => d.balance > 0.005)
        .sort((a, b) => (strategy === 'snowball' ? a.balance - b.balance : b.apr - a.apr))[0];
      if (!target) break;
      const pay = Math.min(budget, target.balance);
      target.balance -= pay;
      budget -= pay;
    }
  }
  return { months, totalInterest, paidOff: !active.some((d) => d.balance > 0.005) };
}

export function DebtCalculator() {
  const [debts, setDebts] = useState<Debt[]>([{ name: 'Card A', balance: 5000, apr: 22, minPayment: 100 }]);
  const [extra, setExtra] = useState('200');

  const extraNum = Number(extra) || 0;
  const valid = debts.filter((d) => d.balance > 0 && d.minPayment > 0);
  const snowball = useMemo(() => (valid.length ? simulate(valid, extraNum, 'snowball') : null), [valid, extraNum]);
  const avalanche = useMemo(() => (valid.length ? simulate(valid, extraNum, 'avalanche') : null), [valid, extraNum]);

  function update(i: number, patch: Partial<Debt>) {
    setDebts(debts.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Debt payoff calculator" hint="Compare the snowball (lowest balance first) and avalanche (highest APR first) strategies. Informational only — not saved." />

      <div className="card">
        <div className="grid grid-cols-[1fr_7rem_5rem_7rem_auto] gap-2 text-[11px] uppercase tracking-wide text-surface-muted font-semibold mb-1 px-1">
          <span>Debt</span><span>Balance</span><span>APR %</span><span>Min/mo</span><span></span>
        </div>
        <div className="space-y-2">
          {debts.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_5rem_7rem_auto] gap-2 items-center">
              <input className={inputCls} value={d.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Name" />
              <input className={inputCls} type="number" min="0" value={d.balance || ''} onChange={(e) => update(i, { balance: Number(e.target.value) || 0 })} />
              <input className={inputCls} type="number" min="0" step="0.1" value={d.apr || ''} onChange={(e) => update(i, { apr: Number(e.target.value) || 0 })} />
              <input className={inputCls} type="number" min="0" value={d.minPayment || ''} onChange={(e) => update(i, { minPayment: Number(e.target.value) || 0 })} />
              <button type="button" aria-label="Remove" className="w-9 rounded-lg text-surface-muted hover:bg-surface-sunk" onClick={() => setDebts(debts.filter((_, idx) => idx !== i))}>×</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setDebts([...debts, { name: '', balance: 0, apr: 0, minPayment: 0 }])} className="text-xs font-semibold text-brand-indigo">+ Add debt</button>
          <label className="flex items-center gap-2 text-sm text-surface-muted ml-auto">
            Extra payment / mo
            <input className={`${inputCls} w-28`} type="number" min="0" value={extra} onChange={(e) => setExtra(e.target.value)} />
          </label>
        </div>
      </div>

      {valid.length === 0 ? (
        <EmptyHint>Add at least one debt with a balance and minimum payment.</EmptyHint>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StrategyCard title="Snowball" subtitle="Lowest balance first" result={snowball} highlight={snowball && avalanche ? snowball.totalInterest <= avalanche.totalInterest : false} />
          <StrategyCard title="Avalanche" subtitle="Highest APR first" result={avalanche} highlight={snowball && avalanche ? avalanche.totalInterest < snowball.totalInterest : false} />
        </div>
      )}
    </div>
  );
}

function StrategyCard({ title, subtitle, result, highlight }: { title: string; subtitle: string; result: Result | null; highlight: boolean }) {
  if (!result) return null;
  return (
    <div className={`card ${highlight ? 'ring-2 ring-brand-indigo/30' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base text-surface-ink">{title}</h3>
        {highlight && <span className="chip bg-brand-indigo/10 text-brand-indigo border-transparent">Less interest</span>}
      </div>
      <p className="text-xs text-surface-muted">{subtitle}</p>
      {result.paidOff ? (
        <div className="mt-3 space-y-1">
          <div className="font-display font-bold text-2xl text-surface-ink">{result.months} months</div>
          <div className="text-sm text-surface-muted">Total interest: {money(result.totalInterest, true)}</div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-red-600">Won't pay off within 50 years at this rate — increase payments.</p>
      )}
    </div>
  );
}
