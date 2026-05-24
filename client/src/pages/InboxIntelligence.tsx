/**
 * Inbox Intelligence — Smart notification inbox
 * Propel Stack AI, LLC
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Notification {
  id: string;
  notif_type: string;
  title: string;
  body: string;
  sent_at: string;
  opened_at: string | null;
}

type FilterTab = 'all' | 'unread' | 'insights' | 'reminders' | 'system';

const AI_INSIGHT_TYPES = ['life_score_drop', 'goal_deadline', 'finance_spike', 'recap_unread'];
const REMINDER_TYPES = ['streak_at_risk', 'no_mood_log'];

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    life_score_drop: '📉',
    streak_at_risk: '🔥',
    recap_unread: '📋',
    goal_deadline: '🎯',
    finance_spike: '💸',
    no_mood_log: '😐',
    absence: '👻',
  };
  return icons[type] ?? '🔔';
}

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function filterNotifications(notifications: Notification[], tab: FilterTab): Notification[] {
  switch (tab) {
    case 'unread':
      return notifications.filter(n => n.opened_at === null);
    case 'insights':
      return notifications.filter(n => AI_INSIGHT_TYPES.includes(n.notif_type));
    case 'reminders':
      return notifications.filter(n => REMINDER_TYPES.includes(n.notif_type));
    case 'system':
      return notifications.filter(
        n => !AI_INSIGHT_TYPES.includes(n.notif_type) && !REMINDER_TYPES.includes(n.notif_type)
      );
    default:
      return notifications;
  }
}

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'insights', label: 'AI Insights' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'system', label: 'System' },
];

export function InboxIntelligence() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<Notification[]>('/api/notifications'),
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['notifications-unread-count'],
    queryFn: () => apiRequest<{ count: number }>('/api/notifications/unread-count'),
  });

  const openOneMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: true }>(`/api/notifications/${id}/open`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const openAllMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ ok: true }>('/api/notifications/open-all', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  function handleCardClick(n: Notification) {
    if (n.opened_at === null) {
      openOneMutation.mutate(n.id);
    }
  }

  const unreadCount = unreadData?.count ?? notifications.filter(n => n.opened_at === null).length;
  const filtered = filterNotifications(notifications, activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold text-surface-ink">Smart Inbox</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-brand-indigo text-white text-xs font-bold px-1.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['notifications'] })}
            className="btn-secondary text-sm"
            title="Refresh"
          >
            ↻ Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => openAllMutation.mutate()}
              disabled={openAllMutation.isPending}
              className="btn-primary text-sm"
            >
              {openAllMutation.isPending ? 'Marking…' : 'Mark All Read'}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTER_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-shrink-0 text-sm py-1.5 px-3 rounded-lg font-medium transition-all ${
              activeTab === t.id
                ? 'bg-brand-indigo text-white'
                : 'bg-surface-sunk text-surface-muted hover:text-surface-ink'
            }`}
          >
            {t.label}
            {t.id === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-white/20 text-xs rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card animate-pulse flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-sunk flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-surface-sunk rounded w-3/4 mb-2" />
                <div className="h-3 bg-surface-sunk rounded w-full mb-1" />
                <div className="h-3 bg-surface-sunk rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-3">📬</div>
          <p className="font-medium text-surface-ink">You're all caught up.</p>
          <p className="text-sm text-surface-muted mt-1">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const isUnread = n.opened_at === null;
            return (
              <div
                key={n.id}
                onClick={() => handleCardClick(n)}
                className={`card cursor-pointer transition-all hover:shadow-raised flex gap-3 ${
                  isUnread
                    ? 'border-l-4 border-l-brand-indigo'
                    : 'opacity-70'
                }`}
              >
                <div className="text-2xl flex-shrink-0 mt-0.5">{typeIcon(n.notif_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-medium text-surface-ink ${isUnread ? 'font-semibold' : ''}`}>
                      {n.title}
                    </span>
                    <span className="text-xs text-surface-muted flex-shrink-0">
                      {formatTimeAgo(n.sent_at)}
                    </span>
                  </div>
                  <p className="text-sm text-surface-muted mt-0.5 leading-snug">{n.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
