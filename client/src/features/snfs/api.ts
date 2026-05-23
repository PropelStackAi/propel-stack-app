import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { SnfsConversation, SnfsMessage, CareTeamMember, CrisisPlan, ProgressLog } from './types';

// ── Disclaimer ─────────────────────────────────────────────────────────────

export function useSnfsDisclaimer() {
  return useQuery({
    queryKey: ['snfs-disclaimer'],
    queryFn: () => apiRequest<{ acknowledged: boolean; acknowledgedAt: string | null; version: string }>('/api/snfs/disclaimer'),
  });
}

export function useAcknowledgeDisclaimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ acknowledged: boolean }>('/api/snfs/disclaimer', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snfs-disclaimer'] }),
  });
}

// ── Conversations ──────────────────────────────────────────────────────────

export function useSnfsConversations() {
  return useQuery({
    queryKey: ['snfs-conversations'],
    queryFn: () => apiRequest<SnfsConversation[]>('/api/snfs/conversations'),
    retry: 1,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; careRecipientName?: string }) =>
      apiRequest<SnfsConversation>('/api/snfs/conversations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snfs-conversations'] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/snfs/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snfs-conversations'] }),
  });
}

// ── Messages ───────────────────────────────────────────────────────────────

export function useSnfsMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['snfs-messages', conversationId],
    queryFn: () => apiRequest<SnfsMessage[]>(`/api/snfs/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}

export function useSendSnfsMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      apiRequest<{ crisis: boolean; content: string; id: string }>(
        `/api/snfs/conversations/${conversationId}/messages`,
        { method: 'POST', body: JSON.stringify({ content }) },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['snfs-messages', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['snfs-conversations'] });
    },
  });
}

// ── Care Team ──────────────────────────────────────────────────────────────

export function useCareTeam() {
  return useQuery({
    queryKey: ['snfs-care-team'],
    queryFn: () => apiRequest<CareTeamMember[]>('/api/snfs/care-team'),
  });
}

export function useAddCareTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CareTeamMember, 'id' | 'user_id' | 'created_at'>) =>
      apiRequest<CareTeamMember>('/api/snfs/care-team', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snfs-care-team'] }),
  });
}

export function useUpdateCareTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CareTeamMember> & { id: string }) =>
      apiRequest<CareTeamMember>(`/api/snfs/care-team/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snfs-care-team'] }),
  });
}

export function useDeleteCareTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/snfs/care-team/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snfs-care-team'] }),
  });
}

// ── Crisis Plan ────────────────────────────────────────────────────────────

export function useCrisisPlan() {
  return useQuery({
    queryKey: ['snfs-crisis-plan'],
    queryFn: () => apiRequest<CrisisPlan | null>('/api/snfs/crisis-plan'),
  });
}

export function useSaveCrisisPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      careRecipientName?: string; triggers?: string[]; warningSigns?: string[];
      calmingStrategies?: string[]; escalationSteps?: string[]; emergencyContacts?: string[];
      safePerson?: string; safePlace?: string; notes?: string;
    }) => apiRequest<CrisisPlan>('/api/snfs/crisis-plan', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snfs-crisis-plan'] }),
  });
}

// ── Progress Logs ──────────────────────────────────────────────────────────

export function useProgressLogs() {
  return useQuery({
    queryKey: ['snfs-progress'],
    queryFn: () => apiRequest<ProgressLog[]>('/api/snfs/progress'),
  });
}

export function useAddProgressLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { careRecipientName?: string; goal: string; logDate: string; rating?: number; notes?: string }) =>
      apiRequest<ProgressLog>('/api/snfs/progress', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snfs-progress'] }),
  });
}

export function useDeleteProgressLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/snfs/progress/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snfs-progress'] }),
  });
}
