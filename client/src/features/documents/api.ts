import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { DocumentCategory, DocumentFull, DocumentMeta } from './types';

// HARD RULE #3: object form. HARD RULE #4: apiRequest returns parsed JSON.

const LIST_KEY = ['documents'] as const;
const detailKey = (id: string) => ['documents', id] as const;

export interface UploadBody {
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileType: string;
  fileSize: number;
  data: string;
  expiryDate: string | null;
  tags: string[];
}
export interface UpdateBody {
  title: string;
  category: DocumentCategory;
  expiryDate: string | null;
  tags: string[];
}

export function useDocuments() {
  return useQuery({ queryKey: LIST_KEY, queryFn: () => apiRequest<DocumentMeta[]>('/api/documents') });
}

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: id ? detailKey(id) : ['documents', 'none'],
    queryFn: () => apiRequest<DocumentFull>(`/api/documents/${id}`),
    enabled: Boolean(id),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: LIST_KEY });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useUploadDocument() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: UploadBody) => apiRequest<DocumentMeta>('/api/documents', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateBody }) =>
      apiRequest<DocumentMeta>(`/api/documents/${v.id}`, { method: 'PATCH', body: v.body }),
    onSuccess: (_d, v) => {
      invalidate();
      qc.invalidateQueries({ queryKey: detailKey(v.id) });
    },
  });
}

export function useDeleteDocument() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/documents/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useSummarize(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ aiSummary: string; stub: boolean }>(`/api/documents/${id}/summarize`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useShareDocument(id: string) {
  return useMutation({
    mutationFn: () => apiRequest<{ token: string; path: string; expiresAt: string }>(`/api/documents/${id}/share`, { method: 'POST' }),
  });
}
