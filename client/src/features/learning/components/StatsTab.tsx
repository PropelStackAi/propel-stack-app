// ─── Stats & AI Tab ───────────────────────────────────────────────────────────
// Enhancement 20 — Propel Stack AI, LLC
// Monthly summary card + AI key takeaway extractor

import { useState } from 'react';
import { useLearningSummary, useTakeaways } from '../api';

function StatCard({ emoji, value, label, sub }: { emoji: string; value: number | string; label: string; sub?: string }) {
  return (
    <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 text-center space-y-0.5">
      <p className="text-2xl">{emoji}</p>
      <p className="text-xl font-bold text-surface-ink">{value}</p>
      <p className="text-xs font-semibold text-surface-muted">{label}</p>
      {sub && <p className="text-[10px] text-surface-muted">{sub}</p>}
    </div>
  );
}

export function StatsTab() {
  const { data: summary, isLoading } = useLearningSummary();
  const extractTakeaways = useTakeaways();

  const [notes, setNotes]           = useState('');
  const [takeaways, setTakeaways]   = useState<string[]>([]);
  const [showExtractor, setShowExtractor] = useState(false);

  function runExtractor() {
    extractTakeaways.mutate(notes, {
      onSuccess: (d) => setTakeaways(d.takeaways),
    });
  }

  const studyHours = summary ? Math.round(summary.study_minutes / 60 * 10) / 10 : 0;

  return (
    <div className="space-y-4">
      {/* Monthly summary */}
      <div>
        <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">This month</p>
        {isLoading ? (
          <p className="text-sm text-surface-muted text-center py-4">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatCard emoji="📗" value={summary?.books_finished ?? 0} label="Books finished" />
            <StatCard emoji="🎓" value={summary?.courses_completed ?? 0} label="Courses done" />
            <StatCard emoji="⏱️" value={`${studyHours}h`} label="Study time" />
            <StatCard emoji="📄" value={summary?.pages_read_month ?? 0} label="Pages read" />
            <StatCard emoji="📰" value={summary?.articles_saved ?? 0} label="Articles saved" />
            <StatCard
              emoji={summary?.life_score_active ? '🟢' : '🟡'}
              value={summary?.life_score_active ? 'Active' : 'Inactive'}
              label="Personal Dev"
              sub={summary?.life_score_active ? '1+ sessions this week' : 'No sessions this week'}
            />
          </div>
        )}
      </div>

      {/* Currently reading */}
      {summary?.currently_reading && summary.currently_reading.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">Currently reading</p>
          <div className="space-y-2">
            {summary.currently_reading.map((b) => {
              const pct = b.total_pages ? Math.min(100, Math.round((b.progress / b.total_pages) * 100)) : 0;
              const pagesLeft = b.total_pages ? b.total_pages - b.progress : null;
              const finishDays = pagesLeft && summary.pages_per_day > 0
                ? Math.ceil(pagesLeft / summary.pages_per_day)
                : null;
              return (
                <div key={b.id} className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-surface-ink">{b.title}</p>
                    {finishDays && (
                      <span className="text-[10px] text-brand-teal font-semibold">~{finishDays}d to finish</span>
                    )}
                  </div>
                  {b.total_pages ? (
                    <>
                      <div className="h-1.5 bg-surface-sunk rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-brand-teal rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-surface-muted">{b.progress} / {b.total_pages} pages · {pct}%</p>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Takeaway Extractor */}
      <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-surface-ink">🤖 AI Key Takeaway Extractor</p>
          <button type="button" onClick={() => setShowExtractor(!showExtractor)}
            className="text-xs text-surface-muted hover:text-surface-ink">
            {showExtractor ? 'Collapse' : 'Expand'}
          </button>
        </div>
        <p className="text-xs text-surface-muted leading-relaxed">
          Paste highlights or raw notes from any book, article, or course — the AI extracts 3 structured insights.
        </p>

        {showExtractor && (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste your highlights, notes, or key quotes here…"
              rows={6}
              className="w-full resize-none border border-surface-ink/10 rounded-lg px-3 py-2 text-sm"
            />
            <button type="button" onClick={runExtractor}
              disabled={extractTakeaways.isPending || !notes.trim()}
              className="text-xs bg-brand-indigo text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {extractTakeaways.isPending ? '🤖 Extracting…' : 'Extract 3 insights'}
            </button>

            {takeaways.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Your 3 key insights:</p>
                {takeaways.map((t, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="text-xs font-bold text-brand-indigo flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="text-sm text-surface-ink leading-relaxed">{t}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-surface-ink/[0.06] pt-2">
          <p className="text-[10px] text-surface-muted">
            🔒 Only your pasted text is sent to AI. Learning logs, progress, and item data are never included.
          </p>
        </div>
      </div>
    </div>
  );
}
