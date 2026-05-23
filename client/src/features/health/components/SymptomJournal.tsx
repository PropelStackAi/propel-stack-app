import { useState } from 'react';
import { useSymptoms, useSymptomPatterns, useLogSymptom, useDeleteSymptom } from '../api';

export function SymptomJournal(): JSX.Element {
  const { data: symptoms = [], isLoading } = useSymptoms();
  const { data: patternData } = useSymptomPatterns();
  const logSymptom = useLogSymptom();
  const deleteSymptom = useDeleteSymptom();

  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState(5);
  const [durationHours, setDurationHours] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const patterns = patternData?.patterns ?? [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!symptom.trim()) return;
    logSymptom.mutate(
      { symptom: symptom.trim(), severity, durationHours: durationHours ? Number(durationHours) : undefined, notes },
      { onSuccess: () => { setSymptom(''); setSeverity(5); setDurationHours(''); setNotes(''); setShowForm(false); } },
    );
  }

  const severityColor = (s: number) =>
    s <= 3 ? 'text-green-600 bg-green-100' : s <= 6 ? 'text-amber-600 bg-amber-100' : 'text-red-600 bg-red-100';

  return (
    <div className="space-y-5">
      {/* AI pattern alerts */}
      {patterns.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <span className="text-xl mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Pattern detected — consider seeing a doctor</p>
              {patterns.map((p) => (
                <p key={p.symptom} className="text-xs text-amber-700">
                  <strong className="capitalize">{p.symptom}</strong> logged {p.count} times in the last 7 days.
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add symptom */}
      <div>
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="btn bg-brand-coral text-white hover:bg-brand-coral/90 text-sm">
            + Log symptom
          </button>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-surface-ink/10 bg-surface-sunk/30 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-surface-ink">Log a symptom</h4>
            <div>
              <label className="label">Symptom</label>
              <input
                className="input"
                placeholder="e.g. Headache"
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">
                Severity — <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${severityColor(severity)}`}>{severity}/10</span>
              </label>
              <input
                type="range" min={1} max={10} step={1} value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-brand-coral"
              />
              <div className="flex justify-between text-xs text-surface-muted">
                <span>Mild</span><span>Moderate</span><span>Severe</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Duration (hours, optional)</label>
                <input className="input" type="number" min="0" step="0.5" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} placeholder="e.g. 2" />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="triggers, location…" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outline text-sm">Cancel</button>
              <button type="submit" disabled={logSymptom.isPending || !symptom.trim()} className="flex-1 btn bg-brand-coral text-white text-sm disabled:opacity-50">
                {logSymptom.isPending ? 'Saving…' : 'Log'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Symptom list */}
      {isLoading && <div className="text-sm text-surface-muted py-4">Loading…</div>}
      {!isLoading && symptoms.length === 0 && (
        <div className="text-center py-8 text-surface-muted">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm">No symptoms logged yet. Start tracking to detect patterns.</p>
        </div>
      )}
      {symptoms.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-surface-ink">Recent symptoms (30 days)</h4>
          {symptoms.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-xl border border-surface-ink/[0.06] bg-surface-raised p-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 mt-0.5 ${severityColor(s.severity)}`}>
                {s.severity}/10
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-surface-ink capitalize">{s.symptom}</div>
                <div className="flex gap-3 text-xs text-surface-muted mt-0.5">
                  {s.duration_hours != null && <span>{s.duration_hours}h</span>}
                  {s.notes && <span className="truncate">{s.notes}</span>}
                  <span className="ml-auto shrink-0">{new Date(s.logged_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={() => deleteSymptom.mutate(s.id)} className="text-surface-muted hover:text-red-500 text-sm shrink-0">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
