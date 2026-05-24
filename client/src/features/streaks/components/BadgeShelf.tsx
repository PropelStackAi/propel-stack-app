// ─── BadgeShelf.tsx — Earned milestone badges ─────────────────────────────────
// Session 16 — Propel Stack AI, LLC

import { useStreakBadges } from '../api';

const BADGE_EMOJIS: Record<string, string> = {
  'First Week':   '🥇',
  '30-Day Habit': '🏅',
  '60-Day Habit': '🥈',
  '100-Day':      '💎',
  'Comeback':     '💪',
  'Life Score 80':'⭐',
  'Perfect Week': '🌟',
  'First Goal':   '🎯',
};

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function BadgeShelf() {
  const { data, isLoading } = useStreakBadges();
  const badges = data?.badges ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const POSSIBLE_BADGES = [
    { title: 'First Week', detail: '7 consecutive daily logins' },
    { title: '30-Day Habit', detail: '30-day streak on any habit' },
    { title: '60-Day Habit', detail: '60-day streak on any habit' },
    { title: '100-Day', detail: '100 consecutive daily logins' },
    { title: 'Comeback', detail: 'Return after 7+ days away' },
    { title: 'First Goal', detail: 'First goal marked complete' },
    { title: 'Life Score 80', detail: 'Life Score reaches 80+' },
    { title: 'Perfect Week', detail: 'All categories green in one week' },
  ];

  const earnedTitles = new Set(badges.map((b) => b.title));

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-surface-muted">🏅 Milestone Badges</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {POSSIBLE_BADGES.map((badge) => {
          const earned = earnedTitles.has(badge.title);
          const earnedRow = badges.find((b) => b.title === badge.title);
          const emoji = BADGE_EMOJIS[badge.title] ?? '🏅';
          return (
            <div
              key={badge.title}
              className={`rounded-xl p-3 text-center border transition-all ${
                earned
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-surface-sunk border-surface-ink/[0.06] opacity-50'
              }`}
            >
              <div className={`text-2xl mb-1 ${earned ? '' : 'grayscale'}`}>{emoji}</div>
              <p className="text-[10px] font-bold text-surface-ink leading-tight">{badge.title}</p>
              {earned && earnedRow ? (
                <p className="text-[9px] text-amber-600 mt-0.5">{fmtDate(earnedRow.occurred_on)}</p>
              ) : (
                <p className="text-[9px] text-surface-muted mt-0.5">{badge.detail}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
