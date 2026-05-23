// ─── Social & Media Hub — Unified Feed ───────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import { useState } from 'react';
import { useSocialFeed, useSocialConnections } from '../api';
import type { FeedItem } from '../types';
import { SOCIAL_PLATFORMS } from '../types';

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function getPlatformEmoji(platformId: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === platformId)?.emoji ?? '🌐';
}

function getPlatformColor(platformId: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === platformId)?.color ?? 'bg-gray-500';
}

function FeedCard({ item }: { item: FeedItem }): JSX.Element {
  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold text-white rounded-full px-2 py-0.5 ${getPlatformColor(item.platform)}`}
        >
          {getPlatformEmoji(item.platform)} {item.platform}
        </span>
        <span className="text-xs font-semibold text-surface-ink truncate flex-1">{item.author}</span>
        <span className="text-xs text-surface-muted flex-shrink-0">{timeAgo(item.timestamp)}</span>
      </div>

      <p className="text-sm text-surface-ink line-clamp-3 leading-relaxed">{item.content}</p>

      <div className="flex items-center gap-4 pt-1">
        <span className="text-xs text-surface-muted">❤️ {item.likes.toLocaleString()}</span>
        <span className="text-xs text-surface-muted">💬 {item.comments.toLocaleString()}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-brand-teal font-medium hover:underline"
        >
          Open post →
        </a>
      </div>
    </div>
  );
}

function SkeletonCard(): JSX.Element {
  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="ml-auto h-4 w-12 bg-gray-100 rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-full bg-gray-100 rounded" />
        <div className="h-3.5 w-5/6 bg-gray-100 rounded" />
        <div className="h-3.5 w-3/4 bg-gray-100 rounded" />
      </div>
      <div className="flex gap-4 pt-1">
        <div className="h-3 w-12 bg-gray-100 rounded" />
        <div className="h-3 w-12 bg-gray-100 rounded" />
        <div className="ml-auto h-3 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function UnifiedFeed(): JSX.Element {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const { data: connectionsData = [], isLoading: connectionsLoading } = useSocialConnections();
  const platformFilter = activeFilter === 'all' ? undefined : activeFilter;
  const { data: feedData, isLoading: feedLoading } = useSocialFeed(platformFilter);

  const connectedPlatforms = connectionsData
    .filter((c) => c.is_active)
    .map((c) => c.platform)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  const isLoading = connectionsLoading || feedLoading;
  const items: FeedItem[] = feedData?.items ?? [];

  const filterChips = [
    { id: 'all', label: 'All' },
    ...connectedPlatforms.map((id) => ({
      id,
      label: SOCIAL_PLATFORMS.find((p) => p.id === id)?.label ?? id,
    })),
  ];

  if (!connectionsLoading && connectedPlatforms.length === 0) {
    return (
      <div className="bg-surface-sunk rounded-xl px-6 py-12 text-center">
        <p className="text-surface-muted text-sm">Connect social accounts to see your unified feed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            className={[
              'text-xs font-semibold rounded-full px-3 py-1 border transition-colors',
              activeFilter === chip.id
                ? 'bg-brand-teal text-white border-transparent'
                : 'bg-surface-raised border-surface-ink/[0.06] text-surface-ink hover:bg-surface-sunk',
            ].join(' ')}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Feed list */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : items.length === 0 ? (
          <div className="bg-surface-sunk rounded-xl px-6 py-10 text-center">
            <p className="text-surface-muted text-sm">No posts found for this filter.</p>
          </div>
        ) : (
          items.map((item) => <FeedCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
