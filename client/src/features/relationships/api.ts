// ─── Relationships & People Hub — API Hooks ───────────────────────────────────
// Enhancement 19 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { RelationshipContact, RelationshipInteraction, UpcomingEvent } from './types';

// ─── Contacts ─────────────────────────────────────────────────────────────────

export function useRelationshipContacts() {
  return useQuery({
    queryKey: ['rel-contacts'],
    queryFn: () => apiRequest<{ contacts: RelationshipContact[] }>('/api/relationships/contacts'),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RelationshipContact>) =>
      apiRequest<RelationshipContact>('/api/relationships/contacts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rel-contacts'] });
      qc.invalidateQueries({ queryKey: ['rel-overdue'] });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<RelationshipContact> & { id: string }) =>
      apiRequest<RelationshipContact>(`/api/relationships/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rel-contacts'] });
      qc.invalidateQueries({ queryKey: ['rel-overdue'] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/relationships/contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rel-contacts'] });
      qc.invalidateQueries({ queryKey: ['rel-overdue'] });
    },
  });
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export function useContactInteractions(contactId: string) {
  return useQuery({
    queryKey: ['rel-interactions', contactId],
    queryFn: () => apiRequest<{ interactions: RelationshipInteraction[] }>(`/api/relationships/contacts/${contactId}/interactions`),
    enabled: !!contactId,
  });
}

export function useLogInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, ...data }: { contactId: string; method: string; note?: string; occurred_on?: string }) =>
      apiRequest<{ ok: boolean }>(`/api/relationships/contacts/${contactId}/interactions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['rel-contacts'] });
      qc.invalidateQueries({ queryKey: ['rel-interactions', vars.contactId] });
      qc.invalidateQueries({ queryKey: ['rel-overdue'] });
    },
  });
}

// ─── Overdue & Upcoming ───────────────────────────────────────────────────────

export function useOverdueCheckIns() {
  return useQuery({
    queryKey: ['rel-overdue'],
    queryFn: () => apiRequest<{ overdue: RelationshipContact[] }>('/api/relationships/overdue'),
  });
}

export function useUpcomingEvents() {
  return useQuery({
    queryKey: ['rel-upcoming'],
    queryFn: () => apiRequest<{ upcoming: UpcomingEvent[] }>('/api/relationships/upcoming'),
  });
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

export function useRelationshipInsights() {
  return useMutation({
    mutationFn: () => apiRequest<{ insight: string }>('/api/relationships/insights', { method: 'POST' }),
  });
}
