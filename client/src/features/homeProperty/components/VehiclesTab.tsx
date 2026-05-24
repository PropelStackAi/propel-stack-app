// ─── Vehicles Tab ─────────────────────────────────────────────────────────────
// Enhancement 21 — Propel Stack AI, LLC

import { useState } from 'react';
import { useVehicles, useCreateVehicle, useDeleteVehicle, useVehicleServiceLog, useLogVehicleService } from '../api';
import type { Vehicle } from '../types';

const SERVICE_TYPES = [
  { value: 'oil_change',    label: 'Oil change',         emoji: '🛢️' },
  { value: 'tire_rotation', label: 'Tire rotation',      emoji: '🔄' },
  { value: 'inspection',    label: 'Inspection',         emoji: '🔍' },
  { value: 'registration',  label: 'Registration',       emoji: '📋' },
  { value: 'other',         label: 'Other',              emoji: '🔧' },
];

function ServicePanel({ vehicle }: { vehicle: Vehicle }) {
  const { data } = useVehicleServiceLog(vehicle.id);
  const logService = useLogVehicleService(vehicle.id);
  const [showLog, setShowLog] = useState(false);
  const [svcType, setSvcType] = useState('oil_change');
  const [svcDate, setSvcDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  const [cost, setCost]       = useState('');

  const log = data?.log ?? [];

  function submitLog() {
    logService.mutate({
      service_type: svcType as Vehicle['make'],
      service_date: svcDate,
      mileage: mileage ? Number(mileage) : undefined,
      cost_cents: cost ? Math.round(Number(cost) * 100) : undefined,
    } as Parameters<typeof logService.mutate>[0], {
      onSuccess: () => { setShowLog(false); setMileage(''); setCost(''); },
    });
  }

  return (
    <div className="border-t border-surface-ink/10 pt-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Service History</p>
        <button type="button" onClick={() => setShowLog(!showLog)}
          className="text-xs bg-brand-teal/10 text-brand-teal px-2 py-1 rounded-lg font-semibold hover:bg-brand-teal/20">
          + Log service
        </button>
      </div>

      {showLog && (
        <div className="bg-surface-sunk rounded-lg p-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={svcType} onChange={(e) => setSvcType(e.target.value)}
              className="col-span-2 border border-surface-ink/10 rounded-lg px-2 py-1.5 text-sm">
              {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
            </select>
            <input value={svcDate} onChange={(e) => setSvcDate(e.target.value)} type="date"
              className="border border-surface-ink/10 rounded-lg px-2 py-1.5 text-sm" />
            <input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" placeholder="Mileage"
              className="border border-surface-ink/10 rounded-lg px-2 py-1.5 text-sm" />
            <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="0.01" placeholder="Cost ($)"
              className="border border-surface-ink/10 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowLog(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submitLog} disabled={logService.isPending}
              className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {logService.isPending ? 'Saving…' : 'Log ✓'}
            </button>
          </div>
        </div>
      )}

      {log.length === 0 ? (
        <p className="text-xs text-surface-muted italic">No service history logged yet.</p>
      ) : (
        <div className="space-y-1">
          {log.slice(0, 5).map((entry) => {
            const meta = SERVICE_TYPES.find((s) => s.value === entry.service_type) ?? SERVICE_TYPES[4];
            return (
              <div key={entry.id} className="flex items-center gap-2 text-xs text-surface-muted">
                <span>{meta.emoji}</span>
                <span className="flex-1">{meta.label} · {entry.service_date}</span>
                {entry.mileage && <span>{entry.mileage.toLocaleString()} mi</span>}
                {entry.cost_cents && <span>${(entry.cost_cents / 100).toFixed(0)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VehicleCard({ v }: { v: Vehicle }) {
  const del = useDeleteVehicle();
  const [expanded, setExpanded] = useState(false);

  const regSoon = v.registration_renewal && v.registration_renewal <= new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const inspSoon = v.inspection_due && v.inspection_due <= new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  return (
    <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🚗</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-ink">
            {v.year} {v.make} {v.model} {v.color ? `· ${v.color}` : ''}
          </p>
          <p className="text-xs text-surface-muted">
            {v.license_plate || 'No plate'} · {v.current_mileage.toLocaleString()} mi
          </p>
          <div className="flex gap-2 mt-0.5 flex-wrap">
            {regSoon && <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">Reg due {v.registration_renewal}</span>}
            {inspSoon && <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">Inspection due {v.inspection_due}</span>}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="text-xs text-surface-muted hover:text-surface-ink px-1">{expanded ? '▲' : '▼'}</button>
          <button type="button" onClick={() => del.mutate(v.id)}
            className="text-xs text-surface-muted hover:text-red-500 px-1">✕</button>
        </div>
      </div>
      {expanded && <ServicePanel vehicle={v} />}
    </div>
  );
}

export function VehiclesTab() {
  const { data, isLoading } = useVehicles();
  const create = useCreateVehicle();
  const [showForm, setShowForm] = useState(false);
  const [make, setMake]         = useState('');
  const [model, setModel]       = useState('');
  const [year, setYear]         = useState(new Date().getFullYear().toString());
  const [color, setColor]       = useState('');
  const [plate, setPlate]       = useState('');
  const [miles, setMiles]       = useState('');
  const [regDate, setRegDate]   = useState('');
  const [inspDate, setInspDate] = useState('');

  const vehicles = data?.vehicles ?? [];

  function submit() {
    if (!make || !model) return;
    create.mutate({ make, model, year: Number(year), color, license_plate: plate, current_mileage: Number(miles) || 0, registration_renewal: regDate || undefined, inspection_due: inspDate || undefined }, {
      onSuccess: () => { setShowForm(false); setMake(''); setModel(''); setColor(''); setPlate(''); setMiles(''); setRegDate(''); setInspDate(''); },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold">
          + Add vehicle
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add a vehicle</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Make (Toyota)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model (Camry)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={year} onChange={(e) => setYear(e.target.value)} type="number" min="1990" max="2030" placeholder="Year"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color (optional)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="License plate"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={miles} onChange={(e) => setMiles(e.target.value)} type="number" placeholder="Current mileage"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Registration renewal</label>
              <input value={regDate} onChange={(e) => setRegDate(e.target.value)} type="date"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Inspection due</label>
              <input value={inspDate} onChange={(e) => setInspDate(e.target.value)} type="date"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Adding…' : 'Add vehicle'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-surface-muted text-center py-8">Loading…</p>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl">🚗</p>
          <p className="text-sm text-surface-muted mt-2">No vehicles added yet.</p>
          <p className="text-xs text-surface-muted">Track service history, registration, and inspection due dates.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vehicles.map((v) => <VehicleCard key={v.id} v={v} />)}
        </div>
      )}
    </div>
  );
}
