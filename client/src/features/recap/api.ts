// ─── AI Weekly Life Recap — API Hooks ────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  RecapCurrentResponse,
  RecapGenerateResponse,
  RecapHistoryResponse,
  UnreadCountResponse,
  NextWeekPayload,
  WeeklyRecap,
} from './types';

const BASE = '/api/recap';

// ─── Current Week Recap ───────────────────────────────────────────────────────

export function useCurrentRecap() {
  return useQuery<RecapCurrentResponse>({
    queryKey: ['recap-current'],
    queryFn: () => apiRequest(`${BASE}/current`),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// ─── Generate Recap ───────────────────────────────────────────────────────────

export function useGenerateRecap() {
  const qc = useQueryClient();
  return useMutation<RecapGenerateResponse>({
    mutationFn: () => apiRequest(`${BASE}/generate`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recap-current'] });
      void qc.invalidateQueries({ queryKey: ['recap-unread'] });
    },
  });
}

// ─── History ─────────────────────────────────────────────────────────────────

export function useRecapHistory(limit = 10, offset = 0) {
  return useQuery<RecapHistoryResponse>({
    queryKey: ['recap-history', limit, offset],
    queryFn: () => apiRequest(`${BASE}/history?limit=${limit}&offset=${offset}`),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Unread Count ─────────────────────────────────────────────────────────────

export function useRecapUnreadCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: ['recap-unread'],
    queryFn: () => apiRequest(`${BASE}/unread-count`),
    staleTime: 60_000,
  });
}

// ─── Save Next Week Setup ─────────────────────────────────────────────────────

export function useSaveNextWeek() {
  const qc = useQueryClient();
  return useMutation<WeeklyRecap, Error, { id: string } & NextWeekPayload>({
    mutationFn: ({ id, ...payload }) =>
      apiRequest(`${BASE}/${id}/next-week`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recap-current'] });
      void qc.invalidateQueries({ queryKey: ['recap-history'] });
    },
  });
}

// ─── Mark Opened ─────────────────────────────────────────────────────────────

export function useMarkOpened() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (id: string) =>
      apiRequest(`${BASE}/${id}/open`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recap-current'] });
      void qc.invalidateQueries({ queryKey: ['recap-unread'] });
    },
  });
}
