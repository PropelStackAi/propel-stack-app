import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  BirthdayEntry,
  Contact,
  ContactInput,
  ContactInteraction,
  ContactWithInteractions,
  ExtractBusinessCardResult,
  InteractionInput,
} from './types';

// HARD RULE #3: object form. HARD RULE #4: apiRequest returns parsed JSON.

const KEYS = {
  all: ['contacts'] as const,
  detail: (id: string) => ['contacts', id] as const,
  followUps: ['contacts', 'meta', 'follow-ups'] as const,
  birthdays: ['contacts', 'meta', 'birthdays'] as const,
};

export function useContacts() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => apiRequest<Contact[]>('/api/contacts'),
  });
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: id ? KEYS.detail(id) : ['contacts', 'none'],
    queryFn: () => apiRequest<ContactWithInteractions>(`/api/contacts/${id}`),
    enabled: Boolean(id),
  });
}

export function useFollowUps() {
  return useQuery({
    queryKey: KEYS.followUps,
    queryFn: () => apiRequest<Contact[]>('/api/contacts/meta/follow-ups'),
  });
}

export function useBirthdays() {
  return useQuery({
    queryKey: KEYS.birthdays,
    queryFn: () => apiRequest<BirthdayEntry[]>('/api/contacts/meta/birthdays'),
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEYS.all });
    qc.invalidateQueries({ queryKey: KEYS.followUps });
    qc.invalidateQueries({ queryKey: KEYS.birthdays });
  };
}

export function useCreateContact() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: ContactInput) =>
      apiRequest<Contact>('/api/contacts', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContactInput }) =>
      apiRequest<Contact>(`/api/contacts/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (data) => {
      invalidate();
      qc.invalidateQueries({ queryKey: KEYS.detail(data.id) });
    },
  });
}

export function useDeleteContact() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/contacts/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useAddInteraction(contactId: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: InteractionInput) =>
      apiRequest<ContactInteraction>(`/api/contacts/${contactId}/interactions`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: KEYS.detail(contactId) });
    },
  });
}

export function useDeleteInteraction(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interactionId: string) =>
      apiRequest<null>(`/api/contacts/${contactId}/interactions/${interactionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(contactId) }),
  });
}

// ---- one-shot helpers (not hooks) ----

export function extractBusinessCard(image: string) {
  return apiRequest<ExtractBusinessCardResult>('/api/contacts/extract-card', {
    method: 'POST',
    body: { image },
  });
}

export function suggestCategory(title: string, company: string) {
  return apiRequest<{ category: Contact['category']; contactType: Contact['contactType'] }>(
    '/api/contacts/suggest-category',
    { method: 'POST', body: { title, company } },
  );
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ index: number; error: string }>;
}

export function importContacts(contacts: ContactInput[]) {
  return apiRequest<ImportResult>('/api/contacts/import', {
    method: 'POST',
    body: { contacts },
  });
}
