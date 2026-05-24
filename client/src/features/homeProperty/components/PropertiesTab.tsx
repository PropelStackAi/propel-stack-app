// ─── Properties Tab ───────────────────────────────────────────────────────────
// Enhancement 21 — Propel Stack AI, LLC

import { useState } from 'react';
import { useProperties, useCreateProperty, useDeleteProperty } from '../api';
import type { Property } from '../types';

const TYPE_META: Record<string, { emoji: string; label: string }> = {
  primary:  { emoji: '🏠', label: 'Primary Home' },
  rental:   { emoji: '🏢', label: 'Rental Property' },
  vacation: { emoji: '🏖️', label: 'Vacation Home' },
};

function fmt(cents?: number) {
  if (!cents) return '—';
  return `$${(cents / 100).toLocaleString()}`;
}

function PropertyCard({ p }: { p: Property }) {
  const del = useDeleteProperty();
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[p.type] ?? { emoji: '🏠', label: p.type };

  return (
    <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-ink">{p.nickname}</p>
          <p className="text-xs text-surface-muted">{meta.label} {p.address ? `· ${p.address}` : ''}</p>
          {p.estimated_value && (
            <p className="text-xs text-surface-muted">Est. value: {fmt(p.estimated_value * 100)}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="text-xs text-surface-muted hover:text-surface-ink px-1">{expanded ? '▲' : '▼'}</button>
          <button type="button" onClick={() => del.mutate(p.id)}
            className="text-xs text-surface-muted hover:text-red-500 px-1">✕</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-surface-ink/10 pt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-surface-muted">
          {p.purchase_date   && <span>📅 Purchased: {p.purchase_date}</span>}
          {p.mortgage_amount && <span>🏦 Mortgage: {fmt(p.mortgage_amount * 100)}</span>}
          {p.mortgage_rate   && <span>📊 Rate: {p.mortgage_rate}%</span>}
          {p.rent_amount     && <span>💵 Rent: {fmt(p.rent_amount * 100)}/mo</span>}
          {p.zillow_url && (
            <span className="col-span-2 truncate text-brand-indigo">{p.zillow_url}</span>
          )}
          {p.notes && <p className="col-span-2 italic">{p.notes}</p>}
        </div>
      )}
    </div>
  );
}

export function PropertiesTab() {
  const { data, isLoading } = useProperties();
  const create = useCreateProperty();

  const [showForm, setShowForm]   = useState(false);
  const [nickname, setNickname]   = useState('');
  const [type, setType]           = useState<'primary' | 'rental' | 'vacation'>('primary');
  const [address, setAddress]     = useState('');
  const [value, setValue]         = useState('');
  const [mortgage, setMortgage]   = useState('');
  const [rate, setRate]           = useState('');
  const [rent, setRent]           = useState('');
  const [zillow, setZillow]       = useState('');
  const [notes, setNotes]         = useState('');

  const properties = data?.properties ?? [];

  function submit() {
    if (!nickname) return;
    create.mutate({
      nickname, type, address,
      estimated_value: value ? Math.round(Number(value)) : undefined,
      mortgage_amount: mortgage ? Math.round(Number(mortgage)) : undefined,
      mortgage_rate: rate ? Number(rate) : undefined,
      rent_amount: rent ? Math.round(Number(rent)) : undefined,
      zillow_url: zillow,
      notes,
    }, {
      onSuccess: () => { setShowForm(false); setNickname(''); setAddress(''); setValue(''); setMortgage(''); setRate(''); setRent(''); setZillow(''); setNotes(''); },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-indigo text-white px-3 py-1.5 rounded-xl font-semibold">
          + Add property
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add a property</p>
          <div className="flex gap-1">
            {(['primary', 'rental', 'vacation'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 text-xs px-2 py-1.5 rounded-xl font-semibold capitalize ${type === t ? 'bg-brand-indigo text-white' : 'bg-surface-sunk text-surface-muted'}`}>
                {TYPE_META[t].emoji} {TYPE_META[t].label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder='Nickname (e.g. "Main House")'
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)"
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Est. value ($)</label>
              <input value={value} onChange={(e) => setValue(e.target.value)} type="number" placeholder="450000"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Mortgage balance ($)</label>
              <input value={mortgage} onChange={(e) => setMortgage(e.target.value)} type="number" placeholder="320000"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Rate (%)</label>
              <input value={rate} onChange={(e) => setRate(e.target.value)} type="number" step="0.01" placeholder="6.5"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            {type === 'rental' && (
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-surface-muted uppercase tracking-wide">Monthly rent ($)</label>
                <input value={rent} onChange={(e) => setRent(e.target.value)} type="number" placeholder="2000"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
            <input value={zillow} onChange={(e) => setZillow(e.target.value)} placeholder="Zillow/Redfin URL (optional)"
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
              className="col-span-2 resize-none border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-indigo text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Adding…' : 'Add property'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-surface-muted text-center py-8">Loading…</p>
      ) : properties.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl">🏠</p>
          <p className="text-sm text-surface-muted mt-2">No properties added yet.</p>
          <p className="text-xs text-surface-muted">Add your home, rental, or vacation property.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {properties.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
