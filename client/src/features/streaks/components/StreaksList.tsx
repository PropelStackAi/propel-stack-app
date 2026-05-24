// ─── StreaksList.tsx — All streaks detail view ────────────────────────────────
// Session 16 — Propel Stack AI, LLC

import { useStreaks, useTouchStreak } from '../api';
import type { Streak } from '../types';

function progressWidth(current: number, longest: number): number {
  if (longest === 0) return 0;
  return Math.min(100, Math.round((current / Math.max(longest, 7)) * 100));
}

function StreakRow({ streak }: { streak: Streak }) {
  const touch = useTouchStreak();
  const isHot = streak.current_len >= 7;
  const pct = progressWidth(streak.current_len, streak.longest_ever);

  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{streak.emoji}</span>
          <div>
            <p className="text-sm font-bold text-surface-ink">{streak.label}</p>
            <p className="text-[10px] text-surface-muted">
              Best: {streak.longest_ever} {streak.unit}
              {streak.grace_used ? ' · Grace used' : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-extrabold ${isHot ? 'text-orange-500' : 'text-brand-teal'}`}>
            {streak.current_len}
          </p>
          <p className="text-[10px] text-surface-muted">{streak.unit}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface-sunk rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isHot ? 'bg-orange-400' : 'bg-brand-teal'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Touch button */}
      <button
        type="button"
        onClick={() => touch.mutate({ streak_type: streak.streak_type, habit_id: streak.habit_id })}
        disabled={touch.isPending || streak.last_logged === new Date().toISOString().slice(0, 10)}
        className={`w-full text-xs py-1.5 rounded-lg font-semibold transition-colors ${
          streak.last_logged === new Date().toISOString().slice(0, 10)
            ? 'bg-surface-sunk text-surface-muted cursor-default'
            : 'btn'
        }`}
      >
        {streak.last_logged === new Date().toISOString().slice(0, 10)
          ? '✓ Logged today'
          : `Log ${streak.label}`}
      </button>
    </div>
  );
}

export function StreaksList() {
  const { data, isLoading } = useStreaks();
  const streaks = data?.streaks ?? [];
  const active = streaks.filter((s) => s.current_len > 0);
  const inactive = streaks.filter((s) => s.current_len === 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (streaks.length === 0) {
    return (
      <div className="text-center py-10 text-surface-muted">
        <p className="text-3xl mb-2">🔥</p>
        <p className="text-sm">Your streaks will appear here as you use the app.</p>
        <p className="text-xs mt-1">Log a mood, complete a habit, or open a recap to start.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-muted">🔥 Active</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {active.map((s) => <StreakRow key={s.id} streak={s} />)}
          </div>
        </div>
      )}
      {inactive.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-muted">💤 Inactive</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inactive.map((s) => <StreakRow key={s.id} streak={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
