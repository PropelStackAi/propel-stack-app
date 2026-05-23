// ─── Social & Media Hub API Hooks ───────────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  SocialConnection, MediaConnection, SocialDigest, WatchlistTopic,
  NewsSource, NewsArticle, ScreenTimeEntry, ScheduledPost,
  FeedItem, NotificationItem, HubStats,
} from './types';

const BASE = '/api/social';

// ─── Hub Stats ───────────────────────────────────────────────────────────────

export function useSocialStats() {
  return useQuery<HubStats>({
    queryKey: ['social-stats'],
    queryFn: () => apiRequest(`${BASE}/stats`),
    staleTime: 60_000,
  });
}

// ─── Connections ─────────────────────────────────────────────────────────────

export function useSocialConnections() {
  return useQuery<SocialConnection[]>({
    queryKey: ['social-connections'],
    queryFn: () => apiRequest(`${BASE}/connections`),
  });
}

export function useConnectPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { platform: string; display_name?: string; avatar_url?: string }) =>
      apiRequest(`${BASE}/connect`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['social-connections'] });
      void qc.invalidateQueries({ queryKey: ['social-stats'] });
    },
  });
}

export function useDisconnectPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`${BASE}/disconnect/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['social-connections'] });
      void qc.invalidateQueries({ queryKey: ['social-stats'] });
    },
  });
}

// ─── Unified Feed ─────────────────────────────────────────────────────────────

export function useSocialFeed(platform?: string) {
  return useQuery<{ items: FeedItem[]; total: number; hasMore: boolean }>({
    queryKey: ['social-feed', platform],
    queryFn: () => apiRequest(`${BASE}/feed${platform ? `?platform=${platform}` : ''}`),
    staleTime: 60_000,
  });
}

// ─── Inbox ────────────────────────────────────────────────────────────────────

export function useSocialInbox() {
  return useQuery<NotificationItem[]>({
    queryKey: ['social-inbox'],
    queryFn: () => apiRequest(`${BASE}/inbox`),
    refetchInterval: 5 * 60 * 1000, // 5 min
  });
}

// ─── AI Digest ────────────────────────────────────────────────────────────────

export function useSocialDigest() {
  return useQuery<{ digest: SocialDigest; cached: boolean }>({
    queryKey: ['social-digest'],
    queryFn: () => apiRequest(`${BASE}/digest`),
    staleTime: 6 * 60 * 60 * 1000, // 6h
  });
}

export function useRegenerateDigest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest(`${BASE}/digest/regenerate`, { method: 'POST' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-digest'] }); },
  });
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export function useWatchlistTopics() {
  return useQuery<WatchlistTopic[]>({
    queryKey: ['social-watchlist'],
    queryFn: () => apiRequest(`${BASE}/watchlist`),
  });
}

export function useAddWatchlistTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { topic: string; alert_enabled?: boolean }) =>
      apiRequest(`${BASE}/watchlist`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-watchlist'] }); },
  });
}

export function useDeleteWatchlistTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`${BASE}/watchlist/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-watchlist'] }); },
  });
}

export function useToggleWatchlistAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alert_enabled }: { id: string; alert_enabled: boolean }) =>
      apiRequest(`${BASE}/watchlist/${id}`, { method: 'PATCH', body: JSON.stringify({ alert_enabled }) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-watchlist'] }); },
  });
}

// ─── News Sources & Feed ──────────────────────────────────────────────────────

export function useNewsSources() {
  return useQuery<NewsSource[]>({
    queryKey: ['social-news-sources'],
    queryFn: () => apiRequest(`${BASE}/news/sources`),
  });
}

export function useAddNewsSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { source_name: string; rss_url: string; bias_label?: string }) =>
      apiRequest(`${BASE}/news/sources`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-news-sources'] }); },
  });
}

export function useDeleteNewsSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`${BASE}/news/sources/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-news-sources'] }); },
  });
}

export function useToggleNewsSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiRequest(`${BASE}/news/sources/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-news-sources'] }); },
  });
}

export function useNewsFeed() {
  return useQuery<NewsArticle[]>({
    queryKey: ['social-news-feed'],
    queryFn: () => apiRequest(`${BASE}/news/feed`),
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

export function useArticleSummary() {
  return useMutation<{ summary: string }, Error, { title: string; text?: string }>({
    mutationFn: (data) => apiRequest(`${BASE}/news/summary`, { method: 'POST', body: JSON.stringify(data) }),
  });
}

// ─── Media Connections ────────────────────────────────────────────────────────

export function useMediaConnections() {
  return useQuery<{ connections: MediaConnection[]; catalog: { service: string; service_type: string; deep_link_url: string }[] }>({
    queryKey: ['social-media'],
    queryFn: () => apiRequest(`${BASE}/media`),
  });
}

export function useAddMediaConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { service: string; service_type?: string; deep_link_url?: string }) =>
      apiRequest(`${BASE}/media`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-media'] }); },
  });
}

export function useRemoveMediaConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`${BASE}/media/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-media'] }); },
  });
}

// ─── Scheduled Posts ─────────────────────────────────────────────────────────

export function useScheduledPosts() {
  return useQuery<ScheduledPost[]>({
    queryKey: ['social-posts'],
    queryFn: () => apiRequest(`${BASE}/posts`),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      platforms: string[]; content: string;
      media_urls?: string[]; scheduled_for?: string;
    }) => apiRequest(`${BASE}/posts`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-posts'] }); },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) =>
      apiRequest(`${BASE}/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-posts'] }); },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`${BASE}/posts/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-posts'] }); },
  });
}

export function usePublishPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`${BASE}/posts/${id}/publish`, { method: 'POST' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-posts'] }); },
  });
}

export function useDraftPostAI() {
  return useMutation<{ draft: string }, Error, { platform: string; topic: string; tone?: string }>({
    mutationFn: (data) => apiRequest(`${BASE}/posts/draft-ai`, { method: 'POST', body: JSON.stringify(data) }),
  });
}

// ─── Screen Time ─────────────────────────────────────────────────────────────

export function useScreenTimeWeekly() {
  return useQuery<{ weekly: ScreenTimeEntry[]; prev_week_total: number }>({
    queryKey: ['social-screen-time'],
    queryFn: () => apiRequest(`${BASE}/screen-time/weekly`),
  });
}

export function useLogScreenTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { platform: string; duration_seconds?: number }) =>
      apiRequest(`${BASE}/screen-time/log`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['social-screen-time'] }); },
  });
}
