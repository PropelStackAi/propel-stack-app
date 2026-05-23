import { useState } from 'react';
import type { ChildProfile } from '../types';
import { AGE_RANGE_LABELS } from '../types';
import { useDeleteChild } from '../api';
import { SafetyToggles } from './SafetyToggles';
import { ScreenTimeSetter } from './ScreenTimeSetter';
import { AIUsageSummary } from './AIUsageSummary';

interface Props {
  child: ChildProfile;
}

type Tab = 'safety' | 'time' | 'usage';

export function ChildProfileCard({ child }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('safety');
  const deleteChild = useDeleteChild();

  const sections = JSON.parse(child.app_sections_approved) as string[];

  return (
    <div className="rounded-2xl border border-surface-ink/10 bg-surface-raised shadow-sm overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-surface-sunk transition-colors"
      >
        <span className="text-4xl leading-none">{child.avatar_emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-lg text-surface-ink">{child.name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="chip text-xs">{AGE_RANGE_LABELS[child.age_range]}</span>
            <span className="chip text-xs">{child.screen_time_limit_minutes} min/day</span>
            {sections.length > 0 && (
              <span className="chip text-xs">{sections.length} section{sections.length !== 1 ? 's' : ''} approved</span>
            )}
          </div>
        </div>
        <span className="text-surface-muted text-lg">{open ? '▾' : '▸'}</span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-surface-ink/[0.06]">
          {/* Tabs */}
          <div className="flex border-b border-surface-ink/[0.06]">
            {(['safety', 'time', 'usage'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'flex-1 py-2.5 text-sm font-semibold transition-colors',
                  tab === t
                    ? 'text-brand-purple border-b-2 border-brand-purple -mb-px bg-brand-purple/5'
                    : 'text-surface-muted hover:text-surface-ink',
                ].join(' ')}
              >
                {t === 'safety' ? '🔒 Safety' : t === 'time' ? '⏱ Screen Time' : '📊 AI Usage'}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'safety' && <SafetyToggles child={child} />}
            {tab === 'time'   && <ScreenTimeSetter child={child} />}
            {tab === 'usage'  && <AIUsageSummary childId={child.id} loggingEnabled={child.ai_logging_enabled === 1} />}
          </div>

          {/* Danger zone */}
          <div className="px-5 pb-5">
            <button
              onClick={() => {
                if (window.confirm(`Remove ${child.name}'s profile? This cannot be undone.`)) {
                  deleteChild.mutate(child.id);
                }
              }}
              className="text-xs text-red-500 hover:text-red-700 underline"
              disabled={deleteChild.isPending}
            >
              Remove {child.name}'s profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
