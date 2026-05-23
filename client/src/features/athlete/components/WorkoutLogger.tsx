import { useState } from 'react';
import { useTrainingSessions, useLogSession, useDeleteSession, useAthletePRs } from '../api';
import { PRBadge } from './PRBadge';
import type { AthleteProfile, ExerciseSet, AthletePR, TrainingSession } from '../types';
import { SESSION_TYPES, SPORTS, PR_UNITS } from '../types';

interface Props { profile: AthleteProfile; }

interface SessionForm {
  sessionDate: string;
  sessionType: string;
  sport: string;
  exercises: ExerciseSet[];
  durationMin: string;
  rpe: number;
  heartRateAvg: string;
  notes: string;
  mood: number;
}

const EMPTY_FORM: SessionForm = {
  sessionDate: new Date().toISOString().slice(0, 10),
  sessionType: '', sport: '', exercises: [], durationMin: '', rpe: 5, heartRateAvg: '', notes: '', mood: 3,
};

const MOOD_EMOJI = ['', '😞', '😕', '😐', '🙂', '😊'];
const RPE_COLOR: Record<number, string> = {
  1: 'text-green-500', 2: 'text-green-500', 3: 'text-green-500',
  4: 'text-lime-500', 5: 'text-yellow-500', 6: 'text-yellow-500',
  7: 'text-orange-500', 8: 'text-orange-500', 9: 'text-red-500', 10: 'text-red-600',
};

export function WorkoutLogger({ profile }: Props): JSX.Element {
  const { data: sessions = [], isLoading } = useTrainingSessions();
  const { data: prs = [] } = useAthletePRs();
  const logSession = useLogSession();
  const deleteSession = useDeleteSession();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM);
  const [newPRs, setNewPRs] = useState<AthletePR[]>([]);

  // Exercise editor
  const [exForm, setExForm] = useState<ExerciseSet>({ exercise: '', sets: 3, reps: '8-12', weight: undefined, unit: 'lbs' });

  const sports = JSON.parse(profile.sports || '[]') as string[];

  function addExercise() {
    if (!exForm.exercise.trim()) return;
    setForm({ ...form, exercises: [...form.exercises, { ...exForm }] });
    setExForm({ exercise: '', sets: 3, reps: '8-12', weight: undefined, unit: 'lbs' });
  }

  function removeExercise(i: number) {
    setForm({ ...form, exercises: form.exercises.filter((_, idx) => idx !== i) });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sessionType) return;

    const isYouthUnder14 = profile.is_youth_under_14;
    const exercises = isYouthUnder14
      ? form.exercises.map((ex) => ({ ...ex, weight: undefined }))
      : form.exercises;

    logSession.mutate({
      session_date: form.sessionDate,
      session_type: form.sessionType,
      sport: form.sport,
      exercises,
      duration_min: form.durationMin ? Number(form.durationMin) : null,
      rpe: form.rpe,
      heart_rate_avg: form.heartRateAvg ? Number(form.heartRateAvg) : null,
      notes: form.notes,
      mood: form.mood,
    }, {
      onSuccess: (result) => {
        if (result.newPRs && result.newPRs.length > 0) {
          setNewPRs(result.newPRs);
        }
        setForm(EMPTY_FORM);
        setShowForm(false);
      },
    });
  }

  return (
    <div className="space-y-5">
      {newPRs.length > 0 && <PRBadge newPRs={newPRs} onDismiss={() => setNewPRs([])} />}

      {/* PRs summary */}
      {prs.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <h4 className="text-xs font-bold text-amber-700 mb-2">🏆 Your Personal Records</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {prs.slice(0, 6).map((pr) => (
              <div key={pr.id} className="rounded-lg bg-white border border-amber-200 px-3 py-1.5">
                <div className="text-[10px] text-amber-600 font-semibold truncate">{pr.exercise}</div>
                <div className="text-sm font-black text-amber-800">{pr.value} <span className="text-xs font-normal">{pr.unit}</span></div>
              </div>
            ))}
          </div>
          {prs.length > 6 && <p className="text-[10px] text-amber-600 mt-1">+{prs.length - 6} more PRs</p>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-surface-ink">Workout log</h3>
          <p className="text-xs text-surface-muted">Log sessions and automatically track PRs.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn bg-brand-teal text-white hover:bg-brand-teal/90 text-sm">
          {showForm ? 'Cancel' : '+ Log workout'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-2xl border border-surface-ink/10 bg-surface-sunk/20 p-4 space-y-4">
          <h4 className="text-sm font-semibold">New workout entry</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Session type *</label>
              <select className="input" value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value })} required>
                <option value="">Select…</option>
                {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sport</label>
              <select className="input" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}>
                <option value="">Select…</option>
                {sports.map((s) => <option key={s} value={s}>{s}</option>)}
                {SPORTS.filter((s) => !sports.includes(s)).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input className="input" type="number" min={1} max={480} placeholder="e.g. 60" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
            </div>
          </div>

          {/* RPE */}
          <div>
            <label className="label">RPE (Rate of Perceived Exertion) — {form.rpe}/10</label>
            <input
              type="range" min={1} max={10} value={form.rpe}
              onChange={(e) => setForm({ ...form, rpe: Number(e.target.value) })}
              className="w-full accent-brand-teal"
            />
            <div className="flex justify-between text-[10px] text-surface-muted">
              <span>1 Very Easy</span><span className={`font-bold ${RPE_COLOR[form.rpe]}`}>{form.rpe}</span><span>10 Max Effort</span>
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="label">Mood</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((m) => (
                <button key={m} type="button" onClick={() => setForm({ ...form, mood: m })}
                  className={`flex-1 text-center py-2 rounded-xl border transition-all ${form.mood === m ? 'bg-brand-teal/10 border-brand-teal' : 'border-surface-ink/10 hover:bg-surface-sunk'}`}
                >
                  <span className="text-xl">{MOOD_EMOJI[m]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Exercise log */}
          <div>
            <label className="label">Exercises</label>
            {profile.is_youth_under_14 && (
              <p className="text-[10px] text-amber-600 mb-1">Youth safety mode: weight fields are hidden for athletes under 14. Coach sets load.</p>
            )}
            <div className="space-y-1.5 mb-2">
              {form.exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-surface-raised border border-surface-ink/[0.06] px-3 py-1.5">
                  <span className="flex-1 text-xs font-semibold">{ex.exercise}</span>
                  <span className="text-[10px] text-surface-muted">{ex.sets}×{ex.reps}{!profile.is_youth_under_14 && ex.weight ? ` @ ${ex.weight}${ex.unit}` : ''}</span>
                  <button type="button" onClick={() => removeExercise(i)} className="text-surface-muted hover:text-red-500 text-sm">×</button>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-surface-ink/10 bg-surface-sunk/30 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                  <input className="input text-xs" placeholder="Exercise name (e.g. Back Squat)" value={exForm.exercise} onChange={(e) => setExForm({ ...exForm, exercise: e.target.value })} />
                </div>
                <div>
                  <input className="input text-xs" type="number" min={1} max={20} placeholder="Sets" value={exForm.sets ?? ''} onChange={(e) => setExForm({ ...exForm, sets: Number(e.target.value) })} />
                </div>
                <div>
                  <input className="input text-xs" placeholder="Reps (e.g. 5, 8-12)" value={exForm.reps ?? ''} onChange={(e) => setExForm({ ...exForm, reps: e.target.value })} />
                </div>
                {!profile.is_youth_under_14 && (
                  <>
                    <div>
                      <input className="input text-xs" type="number" min={0} placeholder="Weight (optional)" value={exForm.weight ?? ''} onChange={(e) => setExForm({ ...exForm, weight: e.target.value ? Number(e.target.value) : undefined })} />
                    </div>
                    <div>
                      <select className="input text-xs" value={exForm.unit} onChange={(e) => setExForm({ ...exForm, unit: e.target.value })}>
                        {PR_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <button type="button" onClick={addExercise} disabled={!exForm.exercise.trim()} className="btn bg-surface-raised border border-surface-ink/10 text-xs text-surface-ink w-full hover:bg-surface-sunk disabled:opacity-50">
                + Add exercise
              </button>
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} placeholder="How did it feel? Any observations…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outline text-sm">Cancel</button>
            <button type="submit" disabled={logSession.isPending || !form.sessionType} className="flex-1 btn bg-brand-teal text-white text-sm disabled:opacity-50">
              {logSession.isPending ? 'Saving…' : 'Log workout'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="text-sm text-surface-muted">Loading sessions…</div>}

      {!isLoading && sessions.length === 0 && !showForm && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🏋️</div>
          <p className="text-sm text-surface-muted">No workouts logged yet. Start logging to track PRs and progress.</p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-surface-muted uppercase tracking-wider">Recent sessions</h4>
          {sessions.slice(0, 20).map((session) => (
            <SessionRow key={session.id} session={session} onDelete={() => deleteSession.mutate(session.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, onDelete }: { session: TrainingSession; onDelete: () => void }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(session.session_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const exercises = (() => { try { return JSON.parse(session.exercises) as ExerciseSet[]; } catch { return []; } })();

  return (
    <div className="rounded-xl border border-surface-ink/[0.06] bg-surface-raised overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className="flex-shrink-0 text-center min-w-[44px]">
          <div className="text-xs font-bold text-surface-ink">{dateStr}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-surface-ink">{session.session_type}{session.sport ? ` · ${session.sport}` : ''}</div>
          <div className="text-xs text-surface-muted">
            {session.duration_min ? `${session.duration_min} min · ` : ''}{exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
            {session.rpe ? ` · RPE ${session.rpe}` : ''}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-surface-muted hover:text-red-500 text-sm shrink-0 mr-1">×</button>
        <span className="text-surface-muted text-xs">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && exercises.length > 0 && (
        <div className="px-4 pb-3 border-t border-surface-ink/[0.06] pt-2 space-y-1">
          {exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-surface-muted w-4">{i + 1}.</span>
              <span className="font-medium text-surface-ink flex-1">{ex.exercise}</span>
              <span className="text-surface-muted">{ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}${ex.unit}` : ''}</span>
            </div>
          ))}
          {session.notes && <p className="text-xs text-surface-muted italic mt-1">{session.notes}</p>}
        </div>
      )}
    </div>
  );
}
