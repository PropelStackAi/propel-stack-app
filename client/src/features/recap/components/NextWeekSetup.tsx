// ─── NextWeekSetup.tsx ────────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useState } from 'react';
import type { WeeklyRecap } from '../types';
import { useSaveNextWeek } from '../api';

interface NextWeekSetupProps {
  recap: WeeklyRecap;
  onSaved?: () => void;
}

export function NextWeekSetup({ recap, onSaved }: NextWeekSetupProps) {
  const [open, setOpen] = useState(false);
  const [intention, setIntention] = useState(recap.next_week_intention);
  const [habit, setHabit] = useState(recap.next_week_habit);
  const [goal, setGoal] = useState(recap.next_week_goal);

  const saveNextWeek = useSaveNextWeek();

  const hasSaved = !!(recap.next_week_intention || recap.next_week_habit || recap.next_week_goal);

  function handleSave() {
    saveNextWeek.mutate(
      { id: recap.id, intention, habit, goal },
      {
        onSuccess: () => {
          setOpen(false);
          onSaved?.();
        },
      }
    );
  }

  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-2xl p-5">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🗓️</span>
          <div className="text-left">
            <p className="text-sm font-bold text-surface-ink">Next Week Setup</p>
            <p className="text-xs text-surface-muted">
              {hasSaved ? 'Intentions saved — tap to edit' : 'Set your intention, habit, and goal'}
            </p>
          </div>
        </div>
        <span className={`text-surface-muted transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Saved summary when collapsed */}
      {!open && hasSaved && (
        <div className="mt-3 space-y-1.5">
          {recap.next_week_intention && (
            <div className="text-xs text-surface-muted flex gap-2">
              <span className="font-semibold text-surface-ink shrink-0">Intention:</span>
              <span className="truncate">{recap.next_week_intention}</span>
            </div>
          )}
          {recap.next_week_habit && (
            <div className="text-xs text-surface-muted flex gap-2">
              <span className="font-semibold text-surface-ink shrink-0">Habit:</span>
              <span className="truncate">{recap.next_week_habit}</span>
            </div>
          )}
          {recap.next_week_goal && (
            <div className="text-xs text-surface-muted flex gap-2">
              <span className="font-semibold text-surface-ink shrink-0">Goal:</span>
              <span className="truncate">{recap.next_week_goal}</span>
            </div>
          )}
        </div>
      )}

      {/* Expanded form */}
      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">🎯 One Intention for Next Week</label>
            <input
              className="input"
              placeholder="e.g. Be more present during meals"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <label className="label">🔁 One Habit to Build</label>
            <input
              className="input"
              placeholder="e.g. Walk 10 minutes after dinner"
              value={habit}
              onChange={(e) => setHabit(e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <label className="label">🏆 One Measurable Goal</label>
            <input
              className="input"
              placeholder="e.g. Log 5 workouts by Friday"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveNextWeek.isPending}
              className="btn flex-1"
            >
              {saveNextWeek.isPending ? 'Saving…' : 'Save Intentions'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-outline px-4"
            >
              Cancel
            </button>
          </div>
          {saveNextWeek.isError && (
            <p className="text-xs text-red-500">Failed to save — please try again.</p>
          )}
        </div>
      )}
    </div>
  );
}
