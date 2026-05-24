// ─── Notification Feed ────────────────────────────────────────────────────────
// Enhancement 17 — Propel Stack AI, LLC

import { useNotifications, useMarkOpened, useMarkAllOpened, useEvaluateNudges } from '../api';
import type { NotificationEvent, NotifType } from '../types';

const TYPE_META: Record<NotifType, { emoji: string; color: string }> = {
  streak:   { emoji: '⚡', color: 'bg-orange-50 border-orange-100' },
  recap:    { emoji: '📋', color: 'bg-blue-50 border-blue-100'   },
  nudge:    { emoji: '👋', color: 'bg-teal-50 border-teal-100'   },
  coach:    { emoji: '🎯', color: 'bg-purple-50 border-purple-100' },
  reminder: { emoji: '💡', color: 'bg-yellow-50 border-yellow-100' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationCard({ notif, onOpen }: { notif: NotificationEvent; onOpen: () => void }) {
  const meta = TYPE_META[notif.notif_type] ?? { emoji: '🔔', color: 'bg-gray-50 border-gray-100' };
  const isUnread = !notif.opened_at;

  return (
    <div
      onClick={onOpen}
      className={[
        'flex gap-3 p-3 rounded-xl border cursor-pointer transition-all',
        meta.color,
        isUnread ? 'shadow-sm' : 'opacity-70',
      ].join(' ')}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold text-surface-ink leading-tight ${isUnread ? '' : 'font-medium'}`}>
            {notif.title}
          </p>
          {isUnread && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-teal mt-1" />
          )}
        </div>
        <p className="text-xs text-surface-muted mt-0.5 leading-relaxed">{notif.body}</p>
        <p className="text-[10px] text-surface-muted mt-1 uppercase tracking-wide">{timeAgo(notif.sent_at)}</p>
      </div>
    </div>
  );
}

export function NotificationFeed(): JSX.Element {
  const { data, isLoading } = useNotifications();
  const markOpened = useMarkOpened();
  const markAll = useMarkAllOpened();
  const evaluate = useEvaluateNudges();

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.opened_at).length;

  if (isLoading) {
    return <p className="text-sm text-surface-muted text-center py-8">Loading notifications…</p>;
  }

  return (
    <div className="space-y-3">
      {/* Actions bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-surface-ink">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-brand-teal text-white px-2 py-0.5 rounded-full font-semibold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="text-xs text-surface-muted hover:text-surface-ink"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={() => evaluate.mutate()}
            disabled={evaluate.isPending}
            className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
          >
            {evaluate.isPending ? 'Checking…' : 'Check for nudges'}
          </button>
        </div>
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-2xl">🔕</p>
          <p className="text-sm text-surface-muted">No notifications yet.</p>
          <p className="text-xs text-surface-muted">
            Tap "Check for nudges" to see if there are any smart alerts for you.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notif={n}
              onOpen={() => {
                if (!n.opened_at) markOpened.mutate(n.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Adaptive timing note */}
      {notifications.length >= 5 && (
        <p className="text-[10px] text-surface-muted text-center pt-2">
          🧠 Propel Stack AI learns when you're most responsive and adapts nudge timing over time.
        </p>
      )}
    </div>
  );
}
