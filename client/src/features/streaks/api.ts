// ─── Streaks & Life Wins — API Hooks ─────────────────────────────────────────
// Session 16 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { StreaksResponse, LifeWinsResponse, Streak, LifeWin, HubsResponse } from './types';

// ─── Streaks ──────────────────────────────────────────────────────────────────

export function useStreaks() {
  return useQuery<StreaksResponse>({
    queryKey: ['streaks'],
    queryFn: () => apiRequest('/api/streaks'),
    staleTime: 60_000,
  });
}

export function useTouchStreak() {
  const qc = useQueryClient();
  return useMutation<{ streak: Streak }, Error, { streak_type: string; habit_id?: string }>({
    mutationFn: (data) =>
      apiRequest('/api/streaks/touch', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['streaks'] });
      void qc.invalidateQueries({ queryKey: ['life-wins'] });
    },
  });
}

export function useStreakBadges() {
  return useQuery<{ badges: LifeWin[] }>({
    queryKey: ['streak-badges'],
    queryFn: () => apiRequest('/api/streaks/badges'),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Life Wins ────────────────────────────────────────────────────────────────

export function useLifeWins(hub?: string, limit = 20, offset = 0) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (hub) params.set('hub', hub);
  return useQuery<LifeWinsResponse>({
    queryKey: ['life-wins', hub, limit, offset],
    queryFn: () => apiRequest(`/api/life-wins?${params}`),
    staleTime: 60_000,
  });
}

export function useLifeWinHubs() {
  return useQuery<HubsResponse>({
    queryKey: ['life-wins-hubs'],
    queryFn: () => apiRequest('/api/life-wins/hubs'),
    staleTime: 5 * 60_000,
  });
}

export function useAddLifeWin() {
  const qc = useQueryClient();
  return useMutation<LifeWin, Error, { title: string; detail?: string; occurred_on?: string }>({
    mutationFn: (data) =>
      apiRequest('/api/life-wins', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['life-wins'] });
      void qc.invalidateQueries({ queryKey: ['life-wins-hubs'] });
    },
  });
}

export function useToggleShare() {
  const qc = useQueryClient();
  return useMutation<LifeWin, Error, { id: string; is_shared: boolean }>({
    mutationFn: ({ id, is_shared }) =>
      apiRequest(`/api/life-wins/${id}/share`, { method: 'PATCH', body: JSON.stringify({ is_shared }) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['life-wins'] }); },
  });
}

export function useDeleteLifeWin() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (id) => apiRequest(`/api/life-wins/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['life-wins'] }); },
  });
}
