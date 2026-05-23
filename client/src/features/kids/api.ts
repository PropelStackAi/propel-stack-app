import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { KidsAiResponse, KidsScreenTime, KidsStars, TtsResponse } from './types';

// HARD RULE #3: object form. HARD RULE #4: apiRequest returns parsed JSON.

const starsKey  = (id: string) => ['kids', 'stars', id] as const;
const timeKey   = (id: string) => ['kids', 'screen-time', id] as const;

// ── Queries ──────────────────────────────────────────────────────────────────

export function useKidsScreenTime(childId: string | null) {
  return useQuery({
    queryKey: childId ? timeKey(childId) : ['kids', 'screen-time', 'none'],
    queryFn: () => apiRequest<KidsScreenTime>(`/api/kids/screen-time/${childId}`),
    enabled: Boolean(childId),
    refetchInterval: 60_000, // keep in sync with server
  });
}

export function useKidsStars(childId: string | null) {
  return useQuery({
    queryKey: childId ? starsKey(childId) : ['kids', 'stars', 'none'],
    queryFn: () => apiRequest<KidsStars>(`/api/kids/stars/${childId}`),
    enabled: Boolean(childId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useTickScreenTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { childId: string; minutes?: number }) =>
      apiRequest<{ ok: boolean }>(`/api/kids/screen-time/${v.childId}/tick`, {
        method: 'POST',
        body: { minutes: v.minutes ?? 1 },
      }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: timeKey(v.childId) });
    },
  });
}

export function useAwardStars() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { childId: string; stars: number }) =>
      apiRequest<KidsStars>(`/api/kids/stars/${v.childId}/award`, { method: 'POST', body: { stars: v.stars } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: starsKey(v.childId) });
    },
  });
}

export function useHomeworkAI() {
  return useMutation({
    mutationFn: (v: { childId: string; prompt: string }) =>
      apiRequest<KidsAiResponse>('/api/kids/ai/homework', { method: 'POST', body: v }),
  });
}

export function useStoryAI() {
  return useMutation({
    mutationFn: (v: { childId: string; prompt: string }) =>
      apiRequest<KidsAiResponse>('/api/kids/ai/story', { method: 'POST', body: v }),
  });
}

export function useTTS() {
  return useMutation({
    mutationFn: (text: string) =>
      apiRequest<TtsResponse>('/api/kids/ai/tts', { method: 'POST', body: { text } }),
  });
}
