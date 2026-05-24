// ─── Smart Notification Intelligence — API Hooks ─────────────────────────────
// Enhancement 17 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { NotificationEvent, NotificationPreference } from './types';

// ─── Feed ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<{ notifications: NotificationEvent[] }>('/api/notifications'),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => apiRequest<{ count: number }>('/api/notifications/unread-count'),
    refetchInterval: 60_000, // refresh every minute
  });
}

export function useMarkOpened() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/notifications/${id}/open`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useMarkAllOpened() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ ok: boolean }>('/api/notifications/open-all', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => apiRequest<{ preferences: NotificationPreference[] }>('/api/notifications/preferences'),
  });
}

export function useUpdatePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trigger_key, enabled }: { trigger_key: string; enabled: boolean }) =>
      apiRequest<{ ok: boolean }>('/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ trigger_key, enabled }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });
}

// ─── Nudge Engine ─────────────────────────────────────────────────────────────

export function useEvaluateNudges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ generated: NotificationEvent[]; reason?: string }>('/api/notifications/nudge', {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

// ─── Best Window ──────────────────────────────────────────────────────────────

export function useBestWindow() {
  return useQuery({
    queryKey: ['notif-window'],
    queryFn: () => apiRequest<{ best_hour: number; open_rate: number | null; has_data: boolean }>('/api/notifications/window'),
  });
}
