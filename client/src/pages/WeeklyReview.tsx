/**
 * Weekly Life Review — Propel Stack AI, LLC
 * Enhancement 8: AI-Generated Weekly Life Review
 *
 * Shows this week's AI narrative review plus a history of past weeks.
 * Covers: what was accomplished, what shifted, what to focus on next.
 */
import { BookOpen, CheckCircle2, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { useWeeklyReview, useWeeklyReviews, useRegenerateWeeklyReview } from '../features/dashboard/api';
import type { WeeklyReview as WeeklyReviewType } from '../features/dashboard/types';

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00Z');
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

function ReviewCard({ review, current = false }: { review: WeeklyReviewType; current?: boolean }) {
  return (
    <div className={`card ${current ? 'border-brand-indigo/20 bg-gradient-to-br from-brand-indigo/[0.04] to-transparent' : ''}`}>
      {/* Week label */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-surface-muted uppercase tracking-wide font-semibold mb-0.5">
            {current ? 'This week' : 'Week of'}
          </p>
          <p className="font-display font-bold text-base text-surface-ink">
            {formatWeekRange(review.weekStart)}
          </p>
        </div>
        {current && (
          <span className="badge" style={{ background: 'rgba(79,53,194,0.1)', color: '#4F35C2' }}>
            Current
          </span>
        )}
      </div>

      {/* Narrative */}
      <p className="text-sm text-surface-ink leading-relaxed mb-4">{review.narrative}</p>

      {/* Highlights */}
      {review.highlights.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">
            Highlights
          </p>
          <ul className="space-y-1.5">
            {review.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-surface-ink">
                <CheckCircle2 size={14} color="#01696F" className="mt-0.5 flex-shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Focus Next */}
      {review.focusNext && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowRight size={13} color="#92400e" />
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
              Focus next week
            </span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{review.focusNext}</p>
        </div>
      )}

      {review.stub && (
        <p className="mt-3 text-[11px] text-surface-muted">
          Demo review — connect an AI provider key for personalized insights.
        </p>
      )}
    </div>
  );
}

function CurrentWeekSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-3 bg-surface-sunk rounded w-24 mb-2" />
      <div className="h-5 bg-surface-sunk rounded w-48 mb-4" />
      <div className="space-y-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-3 bg-surface-sunk rounded" style={{ width: `${85 - i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}

export function WeeklyReview() {
  const { data: current, isLoading: currentLoading } = useWeeklyReview();
  const { data: history, isLoading: histLoading } = useWeeklyReviews();
  const regen = useRegenerateWeeklyReview();

  const pastReviews = (history ?? []).filter(
    (r) => current && r.weekStart !== current.weekStart,
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">
            Weekly Life Review
          </h1>
          <p className="text-surface-muted text-sm mt-1">
            AI-generated insights on your week — what happened, what shifted, what's next.
          </p>
        </div>
        <button
          type="button"
          onClick={() => regen.mutate()}
          disabled={regen.isPending}
          className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw size={14} className={regen.isPending ? 'animate-spin' : ''} />
          {regen.isPending ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

      {/* Hero — current week */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} color="#4F35C2" />
          <h2 className="font-display font-semibold text-base text-surface-ink">This week's review</h2>
        </div>
        {currentLoading ? (
          <CurrentWeekSkeleton />
        ) : current ? (
          <ReviewCard review={current} current />
        ) : (
          <div className="card text-center py-10">
            <BookOpen size={32} color="#9CA3AF" className="mx-auto mb-3" />
            <p className="text-surface-muted text-sm">No review yet for this week.</p>
            <button
              type="button"
              onClick={() => regen.mutate()}
              disabled={regen.isPending}
              className="btn-primary mt-4 text-sm"
            >
              Generate now
            </button>
          </div>
        )}
      </div>

      {/* History */}
      {!histLoading && pastReviews.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-base text-surface-ink mb-3">
            Past reviews
          </h2>
          <div className="space-y-4">
            {pastReviews.map((r) => (
              <ReviewCard key={r.weekStart} review={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
