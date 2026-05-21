import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { Conversation, ConversationDetail, Mode, Model, Usage } from './types';

// HARD RULE #3: object form. HARD RULE #4: apiRequest returns parsed JSON.
// Streaming responses use EventSource (see ChatView), not apiRequest.

const LIST_KEY = ['assistant', 'conversations'] as const;
const USAGE_KEY = ['assistant', 'usage'] as const;
const detailKey = (id: string) => ['assistant', 'conversation', id] as const;

export function useConversations() {
  return useQuery({ queryKey: LIST_KEY, queryFn: () => apiRequest<Conversation[]>('/api/assistant/conversations') });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: id ? detailKey(id) : ['assistant', 'conversation', 'none'],
    queryFn: () => apiRequest<ConversationDetail>(`/api/assistant/conversations/${id}`),
    enabled: Boolean(id),
  });
}

export function useUsage() {
  return useQuery({ queryKey: USAGE_KEY, queryFn: () => apiRequest<Usage>('/api/assistant/usage') });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; model?: Model; mode?: Mode }) =>
      apiRequest<Conversation>('/api/assistant/conversations', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: { title?: string; model?: Model; mode?: Mode } }) =>
      apiRequest<Conversation>(`/api/assistant/conversations/${v.id}`, { method: 'PATCH', body: v.body }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: detailKey(v.id) });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/assistant/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useRateMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { messageId: string; rating: number }) =>
      apiRequest<{ id: string; rating: number }>(`/api/assistant/messages/${v.messageId}/rate`, {
        method: 'POST',
        body: { rating: v.rating },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: detailKey(conversationId) }),
  });
}

/** Query keys exposed so the streaming code can invalidate after a response completes. */
export const assistantKeys = { list: LIST_KEY, usage: USAGE_KEY, detail: detailKey };
