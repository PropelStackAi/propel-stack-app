// ─── StreakCard.tsx — Dashboard widget ───────────────────────────────────────
// Enhancement 10 — Streak Momentum Visual Upgrade
// Propel Stack AI, LLC

import { Link } from 'wouter';
import { useStreaks } from '../api';
import type { Streak } from '../types';

/**
 * Returns the next milestone for a given streak length.
 * Used for the progress bar "how close to the next badge".
 */
function nextMilestone(len: number): { target: number; label: string } {
  if (len < 7)   return { target: 7,   label: 'First Week' };
  if (len < 30)  return { target: 30,  label: '30-Day' };
  if (len < 60)  return { target: 60,  label: '60-Day' };
  if (len < 100) return { target: 100, label: '100-Day' };
  return { target: len + 10, label: 'Legend' };
}

/** Tier label + accent color + flame emoji for a streak length */
function tierInfo(len: number): { label: string; color: string; flame: string } {
  if (len >= 100) return { label: 'Legend',     color: '#F05A28', flame: '🏆' };
  if (len >= 30)  return { label: 'Dedicated',  color: '#4F35C2', flame: '🔥' };
  if (len >= 7)   return { label: 'Consistent', color: '#01696F', flame: '⚡' };
  return             { label: 'Building',    color: '#9CA3AF', flame: '✨' };
}

function StreakPill({ streak }: { streak: Streak }) {
  const { label: tierLabel, color, flame } = tierInfo(streak.current_len);
  const { target, label: msLabel } = nextMilestone(streak.current_len);
  const prevThreshold = streak.current_len >= 100 ? 100
    : streak.current_len >= 60 ? 60
    : streak.current_len >= 30 ? 30
    : streak.current_len >= 7  ? 7 : 0;
  const pct = Math.min(100, Math.round(((streak.current_len - prevThreshold) / (target - prevThreshold)) * 100));
  const isHot = streak.current_len >= 7;

  return (
    <div
      className="flex flex-col gap-1.5 bg-surface-sunk rounded-xl px-3 py-2.5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Name + count */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-surface-ink truncate leading-tight">
          {streak.emoji} {streak.label}
        </span>
        <span className="text-[11px] font-bold ml-1 flex-shrink-0" style={{ color }}>
          {streak.current_len}d {isHot ? flame : ''}
        </span>
      </div>

      {/* Momentum progress bar */}
      <div className="w-full h-1 rounded-full bg-surface-raised overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {/* Tier + next milestone */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-surface-muted">{tierLabel}</span>
        <span className="text-[10px] text-surface-muted">{pct}% → {msLabel}</span>
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
          {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (activeStreaks.length === 0) {
    return (
      <Link href="/streaks">
        <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-brand-teal/30 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-sm font-semibold text-surface-ink">Streaks & Momentum</p>
              <p className="text-xs text-surface-muted">Start a habit — your first streak is one day away</p>
            </div>
          </div>
          <span className="text-brand-teal text-xs font-semibold shrink-0">Start →</span>
        </div>
      </Link>
    );
  }

  // Momentum score: sum of days + 10pt bonus per hot streak
  const momentum = activeStreaks.reduce(
    (acc, s) => acc + s.current_len + (s.current_len >= 7 ? 10 : 0),
    0,
  );

  return (
    <Link href="/streaks">
      <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4 cursor-pointer hover:border-brand-teal/30 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-surface-muted uppercase tracking-wider">🔥 Momentum</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-surface-muted">Score</span>
            <span className="font-display font-extrabold text-sm text-brand-indigo">{momentum}</span>
            <span className="text-brand-teal text-xs font-semibold ml-1">View all →</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {activeStreaks.map((s) => <StreakPill key={s.id} streak={s} />)}
        </div>
      </div>
    </Link>
  );
}
