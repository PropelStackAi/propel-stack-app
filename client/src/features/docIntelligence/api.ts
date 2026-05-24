// ─── Smart Document Intelligence API ─────────────────────────────────────────
// Enhancement 23 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { DocExtraction } from './types';

const BASE = '/api/doc-intelligence';

export function usePendingExtractions() {
  return useQuery({
    queryKey: ['doc-extractions-pending'],
    queryFn: () => apiRequest<DocExtraction[]>(`${BASE}/pending`),
    staleTime: 30_000,
  });
}

export function useAnalyzeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) =>
      apiRequest<DocExtraction>(`${BASE}/analyze/${docId}`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-extractions-pending'] });
    },
  });
}

export function useConfirmExtraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields?: Record<string, unknown> }) =>
      apiRequest<{ ok: boolean; actions_taken: string[] }>(`${BASE}/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ fields: fields ?? {} }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-extractions-pending'] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      // Invalidate hub caches that may have been populated
      qc.invalidateQueries({ queryKey: ['home-property'] });
      qc.invalidateQueries({ queryKey: ['personal-finance'] });
    },
  });
}

export function useDismissExtraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`${BASE}/${id}/dismiss`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-extractions-pending'] });
    },
  });
}
