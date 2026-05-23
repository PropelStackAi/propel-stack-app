// ─── PastRecaps.tsx ───────────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useState } from 'react';
import { useRecapHistory } from '../api';
import { RecapCard } from './RecapCard';
import type { WeeklyRecap } from '../types';

const PAGE_SIZE = 5;

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function weekLabel(recap: WeeklyRecap): string {
  const end = new Date(recap.week_start + 'T12:00:00Z');
  end.setUTCDate(end.getUTCDate() + 6);
  return `${fmtDate(recap.week_start)} – ${fmtDate(end.toISOString().slice(0, 10))}`;
}

export function PastRecaps() {
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useRecapHistory(PAGE_SIZE, offset);
  const recaps = data?.recaps ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (recaps.length === 0) {
    return (
      <div className="text-center py-10 text-surface-muted text-sm">
        <p className="text-2xl mb-2">📭</p>
        <p>No past recaps yet — your first recap will appear here after generation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-surface-ink">Past Recaps</h3>
        <span className="text-xs text-surface-muted">{total} total</span>
      </div>

      {/* Recap rows */}
      {recaps.map((recap) => (
        <div key={recap.id} className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl overflow-hidden">
          {/* Collapsed row */}
          <button
            type="button"
            onClick={() => setExpanded(expanded === recap.id ? null : recap.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-sunk/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">{recap.opened_at ? '📋' : '🔴'}</span>
              <div>
                <p className="text-xs font-semibold text-surface-ink">{weekLabel(recap)}</p>
                <p className="text-[10px] text-surface-muted">
                  {recap.insight_key !== 'general' ? recap.insight_key.replace('-', ' & ') : 'General recap'}
                  {recap.next_week_intention ? ' · Intentions set' : ''}
                </p>
              </div>
            </div>
            <span className={`text-surface-muted text-xs transition-transform ${expanded === recap.id ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {/* Expanded recap card */}
          {expanded === recap.id && (
            <div className="px-4 pb-4">
              <RecapCard recap={recap} isNew={false} />
            </div>
          )}
        </div>
      ))}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          disabled={offset === 0}
          className="btn-outline text-xs py-1.5 px-3 disabled:opacity-40"
        >
          ← Newer
        </button>
        <span className="text-xs text-surface-muted">
          {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
        </span>
        <button
          type="button"
          onClick={() => setOffset(offset + PAGE_SIZE)}
          disabled={!hasMore}
          className="btn-outline text-xs py-1.5 px-3 disabled:opacity-40"
        >
          Older →
        </button>
      </div>
    </div>
  );
}
