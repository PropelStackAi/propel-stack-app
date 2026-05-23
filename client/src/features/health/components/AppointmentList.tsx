import { useState } from 'react';
import { useAppointments, useAddAppointment, useUpdateAppointment, useDeleteAppointment } from '../api';

const SPECIALTIES = ['Primary Care', 'Cardiologist', 'Dermatologist', 'Endocrinologist',
  'Gastroenterologist', 'Neurologist', 'Obstetrician', 'Oncologist', 'Ophthalmologist',
  'Orthopedist', 'Psychiatrist', 'Pulmonologist', 'Rheumatologist', 'Urologist', 'Other'];

export function AppointmentList(): JSX.Element {
  const { data: appts = [], isLoading } = useAppointments();
  const addAppt = useAddAppointment();
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    doctorName: '', specialty: 'Primary Care',
    appointmentDate: '', appointmentTime: '', location: '', notes: '',
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appts.filter((a) => a.appointment_date >= today && a.status !== 'cancelled');
  const past = appts.filter((a) => a.appointment_date < today || a.status === 'past');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addAppt.mutate(
      { ...form },
      { onSuccess: () => { setForm({ doctorName: '', specialty: 'Primary Care', appointmentDate: '', appointmentTime: '', location: '', notes: '' }); setShowForm(false); } },
    );
  }

  return (
    <div className="space-y-5">
      {/* Add appointment */}
      <div>
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="btn bg-brand-coral text-white hover:bg-brand-coral/90 text-sm">
            + Add appointment
          </button>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-surface-ink/10 bg-surface-sunk/30 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-surface-ink">New appointment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Doctor / provider name</label>
                <input className="input" placeholder="Dr. Smith" value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} required />
              </div>
              <div>
                <label className="label">Specialty</label>
                <select className="input" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
                  {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} required />
              </div>
              <div>
                <label className="label">Time</label>
                <input className="input" type="time" value={form.appointmentTime} onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Location / office</label>
                <input className="input" placeholder="e.g. 123 Main St, Suite 4" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input text-sm" placeholder="Reason for visit, questions to ask…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outline text-sm">Cancel</button>
              <button type="submit" disabled={addAppt.isPending || !form.doctorName || !form.appointmentDate} className="flex-1 btn bg-brand-coral text-white text-sm disabled:opacity-50">
                {addAppt.isPending ? 'Saving…' : 'Add'}
              </button>
            </div>
          </form>
        )}
      </div>

      {isLoading && <div className="text-sm text-surface-muted py-4">Loading…</div>}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-surface-ink mb-2">Upcoming ({upcoming.length})</h4>
          <div className="space-y-2">
            {upcoming.map((a) => (
              <ApptRow key={a.id} appt={a}
                onComplete={() => updateAppt.mutate({ id: a.id, body: { status: 'past' } })}
                onCancel={() => updateAppt.mutate({ id: a.id, body: { status: 'cancelled' } })}
                onDelete={() => deleteAppt.mutate(a.id)}
              />
            ))}
          </div>
        </div>
      )}

      {upcoming.length === 0 && !isLoading && (
        <div className="text-center py-6 text-surface-muted">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-sm">No upcoming appointments.</p>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <details>
          <summary className="text-sm font-semibold text-surface-muted cursor-pointer hover:text-surface-ink mb-2">
            Past appointments ({past.length})
          </summary>
          <div className="space-y-2 mt-2 opacity-60">
            {past.slice(0, 10).map((a) => (
              <ApptRow key={a.id} appt={a} past onDelete={() => deleteAppt.mutate(a.id)} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ApptRow({ appt, past = false, onComplete, onCancel, onDelete }: {
  appt: import('../types').HealthAppointment;
  past?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
  onDelete: () => void;
}): JSX.Element {
  const dateStr = new Date(appt.appointment_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="flex items-start gap-3 rounded-xl border border-surface-ink/[0.06] bg-surface-raised p-3">
      <div className="rounded-xl bg-brand-coral/10 text-brand-coral text-center px-3 py-2 shrink-0 min-w-[56px]">
        <div className="text-xs font-semibold uppercase">{dateStr.split(' ')[0]}</div>
        <div className="text-sm font-bold">{dateStr.split(' ')[2]}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-surface-ink">{appt.doctor_name}</div>
        <div className="flex flex-wrap gap-2 text-xs text-surface-muted mt-0.5">
          {appt.specialty && <span>{appt.specialty}</span>}
          {appt.appointment_time && <span>at {appt.appointment_time}</span>}
          {appt.location && <span className="truncate">📍{appt.location}</span>}
        </div>
        {appt.notes && <p className="text-xs text-surface-muted mt-1 truncate">{appt.notes}</p>}
      </div>
      {!past && (
        <div className="flex gap-1 shrink-0">
          {onComplete && (
            <button onClick={onComplete} className="text-xs border border-green-300 text-green-700 rounded-lg px-2 py-1 hover:bg-green-50">Done</button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="text-xs text-surface-muted hover:text-red-500 border border-surface-ink/10 rounded-lg px-2 py-1">Cancel</button>
          )}
        </div>
      )}
      <button onClick={onDelete} className="text-surface-muted hover:text-red-500 text-sm shrink-0 ml-1">×</button>
    </div>
  );
}
