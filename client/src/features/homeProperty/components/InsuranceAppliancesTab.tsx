// ─── Insurance & Appliances Tab ───────────────────────────────────────────────
// Enhancement 21 — Propel Stack AI, LLC

import { useState } from 'react';
import {
  useInsurance, useCreateInsurance, useDeleteInsurance,
  useAppliances, useCreateAppliance, useDeleteAppliance,
  useProperties,
} from '../api';
import type { InsuranceType } from '../types';

const POLICY_TYPES: { value: InsuranceType; label: string; emoji: string }[] = [
  { value: 'home',     label: 'Home',     emoji: '🏠' },
  { value: 'auto',     label: 'Auto',     emoji: '🚗' },
  { value: 'umbrella', label: 'Umbrella', emoji: '☂️' },
  { value: 'life',     label: 'Life',     emoji: '💚' },
  { value: 'renter',   label: 'Renter',   emoji: '🏢' },
  { value: 'other',    label: 'Other',    emoji: '📋' },
];

function warrantyDaysLeft(expiry?: string): number | null {
  if (!expiry) return null;
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
}

export function InsuranceAppliancesTab() {
  const { data: insData,  isLoading: insLoading }  = useInsurance();
  const { data: appData,  isLoading: appLoading }  = useAppliances();
  const { data: propData }                          = useProperties();

  const createIns  = useCreateInsurance();
  const deleteIns  = useDeleteInsurance();
  const createApp  = useCreateAppliance();
  const deleteApp  = useDeleteAppliance();

  const [section, setSection]     = useState<'insurance' | 'appliances'>('insurance');
  const [showInsForm, setShowInsForm] = useState(false);
  const [showAppForm, setShowAppForm] = useState(false);

  // Insurance form state
  const [polType, setPolType]     = useState<InsuranceType>('home');
  const [carrier, setCarrier]     = useState('');
  const [polNum, setPolNum]       = useState('');
  const [agent, setAgent]         = useState('');
  const [agentContact, setAgentContact] = useState('');
  const [premium, setPremium]     = useState('');
  const [renewal, setRenewal]     = useState('');

  // Appliance form state
  const [appName, setAppName]     = useState('');
  const [brand, setBrand]         = useState('');
  const [appModel, setAppModel]   = useState('');
  const [serial, setSerial]       = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyExp, setWarrantyExp]   = useState('');
  const [appPropId, setAppPropId] = useState('');

  const policies   = insData?.policies ?? [];
  const appliances = appData?.appliances ?? [];
  const properties = propData?.properties ?? [];

  function submitIns() {
    if (!carrier) return;
    createIns.mutate({ policy_type: polType, carrier, policy_number: polNum, agent_name: agent, agent_contact: agentContact, premium_cents: premium ? Math.round(Number(premium) * 100) : undefined, renewal_date: renewal || undefined }, {
      onSuccess: () => { setShowInsForm(false); setCarrier(''); setPolNum(''); setAgent(''); setAgentContact(''); setPremium(''); setRenewal(''); },
    });
  }

  function submitApp() {
    if (!appName) return;
    createApp.mutate({ name: appName, brand, model: appModel, serial_number: serial, purchase_date: purchaseDate || undefined, warranty_expiry: warrantyExp || undefined, property_id: appPropId || undefined }, {
      onSuccess: () => { setShowAppForm(false); setAppName(''); setBrand(''); setAppModel(''); setSerial(''); setPurchaseDate(''); setWarrantyExp(''); },
    });
  }

  return (
    <div className="space-y-3">
      {/* Section toggle */}
      <div className="flex gap-1">
        <button type="button" onClick={() => setSection('insurance')}
          className={`flex-1 text-xs px-3 py-1.5 rounded-xl font-semibold ${section === 'insurance' ? 'bg-brand-purple text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'}`}>
          🛡️ Insurance ({policies.length})
        </button>
        <button type="button" onClick={() => setSection('appliances')}
          className={`flex-1 text-xs px-3 py-1.5 rounded-xl font-semibold ${section === 'appliances' ? 'bg-brand-purple text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'}`}>
          🏷️ Warranties ({appliances.length})
        </button>
      </div>

      {/* ── Insurance ── */}
      {section === 'insurance' && (
        <>
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowInsForm(!showInsForm)}
              className="text-xs bg-brand-purple text-white px-3 py-1.5 rounded-xl font-semibold">
              + Add policy
            </button>
          </div>

          {showInsForm && (
            <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Add insurance policy</p>
              <div className="flex gap-1 flex-wrap">
                {POLICY_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setPolType(t.value)}
                    className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${polType === t.value ? 'bg-brand-purple text-white' : 'bg-surface-sunk text-surface-muted'}`}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier (State Farm)"
                  className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <input value={polNum} onChange={(e) => setPolNum(e.target.value)} placeholder="Policy number"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <input value={premium} onChange={(e) => setPremium(e.target.value)} type="number" placeholder="Annual premium ($)"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <input value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="Agent name"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <input value={agentContact} onChange={(e) => setAgentContact(e.target.value)} placeholder="Agent phone/email"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <div className="col-span-2 flex flex-col gap-0.5">
                  <label className="text-[10px] text-surface-muted uppercase tracking-wide">Renewal date</label>
                  <input value={renewal} onChange={(e) => setRenewal(e.target.value)} type="date"
                    className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowInsForm(false)} className="text-xs text-surface-muted">Cancel</button>
                <button type="button" onClick={submitIns} disabled={createIns.isPending}
                  className="text-xs bg-brand-purple text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
                  {createIns.isPending ? 'Adding…' : 'Add policy'}
                </button>
              </div>
            </div>
          )}

          {insLoading ? <p className="text-sm text-surface-muted text-center py-8">Loading…</p> : policies.length === 0 ? (
            <div className="text-center py-10"><p className="text-3xl">🛡️</p><p className="text-sm text-surface-muted mt-2">No insurance policies added yet.</p></div>
          ) : (
            <div className="space-y-2">
              {policies.map((p) => {
                const meta = POLICY_TYPES.find((t) => t.value === p.policy_type) ?? POLICY_TYPES[5];
                return (
                  <div key={p.id} className={`rounded-xl border p-3 ${p.renewal_soon ? 'bg-orange-50 border-orange-100' : 'bg-surface-raised border-surface-ink/10'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-ink">{p.carrier} <span className="text-xs font-normal text-surface-muted capitalize">· {meta.label}</span></p>
                        {p.policy_number && <p className="text-xs text-surface-muted">Policy: {p.policy_number}</p>}
                        <div className="flex gap-3 text-xs text-surface-muted mt-0.5 flex-wrap">
                          {p.agent_name && <span>Agent: {p.agent_name}</span>}
                          {p.premium_cents && <span>Premium: ${(p.premium_cents / 100).toLocaleString()}/yr</span>}
                          {p.renewal_date && <span className={p.renewal_soon ? 'font-semibold text-orange-600' : ''}>Renews: {p.renewal_date}{p.renewal_soon ? ' ⚠️' : ''}</span>}
                        </div>
                      </div>
                      <button type="button" onClick={() => deleteIns.mutate(p.id)} className="text-xs text-surface-muted hover:text-red-500 px-1 flex-shrink-0">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Appliances & Warranties ── */}
      {section === 'appliances' && (
        <>
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowAppForm(!showAppForm)}
              className="text-xs bg-brand-purple text-white px-3 py-1.5 rounded-xl font-semibold">
              + Add appliance
            </button>
          </div>

          {showAppForm && (
            <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Add appliance / warranty</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Appliance name (Refrigerator)"
                  className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <input value={appModel} onChange={(e) => setAppModel(e.target.value)} placeholder="Model"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Serial number"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                <select value={appPropId} onChange={(e) => setAppPropId(e.target.value)}
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
                  <option value="">Property (optional)</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
                </select>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-surface-muted uppercase tracking-wide">Purchase date</label>
                  <input value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} type="date"
                    className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-surface-muted uppercase tracking-wide">Warranty expires</label>
                  <input value={warrantyExp} onChange={(e) => setWarrantyExp(e.target.value)} type="date"
                    className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAppForm(false)} className="text-xs text-surface-muted">Cancel</button>
                <button type="button" onClick={submitApp} disabled={createApp.isPending}
                  className="text-xs bg-brand-purple text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
                  {createApp.isPending ? 'Adding…' : 'Add appliance'}
                </button>
              </div>
            </div>
          )}

          {appLoading ? <p className="text-sm text-surface-muted text-center py-8">Loading…</p> : appliances.length === 0 ? (
            <div className="text-center py-10"><p className="text-3xl">🏷️</p><p className="text-sm text-surface-muted mt-2">No appliances tracked yet.</p><p className="text-xs text-surface-muted">You'll get alerts 30 days before warranties expire.</p></div>
          ) : (
            <div className="space-y-2">
              {appliances.map((a) => {
                const daysLeft = warrantyDaysLeft(a.warranty_expiry);
                const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                const expired = daysLeft !== null && daysLeft < 0;
                return (
                  <div key={a.id} className={`rounded-xl border p-3 ${expiringSoon ? 'bg-orange-50 border-orange-100' : expired ? 'bg-red-50 border-red-100' : 'bg-surface-raised border-surface-ink/10'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">🏷️</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-ink">{a.name}</p>
                        <p className="text-xs text-surface-muted">
                          {[a.brand, a.model].filter(Boolean).join(' ')}
                          {a.serial_number ? ` · S/N: ${a.serial_number}` : ''}
                          {a.property_name ? ` · ${a.property_name}` : ''}
                        </p>
                        {a.warranty_expiry && (
                          <p className={`text-xs font-semibold mt-0.5 ${expired ? 'text-red-600' : expiringSoon ? 'text-orange-600' : 'text-surface-muted'}`}>
                            Warranty: {a.warranty_expiry}
                            {expiringSoon && ` — expires in ${daysLeft}d ⚠️`}
                            {expired && ' — EXPIRED'}
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={() => deleteApp.mutate(a.id)} className="text-xs text-surface-muted hover:text-red-500 px-1 flex-shrink-0">✕</button>
                    </div>
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
