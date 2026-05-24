// ─── Streaks & Life Wins Page ─────────────────────────────────────────────────
// Session 16 — Propel Stack AI, LLC

import { useState } from 'react';
import { StreaksList } from '../features/streaks/components/StreaksList';
import { BadgeShelf } from '../features/streaks/components/BadgeShelf';
import { WinsFeed } from '../features/life-wins/components/WinsFeed';

type Tab = 'streaks' | 'wins' | 'badges';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'streaks', label: 'Streaks',    emoji: '🔥' },
  { id: 'wins',    label: 'Life Wins',  emoji: '🏆' },
  { id: 'badges',  label: 'Badges',     emoji: '🏅' },
];

export function StreaksAndWins(): JSX.Element {
  const [tab, setTab] = useState<Tab>('streaks');

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          🔥 Streaks &amp; Life Wins
        </h2>
        <p className="text-xs text-surface-muted">
          Build daily momentum and celebrate your best moments
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
              tab === t.id
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'streaks' && <StreaksList />}
        {tab === 'wins'    && <WinsFeed />}
        {tab === 'badges'  && <BadgeShelf />}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI, LLC · Streaks &amp; Life Wins ·
        Life Wins are private by default and never used in scoring.
      </p>
    </div>
  );
}
