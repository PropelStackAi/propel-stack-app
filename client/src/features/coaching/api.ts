// ─── AI Life Coach API ────────────────────────────────────────────────────────
// Enhancement 22 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { CoachingInsight, CoachingPreferences } from './types';

const BASE = '/api/coaching';

export function useCoachingInsight() {
  return useQuery({
    queryKey: ['coaching-insight'],
    queryFn: () => apiRequest<{ insight: CoachingInsight | null }>(`${BASE}/insights`),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useCoachingHistory() {
  return useQuery({
    queryKey: ['coaching-history'],
    queryFn: () => apiRequest<{ insights: CoachingInsight[] }>(`${BASE}/insights?history=true`),
  });
}

export function useCoachingPreferences() {
  return useQuery({
    queryKey: ['coaching-prefs'],
    queryFn: () => apiRequest<{ preferences: CoachingPreferences }>(`${BASE}/preferences`),
  });
}

export function useUpdateCoachingPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CoachingPreferences>) =>
      apiRequest<{ preferences: CoachingPreferences }>(`${BASE}/preferences`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coaching-prefs'] }),
  });
}

export function useGenerateInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ insight?: CoachingInsight; skipped?: string; next_in_hours?: number }>(`${BASE}/generate`, {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coaching-insight'] });
      qc.invalidateQueries({ queryKey: ['coaching-history'] });
    },
  });
}

export function useOpenInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`${BASE}/insights/${id}/open`, { method: 'POST', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coaching-insight'] }),
  });
}

export function useDismissInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dismiss_type }: { id: string; dismiss_type: 'once' | 'permanent_type' }) =>
      apiRequest(`${BASE}/insights/${id}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ dismiss_type }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coaching-insight'] });
      qc.invalidateQueries({ queryKey: ['coaching-history'] });
    },
  });
}
