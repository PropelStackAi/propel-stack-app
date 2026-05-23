// ─── Social & Media Hub — Notification Inbox ─────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import { useState } from 'react';
import { useSocialInbox } from '../api';
import type { NotificationItem } from '../types';
import { SOCIAL_PLATFORMS } from '../types';

type FilterType = 'All' | 'DM' | 'Mention' | 'Like' | 'Comment';

function getPlatformEmoji(platformId: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === platformId)?.emoji ?? '🌐';
}

function typeStyles(type: NotificationItem['type']): string {
  switch (type) {
    case 'DM':      return 'bg-blue-100 text-blue-700';
    case 'Mention': return 'bg-purple-100 text-purple-700';
    case 'Like':    return 'bg-red-100 text-red-600';
    case 'Comment': return 'bg-gray-100 text-gray-600';
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface NotificationCardProps {
  item: NotificationItem;
  isRead: boolean;
}

function NotificationCard({ item, isRead }: NotificationCardProps): JSX.Element {
  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4 flex items-start gap-3">
      {/* Left: platform emoji + type badge */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <span className="text-xl">{getPlatformEmoji(item.platform)}</span>
        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${typeStyles(item.type)}`}>
          {item.type}
        </span>
      </div>

      {/* Center: sender + preview + timestamp */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-surface-ink text-sm">{item.sender}</p>
        <p className="text-xs text-surface-muted mt-0.5 leading-relaxed">
          {truncate(item.preview, 80)}
        </p>
        <p className="text-[10px] text-surface-muted mt-1">{timeAgo(item.timestamp)}</p>
      </div>

      {/* Right: unread dot + open link */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {!isRead && (
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        )}
        <a
          href={item.deep_link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-teal font-medium hover:underline"
        >
          Open →
        </a>
      </div>
    </div>
  );
}

export function NotificationInbox(): JSX.Element {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

  const { data: notifications = [], isLoading } = useSocialInbox();

  const filters: FilterType[] = ['All', 'DM', 'Mention', 'Like', 'Comment'];

  const filtered = notifications.filter((n) =>
    activeFilter === 'All' ? true : n.type === activeFilter
  );

  function handleMarkAllRead(): void {
    const ids = new Set(notifications.map((n) => n.id));
    setLocalReadIds(ids);
  }

  function isRead(item: NotificationItem): boolean {
    return item.read || localReadIds.has(item.id);
  }

  const unreadCount = notifications.filter((n) => !isRead(n)).length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={[
                'text-xs font-semibold rounded-full px-3 py-1 border transition-colors',
                activeFilter === f
                  ? 'bg-brand-teal text-white border-transparent'
                  : 'bg-surface-raised border-surface-ink/[0.06] text-surface-ink hover:bg-surface-sunk',
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-outline text-xs flex-shrink-0"
          >
            Mark All Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4 animate-pulse h-20"
              />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div className="bg-surface-sunk rounded-xl px-6 py-10 text-center">
            <p className="text-surface-muted text-sm">
              No notifications — connect social accounts to see activity.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <NotificationCard key={item.id} item={item} isRead={isRead(item)} />
          ))
        )}
      </div>
    </div>
  );
}
