// ─── Utilities & Rental Tab ───────────────────────────────────────────────────
// Enhancement 21 — Propel Stack AI, LLC

import { useState } from 'react';
import {
  useUtilityBills, useUtilitySpikes, useCreateUtilityBill, useDeleteUtilityBill,
  useRentalLeases, useCreateLease, useLogRentPayment, useDeleteLease,
  useProperties,
} from '../api';

const UTILITY_TYPES = [
  { value: 'electric', label: 'Electric', emoji: '⚡' },
  { value: 'gas',      label: 'Gas',      emoji: '🔥' },
  { value: 'water',    label: 'Water',    emoji: '💧' },
  { value: 'internet', label: 'Internet', emoji: '📡' },
  { value: 'other',    label: 'Other',    emoji: '🏠' },
];

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function UtilitiesRentalTab() {
  const { data: propData }                        = useProperties();
  const { data: billData,  isLoading: billLoad }  = useUtilityBills();
  const { data: spikeData }                       = useUtilitySpikes();
  const { data: leaseData, isLoading: leaseLoad } = useRentalLeases();

  const createBill    = useCreateUtilityBill();
  const deleteBill    = useDeleteUtilityBill();
  const createLease   = useCreateLease();
  const logPayment    = useLogRentPayment();
  const deleteLease   = useDeleteLease();

  const [section, setSection]       = useState<'utilities' | 'rental'>('utilities');
  const [showBillForm, setShowBillForm] = useState(false);
  const [showLeaseForm, setShowLeaseForm] = useState(false);

  // Utility form
  const [utilType, setUtilType]     = useState('electric');
  const [billMonth, setBillMonth]   = useState(currentMonth());
  const [amount, setAmount]         = useState('');
  const [billPropId, setBillPropId] = useState('');

  // Lease form
  const [leasePropId, setLeasePropId]   = useState('');
  const [tenant, setTenant]             = useState('');
  const [leaseStart, setLeaseStart]     = useState('');
  const [leaseEnd, setLeaseEnd]         = useState('');
  const [rentAmount, setRentAmount]     = useState('');
  const [dueDay, setDueDay]             = useState('1');
  const [deposit, setDeposit]           = useState('');

  const bills      = billData?.bills ?? [];
  const spikes     = spikeData?.spikes ?? [];
  const leases     = leaseData?.leases ?? [];
  const properties = propData?.properties ?? [];

  // Group bills by utility type for display
  const utilTypes = Array.from(new Set(bills.map((b) => b.utility_type)));

  function submitBill() {
    if (!amount) return;
    createBill.mutate({ utility_type: utilType as import('../types').UtilityType, bill_month: billMonth, amount_cents: Math.round(Number(amount) * 100), property_id: billPropId || undefined }, {
      onSuccess: () => { setShowBillForm(false); setAmount(''); },
    });
  }

  function submitLease() {
    if (!tenant || !leasePropId || !rentAmount) return;
    createLease.mutate({ property_id: leasePropId, tenant_name: tenant, lease_start: leaseStart, lease_end: leaseEnd, rent_cents: Math.round(Number(rentAmount) * 100), due_day: Number(dueDay), security_deposit_cents: deposit ? Math.round(Number(deposit) * 100) : undefined }, {
      onSuccess: () => { setShowLeaseForm(false); setTenant(''); setLeaseStart(''); setLeaseEnd(''); setRentAmount(''); setDeposit(''); },
    });
  }

  return (
    <div className="space-y-3">
      {/* Section toggle */}
      <div className="flex gap-1">
        <button type="button" onClick={() => setSection('utilities')}
          className={`flex-1 text-xs px-3 py-1.5 rounded-xl font-semibold ${section === 'utilities' ? 'bg-brand-coral text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'}`}>
          ⚡ Utilities ({bills.length})
        </button>
        <button type="button" onClick={() => setSection('rental')}
          className={`flex-1 text-xs px-3 py-1.5 rounded-xl font-semibold ${section === 'rental' ? 'bg-brand-coral text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'}`}>
          🏢 Rental ({leases.length})
        </button>
      </div>

      {/* ── Utilities ── */}
      {section === 'utilities' && (
        <>
          {/* Spike alerts */}
          {spikes.length > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-orange-700">⚠️ Utility Spike Detected</p>
              {spikes.map((s) => {
                const meta = UTILITY_TYPES.find((u) => u.value === s.utility_type) ?? UTILITY_TYPES[4];
                return (
                  <p key={s.utility_type} className="text-xs text-orange-600">
                    {meta.emoji} {meta.label}: {fmt(s.amount_cents)} this month vs avg {fmt(s.avg_cents)} — {s.pct_over}% above average
                  </p>
                );
              })}
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={() => setShowBillForm(!showBillForm)}
              className="text-xs bg-brand-coral text-white px-3 py-1.5 rounded-xl font-semibold">
              + Add bill
            </button>
          </div>

          {showBillForm && (
            <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Add utility bill</p>
              <div className="flex gap-1 flex-wrap">
                {UTILITY_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setUtilType(t.value)}
                    className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${utilType === t.value ? 'bg-brand-coral text-white' : 'bg-surface-sunk text-surface-muted'}`}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-surface-muted uppercase tracking-wide">Month</label>
                  <input value={billMonth} onChange={(e) => setBillMonth(e.target.value)} type="month"
                    className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-surface-muted uppercase tracking-wide">Amount ($)</label>
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00"
                    className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                {properties.length > 0 && (
                  <select value={billPropId} onChange={(e) => setBillPropId(e.target.value)}
                    className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
                    <option value="">Property (optional)</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
                  </select>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowBillForm(false)} className="text-xs text-surface-muted">Cancel</button>
                <button type="button" onClick={submitBill} disabled={createBill.isPending}
                  className="text-xs bg-brand-coral text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
                  {createBill.isPending ? 'Saving…' : 'Add bill'}
                </button>
              </div>
            </div>
          )}

          {billLoad ? <p className="text-sm text-surface-muted text-center py-8">Loading…</p> : bills.length === 0 ? (
            <div className="text-center py-10"><p className="text-3xl">⚡</p><p className="text-sm text-surface-muted mt-2">No bills tracked yet.</p><p className="text-xs text-surface-muted">Spike alerts fire when a bill is 20%+ above your 3-month average.</p></div>
          ) : (
            <div className="space-y-3">
              {utilTypes.map((type) => {
                const meta = UTILITY_TYPES.find((u) => u.value === type) ?? UTILITY_TYPES[4];
                const typeBills = bills.filter((b) => b.utility_type === type).slice(0, 6);
                return (
                  <div key={type}>
                    <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-1">{meta.emoji} {meta.label}</p>
                    <div className="space-y-1">
                      {typeBills.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 bg-surface-raised border border-surface-ink/10 rounded-lg px-3 py-1.5 text-xs">
                          <span className="text-surface-muted">{b.bill_month}</span>
                          <span className="flex-1 font-semibold text-surface-ink">{fmt(b.amount_cents)}</span>
                          {b.property_name && <span className="text-surface-muted">{b.property_name}</span>}
                          <button type="button" onClick={() => deleteBill.mutate(b.id)} className="text-surface-muted hover:text-red-500">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Rental ── */}
      {section === 'rental' && (
        <>
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowLeaseForm(!showLeaseForm)}
              className="text-xs bg-brand-coral text-white px-3 py-1.5 rounded-xl font-semibold">
              + Add lease
            </button>
          </div>

          {showLeaseForm && (
            <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Add rental lease</p>
              <div className="grid grid-cols-2 gap-2">
                <select value={leasePropId} onChange={(e) => setLeasePropId(e.target.value)}
                  className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select rental property…</option>
                  {properties.filter((p) => p.type === 'rental').map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
                  {properties.filter((p) => p.type !== 'rental').map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
                </select>
                <input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="Tenant name"
                  className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-surface-muted uppercase tracking-wide">Lease start</label>
                  <input value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} type="date" className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-surface-muted uppercase tracking-wide">Lease end</label>
                  <input value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} type="date" className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <input value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} type="number" placeholder="Monthly rent ($)"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <input value={dueDay} onChange={(e) => setDueDay(e.target.value)} type="number" min="1" max="28" placeholder="Due day (1-28)"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <input value={deposit} onChange={(e) => setDeposit(e.target.value)} type="number" placeholder="Security deposit ($)"
                  className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowLeaseForm(false)} className="text-xs text-surface-muted">Cancel</button>
                <button type="button" onClick={submitLease} disabled={createLease.isPending}
                  className="text-xs bg-brand-coral text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
                  {createLease.isPending ? 'Adding…' : 'Add lease'}
                </button>
              </div>
            </div>
          )}

          {leaseLoad ? <p className="text-sm text-surface-muted text-center py-8">Loading…</p> : leases.length === 0 ? (
            <div className="text-center py-10"><p className="text-3xl">🏢</p><p className="text-sm text-surface-muted mt-2">No leases tracked yet.</p><p className="text-xs text-surface-muted">Track tenants, rent amounts, and payment history.</p></div>
          ) : (
            <div className="space-y-2">
              {leases.map((lease) => {
                const today = new Date().toISOString().split('T')[0];
                const leaseActive = lease.lease_start <= today && lease.lease_end >= today;
                return (
                  <div key={lease.id} className={`rounded-xl border p-3 space-y-2 ${leaseActive ? 'bg-green-50 border-green-100' : 'bg-surface-raised border-surface-ink/10'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">🏢</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-ink">{lease.tenant_name}</p>
                        <p className="text-xs text-surface-muted">
                          {lease.property_name ?? 'No property'} · {fmt(lease.rent_cents)}/mo · Due day {lease.due_day}
                        </p>
                        <p className="text-xs text-surface-muted">
                          {lease.lease_start} → {lease.lease_end}
                          {leaseActive ? ' · Active' : ' · Ended'}
                        </p>
                        {lease.last_payment_date && <p className="text-xs text-surface-muted">Last payment: {lease.last_payment_date}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button type="button" onClick={() => logPayment.mutate(lease.id)}
                          className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-semibold hover:bg-green-200">
                          Paid ✓
                        </button>
                        <button type="button" onClick={() => deleteLease.mutate(lease.id)}
                          className="text-xs text-surface-muted hover:text-red-500 px-1">✕</button>
                      </div>
                    </div>
                    {lease.security_deposit_cents && (
                      <p className="text-xs text-surface-muted pl-9">Deposit held: {fmt(lease.security_deposit_cents)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
