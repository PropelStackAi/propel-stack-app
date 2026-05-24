// ─── WinsFeed.tsx — Chronological Life Wins feed ─────────────────────────────
// Session 16 — Propel Stack AI, LLC

import { useState } from 'react';
import { useLifeWins, useLifeWinHubs, useDeleteLifeWin } from '../api';
import { ManualWinForm } from './ManualWinForm';
import type { LifeWin } from '../types';

const WIN_TYPE_EMOJIS: Record<string, string> = {
  goal:    '🎯',
  streak:  '🔥',
  score:   '⭐',
  manual:  '✍️',
  badge:   '🏅',
  habit:   '✅',
};

const HUB_LABELS: Record<string, string> = {
  streaks:  'Streaks',
  athlete:  'Athlete',
  health:   'Health',
  finance:  'Finance',
  social:   'Social',
  manual:   'Manual',
  snfs:     'Family',
};

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function WinItem({ win, onDelete }: { win: LifeWin; onDelete: (id: string) => void }) {
  const emoji = WIN_TYPE_EMOJIS[win.win_type] ?? '🏆';
  const isManual = win.win_type === 'manual';

  return (
    <div className="flex gap-3 py-3 border-b border-surface-ink/[0.04] last:border-0">
      <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-lg shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-ink leading-snug">{win.title}</p>
        {win.detail && <p className="text-xs text-surface-muted mt-0.5">{win.detail}</p>}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-surface-muted">{fmtDate(win.occurred_on)}</span>
          {win.source_hub && (
            <span className="text-[10px] bg-surface-sunk text-surface-muted rounded-full px-2 py-0.5">
              {HUB_LABELS[win.source_hub] ?? win.source_hub}
            </span>
          )}
          {win.win_type === 'badge' && (
            <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
              Badge
            </span>
          )}
        </div>
      </div>
      {isManual && (
        <button
          type="button"
          onClick={() => onDelete(win.id)}
          className="text-surface-muted hover:text-red-500 text-xs px-1 shrink-0 self-start mt-1"
          title="Delete win"
        >
          ✕
        </button>
      )}
    </div>
  );
}

const PAGE_SIZE = 20;

export function WinsFeed() {
  const [selectedHub, setSelectedHub] = useState<string | undefined>(undefined);
  const [offset, setOffset] = useState(0);

  const { data: hubsData } = useLifeWinHubs();
  const { data, isLoading } = useLifeWins(selectedHub, PAGE_SIZE, offset);
  const deleteWin = useDeleteLifeWin();

  const wins = data?.wins ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const hubs = hubsData?.hubs ?? [];

  function handleHubChange(hub: string | undefined) {
    setSelectedHub(hub);
    setOffset(0);
  }

  return (
    <div className="space-y-4">
      {/* Manual win form */}
      <ManualWinForm />

      {/* Hub filter chips */}
      {hubs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          <button
            type="button"
            onClick={() => handleHubChange(undefined)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              !selectedHub ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'
            }`}
          >
            All
          </button>
          {hubs.map((hub) => (
            <button
              key={hub}
              type="button"
              onClick={() => handleHubChange(hub)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                selectedHub === hub ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'
              }`}
            >
              {HUB_LABELS[hub] ?? hub}
            </button>
          ))}
        </div>
      )}

      {/* Wins list */}
      <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-2xl px-4">
        {isLoading ? (
          <div className="py-6 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : wins.length === 0 ? (
          <div className="py-10 text-center text-surface-muted">
            <p className="text-2xl mb-2">🏆</p>
            <p className="text-sm">No life wins yet — they'll appear here automatically as you hit milestones.</p>
          </div>
        ) : (
          <div>
            {wins.map((win) => (
              <WinItem
                key={win.id}
                win={win}
                onDelete={(id) => deleteWin.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
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
      )}
    </div>
  );
}
