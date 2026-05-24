// ─── Net Worth Tab ────────────────────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC

import { useState } from 'react';
import { useNetWorth, useCreateNetWorthItem, useUpdateNetWorthItem, useDeleteNetWorthItem } from '../api';
import type { NetWorthItem } from '../types';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const ASSET_CATS = ['Cash & Savings', 'Investments', 'Real Estate', 'Vehicle', 'Retirement', 'Business', 'Other'];
const LIABILITY_CATS = ['Mortgage', 'Car Loan', 'Student Loan', 'Credit Card Debt', 'Personal Loan', 'Other'];

export function NetWorthTab(): JSX.Element {
  const { data } = useNetWorth();
  const create = useCreateNetWorthItem();
  const update = useUpdateNetWorthItem();
  const del = useDeleteNetWorthItem();

  const [showForm, setShowForm] = useState(false);
  const [itemType, setItemType] = useState<'asset' | 'liability'>('asset');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Cash & Savings');
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const items = (data?.items ?? []) as NetWorthItem[];
  const assets = items.filter((i) => i.item_type === 'asset');
  const liabilities = items.filter((i) => i.item_type === 'liability');
  const netWorth = (data?.net_worth ?? 0);
  const totalAssets = data?.total_assets ?? 0;
  const totalLiabilities = data?.total_liabilities ?? 0;

  function submit() {
    if (!name || !amount) return;
    create.mutate({ name, item_type: itemType, amount: Number(amount), category }, {
      onSuccess: () => { setShowForm(false); setName(''); setAmount(''); },
    });
  }

  function saveEdit(id: string) {
    update.mutate({ id, amount: Number(editAmount) });
    setEditId(null);
  }

  return (
    <div className="space-y-4">
      {/* Net worth banner */}
      <div className={`rounded-xl px-4 py-4 text-center ${netWorth >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
        <p className="text-xs text-surface-muted uppercase tracking-wide mb-1">Total Net Worth</p>
        <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {netWorth >= 0 ? '' : '-'}{fmt(Math.abs(netWorth))}
        </p>
        <div className="flex justify-center gap-6 mt-2 text-xs text-surface-muted">
          <span>Assets <strong className="text-green-700">{fmt(totalAssets)}</strong></span>
          <span>Liabilities <strong className="text-red-600">{fmt(totalLiabilities)}</strong></span>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold">
          + Add item
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => { setItemType('asset'); setCategory('Cash & Savings'); }}
              className={`px-3 py-1.5 rounded-xl font-semibold ${itemType === 'asset' ? 'bg-green-100 text-green-700' : 'bg-surface-sunk text-surface-muted'}`}>
              📈 Asset
            </button>
            <button type="button" onClick={() => { setItemType('liability'); setCategory('Mortgage'); }}
              className={`px-3 py-1.5 rounded-xl font-semibold ${itemType === 'liability' ? 'bg-red-100 text-red-700' : 'bg-surface-sunk text-surface-muted'}`}>
              📉 Liability
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Emergency Fund)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm col-span-2" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              {(itemType === 'asset' ? ASSET_CATS : LIABILITY_CATS).map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="100" placeholder="Amount ($)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Assets */}
      {assets.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">Assets</p>
          <div className="space-y-1.5">
            {assets.map((item) => (
              <div key={item.id} className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-ink">{item.name}</p>
                  <p className="text-[10px] text-surface-muted">{item.category}</p>
                </div>
                {editId === item.id ? (
                  <div className="flex gap-1">
                    <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} type="number"
                      className="w-24 border border-surface-ink/10 rounded px-2 py-0.5 text-xs" />
                    <button type="button" onClick={() => saveEdit(item.id)} className="text-xs text-brand-teal font-semibold">✓</button>
                    <button type="button" onClick={() => setEditId(null)} className="text-xs text-surface-muted">✕</button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-green-700">{fmt(item.amount)}</span>
                    <button type="button" onClick={() => { setEditId(item.id); setEditAmount(String(item.amount)); }} className="text-[10px] text-surface-muted hover:text-surface-ink">✎</button>
                    <button type="button" onClick={() => del.mutate(item.id)} className="text-[10px] text-surface-muted hover:text-red-500">✕</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liabilities */}
      {liabilities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">Liabilities</p>
          <div className="space-y-1.5">
            {liabilities.map((item) => (
              <div key={item.id} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-ink">{item.name}</p>
                  <p className="text-[10px] text-surface-muted">{item.category}</p>
                </div>
                {editId === item.id ? (
                  <div className="flex gap-1">
                    <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} type="number"
                      className="w-24 border border-surface-ink/10 rounded px-2 py-0.5 text-xs" />
                    <button type="button" onClick={() => saveEdit(item.id)} className="text-xs text-brand-teal font-semibold">✓</button>
                    <button type="button" onClick={() => setEditId(null)} className="text-xs text-surface-muted">✕</button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-red-600">-{fmt(item.amount)}</span>
                    <button type="button" onClick={() => { setEditId(item.id); setEditAmount(String(item.amount)); }} className="text-[10px] text-surface-muted hover:text-surface-ink">✎</button>
                    <button type="button" onClick={() => del.mutate(item.id)} className="text-[10px] text-surface-muted hover:text-red-500">✕</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-10">
          <p className="text-2xl">🏦</p>
          <p className="text-sm text-surface-muted mt-2">No items yet.</p>
          <p className="text-xs text-surface-muted">Add assets and liabilities to calculate your net worth.</p>
        </div>
      )}
    </div>
  );
}
