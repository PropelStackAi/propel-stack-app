// ─── StreakCard.tsx — Dashboard widget ───────────────────────────────────────
// Session 16 — Propel Stack AI, LLC
// Shows top 3 active streaks pinned to the dashboard.

import { Link } from 'wouter';
import { useStreaks } from '../api';
import type { Streak } from '../types';

function StreakPill({ streak }: { streak: Streak }) {
  const isHot = streak.current_len >= 7;
  return (
    <div className={`flex items-center gap-2 bg-surface-sunk rounded-xl px-3 py-2 border ${isHot ? 'border-orange-300/60' : 'border-surface-ink/[0.06]'}`}>
      <span className="text-xl leading-none">{streak.emoji}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-surface-ink truncate">{streak.label}</p>
        <p className={`text-xs font-bold ${isHot ? 'text-orange-500' : 'text-brand-teal'}`}>
          {streak.current_len} {streak.unit}
          {isHot ? ' 🔥' : ''}
        </p>
      </div>
    </div>
  );
}

export function StreakCard() {
  const { data, isLoading } = useStreaks();
  const activeStreaks = (data?.streaks ?? []).filter((s) => s.current_len > 0).slice(0, 3);

  if (isLoading) {
    return (
      <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3 animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (activeStreaks.length === 0) {
    return (
      <Link href="/streaks">
        <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-brand-teal/30 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <p className="text-sm font-semibold text-surface-ink">Streaks & Life Wins</p>
              <p className="text-xs text-surface-muted">No active streaks yet — start one today</p>
            </div>
          </div>
          <span className="text-brand-teal text-xs font-semibold shrink-0">View →</span>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/streaks">
      <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4 cursor-pointer hover:border-brand-teal/30 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-surface-muted uppercase tracking-wider">🔥 Active Streaks</p>
          <span className="text-brand-teal text-xs font-semibold">View all →</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {activeStreaks.map((s) => <StreakPill key={s.id} streak={s} />)}
        </div>
      </div>
    </Link>
  );
}
