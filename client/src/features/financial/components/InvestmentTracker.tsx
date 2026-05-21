import { useState } from 'react';
import { investmentsApi } from '../api';
import { money } from '../format';
import { DeleteButton, EmptyHint, SectionTitle, inputCls } from './ui';

const blank = { name: '', symbol: '', shares: '', costBasis: '', currentValue: '' };

export function InvestmentTracker() {
  const list = investmentsApi.useList();
  const create = investmentsApi.useCreate();
  const remove = investmentsApi.useRemove();
  const [form, setForm] = useState(blank);

  const holdings = list.data ?? [];
  const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const gain = totalValue - totalCost;
  const ret = totalCost > 0 ? (gain / totalCost) * 100 : 0;

  function add() {
    if (!form.name.trim()) return;
    create.mutate(
      {
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        shares: Number(form.shares) || 0,
        costBasis: Number(form.costBasis) || 0,
        currentValue: Number(form.currentValue) || 0,
      },
      { onSuccess: () => setForm(blank) },
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Investment tracker" hint="Manually track holdings and returns. Informational only — not investment advice." />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Cost basis" value={money(totalCost)} />
        <Stat label="Current value" value={money(totalValue)} />
        <Stat label="Gain / loss" value={money(gain)} tone={gain >= 0 ? 'good' : 'bad'} />
        <Stat label="Return" value={`${ret.toFixed(1)}%`} tone={gain >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="card">
        <h3 className="font-display font-bold text-sm text-surface-ink mb-3">Add holding</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          <input className={inputCls} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          <input className={inputCls} type="number" min="0" step="0.0001" placeholder="Shares" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} />
          <input className={inputCls} type="number" min="0" step="0.01" placeholder="Cost basis" value={form.costBasis} onChange={(e) => setForm({ ...form, costBasis: e.target.value })} />
          <input className={inputCls} type="number" min="0" step="0.01" placeholder="Current value" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} />
        </div>
        <button type="button" onClick={add} className="btn-primary !py-1.5 !text-xs">Add holding</button>
      </div>

      <div className="card">
        {holdings.length === 0 ? (
          <EmptyHint>No holdings yet.</EmptyHint>
        ) : (
          <ul className="divide-y divide-surface-ink/[0.06]">
            {holdings.map((h) => {
              const g = h.currentValue - h.costBasis;
              const r = h.costBasis > 0 ? (g / h.costBasis) * 100 : 0;
              return (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-surface-ink truncate">
                      {h.name} {h.symbol && <span className="text-surface-muted">({h.symbol})</span>}
                    </div>
                    <div className="text-xs text-surface-muted">{h.shares} shares · cost {money(h.costBasis, true)}</div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <div className="text-sm text-surface-ink">{money(h.currentValue, true)}</div>
                      <div className={`text-xs ${g >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{g >= 0 ? '+' : ''}{money(g, true)} ({r.toFixed(1)}%)</div>
                    </div>
                    <DeleteButton onClick={() => remove.mutate(h.id)} />
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-surface-ink';
  return (
    <div className="card">
      <div className="text-[11px] uppercase tracking-wider text-surface-muted font-semibold">{label}</div>
      <div className={`mt-1 font-display font-bold text-xl ${color}`}>{value}</div>
    </div>
  );
}
