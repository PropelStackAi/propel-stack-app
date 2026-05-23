import { useState } from 'react';
import { useProgressLogs, useAddProgressLog, useDeleteProgressLog } from '../api';
import type { ProgressLog } from '../types';

const RATING_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };
const RATING_LABEL: Record<number, string> = { 1: 'Very difficult', 2: 'Difficult', 3: 'Neutral', 4: 'Good', 5: 'Great' };
const RATING_COLOR: Record<number, string> = {
  1: 'bg-red-100 border-red-200 text-red-700',
  2: 'bg-orange-100 border-orange-200 text-orange-700',
  3: 'bg-amber-100 border-amber-200 text-amber-700',
  4: 'bg-green-100 border-green-200 text-green-700',
  5: 'bg-emerald-100 border-emerald-200 text-emerald-700',
};

export function ProgressTracker(): JSX.Element {
  const { data: logs = [], isLoading } = useProgressLogs();
  const addLog = useAddProgressLog();
  const deleteLog = useDeleteProgressLog();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    careRecipientName: '', goal: '', logDate: new Date().toISOString().slice(0, 10), rating: 3, notes: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addLog.mutate(form, {
      onSuccess: () => {
        setForm({ careRecipientName: '', goal: '', logDate: new Date().toISOString().slice(0, 10), rating: 3, notes: '' });
        setShowForm(false);
      },
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-xs text-green-800">
        <strong>Progress Tracker:</strong> Log daily or weekly progress toward goals. This is a personal organizational tool — not a clinical outcome measure.
        Share logs with your care team for context, but professional assessment should guide goal-setting.
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-surface-ink">Progress logs</h3>
          <p className="text-xs text-surface-muted">Track daily or weekly progress toward individual goals.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn bg-brand-teal text-white hover:bg-brand-teal/90 text-sm">
          {showForm ? 'Cancel' : '+ Log progress'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-2xl border border-surface-ink/10 bg-surface-sunk/20 p-4 space-y-3">
          <h4 className="text-sm font-semibold">New progress entry</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Person / name (optional)</label>
              <input className="input" placeholder="e.g. Alex" value={form.careRecipientName} onChange={(e) => setForm({ ...form, careRecipientName: e.target.value })} />
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.logDate} onChange={(e) => setForm({ ...form, logDate: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Goal or focus area *</label>
              <input className="input" placeholder="e.g. Morning routine, homework completion, communication goals" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} required />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="label">How did it go today?</label>
            <div className="flex gap-2 mt-1">
              {([1, 2, 3, 4, 5] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, rating: r })}
                  className={[
                    'flex-1 flex flex-col items-center py-2 rounded-xl border transition-all',
                    form.rating === r ? RATING_COLOR[r] + ' ring-2 ring-offset-1 ring-current' : 'border-surface-ink/10 bg-surface-raised hover:bg-surface-sunk',
                  ].join(' ')}
                >
                  <span className="text-xl">{RATING_EMOJI[r]}</span>
                  <span className="text-[9px] font-semibold mt-0.5 hidden sm:block">{RATING_LABEL[r]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} placeholder="What worked? What was challenging? Observations…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outline text-sm">Cancel</button>
            <button type="submit" disabled={addLog.isPending || !form.goal} className="flex-1 btn bg-brand-teal text-white text-sm disabled:opacity-50">
              {addLog.isPending ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="text-sm text-surface-muted">Loading…</div>}

      {!isLoading && logs.length === 0 && !showForm && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📈</div>
          <p className="text-sm text-surface-muted">No progress entries yet. Start logging to see trends.</p>
        </div>
      )}

      {/* Recent logs — chronological */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-surface-muted uppercase tracking-wider">Recent entries</h4>
          {logs.slice(0, 20).map((log) => (
            <LogRow key={log.id} log={log} onDelete={() => deleteLog.mutate(log.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogRow({ log, onDelete }: { log: ProgressLog; onDelete: () => void }): JSX.Element {
  const dateStr = new Date(log.log_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div className="flex items-start gap-3 rounded-xl border border-surface-ink/[0.06] bg-surface-raised px-4 py-3">
      <div className={`flex-shrink-0 rounded-lg border px-2 py-1.5 text-center min-w-[52px] ${RATING_COLOR[log.rating]}`}>
        <div className="text-lg leading-none">{RATING_EMOJI[log.rating]}</div>
        <div className="text-[9px] font-bold mt-0.5">{dateStr}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-surface-ink">
          {log.care_recipient_name ? `${log.care_recipient_name} — ` : ''}{log.goal}
        </div>
        <div className="text-xs text-surface-muted">{RATING_LABEL[log.rating]}</div>
        {log.notes && <p className="text-xs text-surface-muted mt-0.5 italic">{log.notes}</p>}
      </div>
      <button onClick={onDelete} className="text-surface-muted hover:text-red-500 text-sm shrink-0">×</button>
    </div>
  );
}
