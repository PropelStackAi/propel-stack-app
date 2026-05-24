// ─── Relationships & People Hub ───────────────────────────────────────────────
// Enhancement 19 — Propel Stack AI, LLC

import { useState } from 'react';
import { PeopleTab }      from '../features/relationships/components/PeopleTab';
import { OverdueTab }     from '../features/relationships/components/OverdueTab';
import { UpcomingTab }    from '../features/relationships/components/UpcomingTab';
import { RelInsightsTab } from '../features/relationships/components/RelInsightsTab';
import { useOverdueCheckIns, useUpcomingEvents } from '../features/relationships/api';

type Tab = 'people' | 'overdue' | 'upcoming' | 'insights';

export function RelationshipsHub(): JSX.Element {
  const [tab, setTab] = useState<Tab>('people');
  const { data: overdueData } = useOverdueCheckIns();
  const { data: upcomingData } = useUpcomingEvents();

  const overdueCount = overdueData?.overdue.length ?? 0;
  const upcomingCount = upcomingData?.upcoming.length ?? 0;

  const TABS: { id: Tab; label: string; emoji: string; badge?: number }[] = [
    { id: 'people',   label: 'My Circle',  emoji: '👥' },
    { id: 'overdue',  label: 'Overdue',    emoji: '⏰', badge: overdueCount  },
    { id: 'upcoming', label: 'Upcoming',   emoji: '📅', badge: upcomingCount },
    { id: 'insights', label: 'Insights',   emoji: '🤖' },
  ];

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          👥 Relationships & People
        </h2>
        <p className="text-xs text-surface-muted">
          Stay consistently connected with the people who matter most. No guilt — just gentle reminders.
        </p>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative',
              tab === t.id
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`text-[9px] font-bold px-1 rounded-full ${tab === t.id ? 'bg-white/30 text-white' : 'bg-orange-400 text-white'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'people'   && <PeopleTab />}
        {tab === 'overdue'  && <OverdueTab />}
        {tab === 'upcoming' && <UpcomingTab />}
        {tab === 'insights' && <RelInsightsTab />}
      </div>

      {/* Privacy footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI · Relationships Hub · All relationship data is private by default.
        Never shared with employers, businesses, or third parties.
      </p>
    </div>
  );
}
