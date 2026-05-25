/**
 * Morning Brief — Enhancement 7 (Structured AI Morning Briefing)
 *
 * Replaces the single-paragraph brief with a structured card:
 *   - Energizing headline
 *   - 3 top priorities for the day
 *   - Personalized insight (from memory context)
 *   - Motivational closing line
 */
import { Zap, Target, Lightbulb, Flame } from 'lucide-react';
import { useTodayBriefing, useRegenerateBriefing } from '../api';

export function MorningBrief() {
  const { data, isLoading } = useTodayBriefing();
  const regen = useRegenerateBriefing();

  if (isLoading) {
    return (
      <div className="card bg-gradient-to-br from-brand-indigo/[0.07] to-transparent animate-pulse">
        <div className="h-4 bg-surface-sunk rounded w-2/3 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-surface-sunk rounded w-full" />
          <div className="h-3 bg-surface-sunk rounded w-5/6" />
          <div className="h-3 bg-surface-sunk rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="card bg-gradient-to-br from-brand-indigo/[0.07] to-transparent">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Zap size={16} color="#4F35C2" />
          <h2 className="font-display font-bold text-base text-surface-ink">Morning brief</h2>
        </div>
        <button
          type="button"
          onClick={() => regen.mutate()}
          disabled={regen.isPending}
          className="btn-secondary !py-1 !text-xs disabled:opacity-50"
        >
          {regen.isPending ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Headline */}
      <p className="font-display font-bold text-lg text-brand-indigo leading-snug mb-4">
        {data.headline}
      </p>

      {/* Priorities */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Target size={13} color="#6B7280" />
          <span className="text-xs font-semibold text-surface-muted uppercase tracking-wide">
            Top priorities
          </span>
        </div>
        <ol className="space-y-1.5">
          {data.priorities.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-surface-ink">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-brand-indigo/10 text-brand-indigo text-xs font-bold grid place-items-center">
                {i + 1}
              </span>
              {p}
            </li>
          ))}
        </ol>
      </div>

      {/* Insight */}
      <div className="rounded-xl bg-teal-50 border border-teal-100 px-3 py-2.5 mb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Lightbulb size={13} color="#01696F" />
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
            Today's insight
          </span>
        </div>
        <p className="text-sm text-teal-900 leading-relaxed">{data.insight}</p>
      </div>

      {/* Motivation */}
      <div className="flex items-start gap-2">
        <Flame size={14} color="#F05A28" className="mt-0.5 flex-shrink-0" />
        <p className="text-sm text-surface-muted italic leading-relaxed">{data.motivation}</p>
      </div>

      {data.stub && (
        <p className="mt-3 text-[11px] text-surface-muted">
          Demo briefing — connect an AI provider key for live personalization.
        </p>
      )}
    </div>
  );
}
