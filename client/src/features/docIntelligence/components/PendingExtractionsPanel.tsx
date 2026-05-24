// ─── Pending Extractions Panel ────────────────────────────────────────────────
// Enhancement 23 — Propel Stack AI, LLC
// Shown at the top of Document Vault when AI extractions are awaiting review.

import { useState } from 'react';
import { usePendingExtractions } from '../api';
import { ExtractionReviewCard } from './ExtractionReviewCard';

export function PendingExtractionsPanel() {
  const { data: pending = [], isLoading } = usePendingExtractions();
  const [expanded, setExpanded] = useState(true);

  if (isLoading || pending.length === 0) return null;

  return (
    <div className="rounded-xl border border-brand-indigo/20 bg-brand-indigo/[0.04] p-4 space-y-4">
      {/* Banner */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <div>
            <p className="text-sm font-semibold text-surface-ink">
              {pending.length} document{pending.length > 1 ? 's' : ''} ready to review
            </p>
            <p className="text-xs text-surface-muted">
              AI extracted structured data — confirm to populate your hubs
            </p>
          </div>
        </div>
        <span className="text-surface-muted text-xs flex-shrink-0">{expanded ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {/* Review cards */}
      {expanded && (
        <div className="space-y-3">
          {pending.map((extraction) => (
            <ExtractionReviewCard
              key={extraction.id}
              extraction={extraction}
              onDone={() => { /* query invalidation handled in useDismissExtraction/useConfirmExtraction */ }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
