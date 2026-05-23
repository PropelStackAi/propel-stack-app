import { useState } from 'react';
import { useMedications, useAddMedication, useUpdateMedication, useDeleteMedication } from '../api';

const FREQUENCIES = ['daily', 'twice daily', 'three times daily', 'weekly', 'as needed', 'other'];

export function MedicationTracker(): JSX.Element {
  const { data: meds = [], isLoading } = useMedications();
  const addMed = useAddMedication();
  const updateMed = useUpdateMedication();
  const deleteMed = useDeleteMedication();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', dose: '', frequency: 'daily', startDate: '', notes: '' });

  const active = meds.filter((m) => m.active === 1);
  const inactive = meds.filter((m) => m.active === 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addMed.mutate(
      { name: form.name, dose: form.dose, frequency: form.frequency, startDate: form.startDate || undefined, notes: form.notes },
      { onSuccess: () => { setForm({ name: '', dose: '', frequency: 'daily', startDate: '', notes: '' }); setShowForm(false); } },
    );
  }

  return (
    <div className="space-y-5">
      {/* Add medication */}
      <div>
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="btn bg-brand-coral text-white hover:bg-brand-coral/90 text-sm">
            + Add medication
          </button>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-surface-ink/10 bg-surface-sunk/30 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-surface-ink">Add medication</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Medication name</label>
                <input className="input" placeholder="e.g. Lisinopril" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Dose</label>
                <input className="input" placeholder="e.g. 10mg" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
              </div>
              <div>
                <label className="label">Frequency</label>
                <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Start date</label>
                <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Take with food" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outline text-sm">Cancel</button>
              <button type="submit" disabled={addMed.isPending || !form.name} className="flex-1 btn bg-brand-coral text-white text-sm disabled:opacity-50">
                {addMed.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        )}
      </div>

      {isLoading && <div className="text-sm text-surface-muted py-4">Loading…</div>}

      {/* Active medications */}
      {active.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-surface-ink mb-2">Active ({active.length})</h4>
          <div className="space-y-2">
            {active.map((med) => (
              <MedRow
                key={med.id}
                med={med}
                onToggle={() => updateMed.mutate({ id: med.id, body: { active: false } })}
                onDelete={() => deleteMed.mutate(med.id)}
              />
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && !isLoading && (
        <div className="text-center py-6 text-surface-muted">
          <div className="text-3xl mb-2">💊</div>
          <p className="text-sm">No active medications. Add one to track your regimen.</p>
        </div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-surface-muted mb-2">Inactive / past</h4>
          <div className="space-y-2 opacity-60">
            {inactive.map((med) => (
              <MedRow
                key={med.id}
                med={med}
                inactive
                onToggle={() => updateMed.mutate({ id: med.id, body: { active: true } })}
                onDelete={() => deleteMed.mutate(med.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MedRow({ med, inactive = false, onToggle, onDelete }: {
  med: import('../types').Medication;
  inactive?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-surface-ink/[0.06] bg-surface-raised p-3">
      <span className="text-xl mt-0.5">💊</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-surface-ink">{med.name}</span>
          {med.dose && <span className="chip text-xs">{med.dose}</span>}
        </div>
        <div className="flex gap-3 text-xs text-surface-muted mt-0.5">
          <span className="capitalize">{med.frequency}</span>
          {med.start_date && <span>Since {med.start_date}</span>}
          {med.notes && <span className="truncate">{med.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggle}
          className="text-xs text-surface-muted hover:text-surface-ink border border-surface-ink/10 rounded-lg px-2 py-1"
        >
          {inactive ? 'Reactivate' : 'Discontinue'}
        </button>
        <button onClick={onDelete} className="text-surface-muted hover:text-red-500 text-sm">×</button>
      </div>
    </div>
  );
}
