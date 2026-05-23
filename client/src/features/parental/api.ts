import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { AiUsageData, ChildProfile, ScreenTimeStatus } from './types';

// HARD RULE #3: object form. HARD RULE #4: apiRequest returns parsed JSON.

const LIST_KEY = ['parental', 'children'] as const;
const childKey = (id: string) => ['parental', 'children', id] as const;
const usageKey = (id: string) => ['parental', 'usage', id] as const;
const timeKey  = (id: string) => ['parental', 'screen-time', id] as const;

function useInvalidate() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: LIST_KEY });
    if (id) {
      qc.invalidateQueries({ queryKey: childKey(id) });
      qc.invalidateQueries({ queryKey: usageKey(id) });
      qc.invalidateQueries({ queryKey: timeKey(id) });
    }
  };
}

// ── Queries ─────────────────────────────────────────────────────────────────

export function useChildren() {
  return useQuery({ queryKey: LIST_KEY, queryFn: () => apiRequest<ChildProfile[]>('/api/parental/children') });
}

export function useChildUsage(childId: string | null) {
  return useQuery({
    queryKey: childId ? usageKey(childId) : ['parental', 'usage', 'none'],
    queryFn: () => apiRequest<AiUsageData>(`/api/parental/children/${childId}/usage`),
    enabled: Boolean(childId),
  });
}

export function useChildScreenTime(childId: string | null) {
  return useQuery({
    queryKey: childId ? timeKey(childId) : ['parental', 'screen-time', 'none'],
    queryFn: () => apiRequest<ScreenTimeStatus>(`/api/parental/children/${childId}/screen-time`),
    enabled: Boolean(childId),
    refetchInterval: 60_000, // refresh every minute
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface CreateChildBody {
  name: string;
  avatarEmoji?: string;
  ageRange?: 'child' | 'tween';
  screenTimeLimitMinutes?: number;
}

export function useCreateChild() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: CreateChildBody) =>
      apiRequest<ChildProfile>('/api/parental/children', { method: 'POST', body }),
    onSuccess: () => invalidate(),
  });
}

export type UpdateChildBody = Partial<{
  name: string;
  avatarEmoji: string;
  ageRange: 'child' | 'tween';
  contentFilter: boolean;
  aiLoggingEnabled: boolean;
  screenTimeLimitMinutes: number;
  appSectionsApproved: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}>;

export function useUpdateChild() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; body: UpdateChildBody }) =>
      apiRequest<ChildProfile>(`/api/parental/children/${v.id}`, { method: 'PATCH', body: v.body }),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}

export function useDeleteChild() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/parental/children/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(),
  });
}

export function useSetPin() {
  return useMutation({
    mutationFn: (v: { childId: string; pin: string }) =>
      apiRequest<{ ok: boolean }>(`/api/parental/children/${v.childId}/pin`, { method: 'POST', body: { pin: v.pin } }),
  });
}

export function useVerifyPin() {
  return useMutation({
    mutationFn: (v: { childId: string; pin: string }) =>
      apiRequest<{ ok: boolean }>(`/api/parental/children/${v.childId}/pin/verify`, { method: 'POST', body: { pin: v.pin } }),
  });
}
