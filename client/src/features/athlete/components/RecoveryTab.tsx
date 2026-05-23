import { useState } from 'react';
import { useRecoveryLogs, useLogRecovery } from '../api';
import { SorenessBodyMap } from './SorenessBodyMap';
import { RECOVERY_MODALITIES } from '../types';
import type { RecoveryLog } from '../types';

interface RecoveryForm {
  logDate: string;
  sleepHours: string;
  sleepQuality: number;
  hrv: string;
  soreAreas: string[];
  sorenessLevel: number;
  energyLevel: number;
  modalities: string[];
  notes: string;
}

const EMPTY_FORM: RecoveryForm = {
  logDate: new Date().toISOString().slice(0, 10),
  sleepHours: '', sleepQuality: 3, hrv: '', soreAreas: [], sorenessLevel: 1, energyLevel: 3, modalities: [], notes: '',
};

const QUALITY_LABEL: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Average', 4: 'Good', 5: 'Excellent' };
const ENERGY_LABEL: Record<number, string> = { 1: 'Drained', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Peak' };
const SORENESS_LABEL: Record<number, string> = { 1: 'None', 2: 'Mild', 3: 'Moderate', 4: 'Significant', 5: 'Severe' };

function readinessColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

export function RecoveryTab(): JSX.Element {
  const { data: logs = [], isLoading } = useRecoveryLogs();
  const logRecovery = useLogRecovery();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RecoveryForm>(EMPTY_FORM);

  function toggleModality(m: string) {
    setForm({ ...form, modalities: form.modalities.includes(m) ? form.modalities.filter((x) => x !== m) : [...form.modalities, m] });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    logRecovery.mutate({
      log_date: form.logDate,
      sleep_hours: form.sleepHours ? Number(form.sleepHours) : null,
      sleep_quality: form.sleepQuality,
      hrv: form.hrv ? Number(form.hrv) : null,
      sore_areas: form.soreAreas,
      soreness_level: form.sorenessLevel,
      energy_level: form.energyLevel,
      modalities: form.modalities,
      notes: form.notes,
    }, {
      onSuccess: () => { setForm(EMPTY_FORM); setShowForm(false); },
    });
  }

  const latestLog = logs[0];

  return (
    <div className="space-y-5">
      {/* Latest readiness score */}
      {latestLog && latestLog.readiness_score !== null && (
        <div className="rounded-xl bg-surface-raised border border-surface-ink/[0.06] px-5 py-4 flex items-center gap-5">
          <div className="text-center">
            <div className={`text-4xl font-black ${readinessColor(latestLog.readiness_score)}`}>
              {Math.round(latestLog.readiness_score)}
            </div>
            <div className="text-[10px] text-surface-muted font-semibold">READINESS</div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-xs text-surface-muted">Based on sleep quality, energy, and soreness</div>
            <ReadinessBar score={latestLog.readiness_score} />
            <div className="text-[10px] text-surface-muted">
              {new Date(latestLog.log_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-surface-ink">Recovery log</h3>
          <p className="text-xs text-surface-muted">Track sleep, soreness, and readiness daily.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn bg-brand-teal text-white hover:bg-brand-teal/90 text-sm">
          {showForm ? 'Cancel' : '+ Log recovery'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-2xl border border-surface-ink/10 bg-surface-sunk/20 p-4 space-y-4">
          <h4 className="text-sm font-semibold">New recovery entry</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.logDate} onChange={(e) => setForm({ ...form, logDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Sleep hours</label>
              <input className="input" type="number" min={0} max={24} step={0.5} placeholder="e.g. 7.5" value={form.sleepHours} onChange={(e) => setForm({ ...form, sleepHours: e.target.value })} />
            </div>
          </div>

          {/* Sleep quality */}
          <SliderField label={`Sleep quality — ${QUALITY_LABEL[form.sleepQuality]}`} value={form.sleepQuality} min={1} max={5}
            onChange={(v) => setForm({ ...form, sleepQuality: v })} color="bg-indigo-400" />

          {/* Energy level */}
          <SliderField label={`Energy level — ${ENERGY_LABEL[form.energyLevel]}`} value={form.energyLevel} min={1} max={5}
            onChange={(v) => setForm({ ...form, energyLevel: v })} color="bg-green-400" />

          {/* Soreness level */}
          <SliderField label={`Overall soreness — ${SORENESS_LABEL[form.sorenessLevel]}`} value={form.sorenessLevel} min={1} max={5}
            onChange={(v) => setForm({ ...form, sorenessLevel: v })} color="bg-red-400" />

          {/* HRV */}
          <div>
            <label className="label">HRV (optional — from wearable)</label>
            <input className="input" type="number" min={0} max={250} placeholder="e.g. 68" value={form.hrv} onChange={(e) => setForm({ ...form, hrv: e.target.value })} />
          </div>

          {/* Body map */}
          <div>
            <label className="label">Sore areas (click to mark)</label>
            <SorenessBodyMap selected={form.soreAreas} onChange={(v) => setForm({ ...form, soreAreas: v })} />
          </div>

          {/* Recovery modalities */}
          <div>
            <label className="label">Recovery methods used today</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {RECOVERY_MODALITIES.map((m) => {
                const sel = form.modalities.includes(m);
                return (
                  <button key={m} type="button" onClick={() => toggleModality(m)}
                    className={`px-3 py-1 rounded-xl border text-xs font-semibold transition-all ${sel ? 'bg-brand-teal text-white border-brand-teal' : 'bg-surface-sunk border-surface-ink/10 text-surface-muted hover:text-surface-ink'}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} placeholder="Observations, context, how you felt…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outline text-sm">Cancel</button>
            <button type="submit" disabled={logRecovery.isPending} className="flex-1 btn bg-brand-teal text-white text-sm disabled:opacity-50">
              {logRecovery.isPending ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="text-sm text-surface-muted">Loading…</div>}

      {!isLoading && logs.length === 0 && !showForm && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">😴</div>
          <p className="text-sm text-surface-muted">No recovery logs yet. Start logging to see your readiness trends.</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-surface-muted uppercase tracking-wider">Recent logs</h4>
          {logs.slice(0, 14).map((log) => (
            <RecoveryRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function SliderField({ label, value, min, max, onChange, color }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; color: string;
}): JSX.Element {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <span className="text-xs text-surface-muted w-4">{min}</span>
        <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`flex-1 accent-brand-teal`} />
        <span className="text-xs text-surface-muted w-4">{max}</span>
        <span className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{value}</span>
      </div>
    </div>
  );
}

function ReadinessBar({ score }: { score: number }): JSX.Element {
  const pct = Math.min(100, Math.max(0, score));
  const color = score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="h-2 bg-surface-sunk rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RecoveryRow({ log }: { log: RecoveryLog }): JSX.Element {
  const dateStr = new Date(log.log_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const soreAreas = (() => { try { return JSON.parse(log.sore_areas) as string[]; } catch { return []; } })();

  return (
    <div className="rounded-xl border border-surface-ink/[0.06] bg-surface-raised px-4 py-3 flex items-start gap-3">
      <div className="flex-shrink-0 text-center min-w-[52px]">
        {log.readiness_score !== null ? (
          <div className={`text-xl font-black ${readinessColor(log.readiness_score)}`}>{Math.round(log.readiness_score)}</div>
        ) : (
          <div className="text-xl font-black text-surface-muted">—</div>
        )}
        <div className="text-[9px] text-surface-muted font-bold">{dateStr}</div>
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex gap-3 text-xs text-surface-muted">
          {log.sleep_hours !== null && <span>😴 {log.sleep_hours}h</span>}
          {log.sleep_quality !== null && <span>💤 Q:{log.sleep_quality}/5</span>}
          {log.energy_level !== null && <span>⚡ E:{log.energy_level}/5</span>}
          {log.hrv !== null && <span>❤️ HRV:{log.hrv}</span>}
        </div>
        {soreAreas.length > 0 && <p className="text-[10px] text-red-500">Sore: {soreAreas.slice(0, 4).join(', ')}{soreAreas.length > 4 ? '…' : ''}</p>}
        {log.notes && <p className="text-[10px] text-surface-muted italic">{log.notes}</p>}
      </div>
    </div>
  );
}
