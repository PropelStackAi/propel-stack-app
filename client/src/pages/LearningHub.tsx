// ─── Learning Hub ─────────────────────────────────────────────────────────────
// Enhancement 20 — Propel Stack AI, LLC

import { useState } from 'react';
import { BooksTab }       from '../features/learning/components/BooksTab';
import { CoursesTab }     from '../features/learning/components/CoursesTab';
import { PodcastsTab }    from '../features/learning/components/PodcastsTab';
import { ArticleVaultTab } from '../features/learning/components/ArticleVaultTab';
import { StatsTab }       from '../features/learning/components/StatsTab';
import { useLearningSummary } from '../features/learning/api';

type Tab = 'books' | 'courses' | 'podcasts' | 'articles' | 'stats';

export function LearningHub(): JSX.Element {
  const [tab, setTab] = useState<Tab>('books');
  const { data: summary } = useLearningSummary();

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'books',    label: 'Books',    emoji: '📗' },
    { id: 'courses',  label: 'Courses',  emoji: '🎓' },
    { id: 'podcasts', label: 'Podcasts', emoji: '🎙️' },
    { id: 'articles', label: 'Articles', emoji: '📰' },
    { id: 'stats',    label: 'Stats & AI', emoji: '📊' },
  ];

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          📚 Learning Hub
        </h2>
        <p className="text-xs text-surface-muted">
          Track books, courses, podcasts, and articles. Turn passive consumption into logged growth.
        </p>
      </div>

      {/* Life score badge */}
      {summary && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
          summary.life_score_active
            ? 'bg-green-50 border border-green-100 text-green-700'
            : 'bg-yellow-50 border border-yellow-100 text-yellow-700'
        }`}>
          <span>{summary.life_score_active ? '🟢' : '🟡'}</span>
          <span>
            Personal Development:{' '}
            {summary.life_score_active
              ? 'Active — at least 1 session logged this week'
              : 'Log a learning session this week to keep Personal Dev green'}
          </span>
        </div>
      )}

      {/* Tab strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              tab === t.id
                ? 'bg-brand-indigo text-white'
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
        {tab === 'books'    && <BooksTab pagesPerDay={summary?.pages_per_day ?? 0} />}
        {tab === 'courses'  && <CoursesTab />}
        {tab === 'podcasts' && <PodcastsTab />}
        {tab === 'articles' && <ArticleVaultTab />}
        {tab === 'stats'    && <StatsTab />}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI · Learning Hub · Contributes to Personal Development in your Life Score.
      </p>
    </div>
  );
}
