import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { netWorthApi } from '../api';
import { money, todayIso } from '../format';
import type { AmountItem } from '../types';
import { DeleteButton, EmptyHint, SectionTitle, inputCls } from './ui';

const sum = (xs: AmountItem[]) => xs.reduce((t, x) => t + (Number(x.value) || 0), 0);

export function NetWorthTracker() {
  const snapshots = netWorthApi.useList();
  const create = netWorthApi.useCreate();
  const remove = netWorthApi.useRemove();

  const [date, setDate] = useState(todayIso());
  const [assets, setAssets] = useState<AmountItem[]>([{ label: 'Cash', value: 0 }]);
  const [liabilities, setLiabilities] = useState<AmountItem[]>([{ label: 'Credit cards', value: 0 }]);

  const list = snapshots.data ?? [];
  const preview = sum(assets) - sum(liabilities);
  const chartData = list.map((s) => ({ date: s.snapshotDate, netWorth: s.netWorth }));

  function save() {
    create.mutate(
      {
        snapshotDate: date,
        assets: assets.filter((a) => a.label.trim() || a.value),
        liabilities: liabilities.filter((l) => l.label.trim() || l.value),
      },
      {
        onSuccess: () => {
          setAssets([{ label: 'Cash', value: 0 }]);
          setLiabilities([{ label: 'Credit cards', value: 0 }]);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Net worth tracker" hint="Record assets and liabilities over time and watch your net worth trend." />

      {chartData.length > 0 && (
        <div className="card">
          <h3 className="font-display font-bold text-sm text-surface-ink mb-3">Net worth over time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A162510" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => money(Number(value), true)} />
              <Line type="monotone" dataKey="netWorth" stroke="#4F35C2" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h3 className="font-display font-bold text-sm text-surface-ink mb-3">New snapshot</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AmountList title="Assets" items={assets} onChange={setAssets} />
          <AmountList title="Liabilities" items={liabilities} onChange={setLiabilities} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input className={`${inputCls} w-44`} type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Snapshot date" />
            <span className="text-sm text-surface-muted">
              Net worth: <span className={`font-display font-bold ${preview >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(preview, true)}</span>
            </span>
          </div>
          <button type="button" onClick={save} disabled={create.isPending} className="btn-primary !py-1.5 !text-xs disabled:opacity-60">
            {create.isPending ? 'Saving…' : 'Save snapshot'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-bold text-sm text-surface-ink mb-3">History</h3>
        {list.length === 0 ? (
          <EmptyHint>No snapshots yet.</EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {[...list].reverse().map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-surface-muted">{s.snapshotDate}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className={`font-medium ${s.netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(s.netWorth, true)}</span>
                  <DeleteButton onClick={() => remove.mutate(s.id)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AmountList({ title, items, onChange }: { title: string; items: AmountItem[]; onChange: (items: AmountItem[]) => void }) {
  function update(i: number, patch: Partial<AmountItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-surface-muted mb-2">{title}</div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input className={inputCls} placeholder="Label" value={it.label} onChange={(e) => update(i, { label: e.target.value })} />
            <input className={`${inputCls} w-32`} type="number" step="0.01" placeholder="0" value={it.value || ''} onChange={(e) => update(i, { value: Number(e.target.value) || 0 })} />
            <button type="button" aria-label="Remove" className="shrink-0 w-9 rounded-lg text-surface-muted hover:bg-surface-sunk" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...items, { label: '', value: 0 }])} className="mt-2 text-xs font-semibold text-brand-indigo">
        + Add {title.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  );
}
