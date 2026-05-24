// ─── Learning Hub API ─────────────────────────────────────────────────────────
// Enhancement 20 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { LearningItem, LearningSummary } from './types';

// ─── Items ────────────────────────────────────────────────────────────────────

export function useLearningItems(type?: string, status?: string) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (status) params.set('status', status);
  const qs = params.size ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: ['learning-items', type ?? '', status ?? ''],
    queryFn: () => apiRequest<{ items: LearningItem[] }>(`/api/learning/items${qs}`),
  });
}

export function useCreateLearningItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LearningItem>) =>
      apiRequest<{ item: LearningItem }>('/api/learning/items', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning-items'] }),
  });
}

export function useUpdateLearningItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<LearningItem> & { id: string }) =>
      apiRequest<{ item: LearningItem }>(`/api/learning/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learning-items'] });
      qc.invalidateQueries({ queryKey: ['learning-summary'] });
    },
  });
}

export function useDeleteLearningItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/learning/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning-items'] }),
  });
}

// ─── Session logs ─────────────────────────────────────────────────────────────

export function useLogLearningSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      item_id: string;
      duration_minutes?: number;
      pages_read?: number;
      notes?: string;
      logged_date?: string;
    }) =>
      apiRequest('/api/learning/logs', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learning-items'] });
      qc.invalidateQueries({ queryKey: ['learning-summary'] });
    },
  });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function useLearningSummary() {
  return useQuery({
    queryKey: ['learning-summary'],
    queryFn: () => apiRequest<LearningSummary>('/api/learning/summary'),
  });
}

// ─── AI features ──────────────────────────────────────────────────────────────

export function useArticleSummary() {
  return useMutation({
    mutationFn: (data: { url?: string; text?: string }) =>
      apiRequest<{ summary: string }>('/api/learning/article-summary', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useTakeaways() {
  return useMutation({
    mutationFn: (notes: string) =>
      apiRequest<{ takeaways: string[] }>('/api/learning/takeaways', {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
  });
}
