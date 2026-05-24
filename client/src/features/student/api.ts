// ─── Student Mode API Hooks ───────────────────────────────────────────────────
// Session 14 (Bug Fix) — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  Course,
  FlashcardDeck,
  Flashcard,
  StudentNote,
  StudentResource,
  TutorMessage,
} from './types';

// ─── Courses ──────────────────────────────────────────────────────────────────

export function useCourses() {
  return useQuery({
    queryKey: ['student-courses'],
    queryFn: () => apiRequest<{ courses: Course[] }>('/api/student/courses'),
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Course>) =>
      apiRequest<Course>('/api/student/courses', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-courses'] }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Course> & { id: string }) =>
      apiRequest<Course>(`/api/student/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-courses'] }),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/student/courses/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-courses'] }),
  });
}

// ─── Flashcard Decks ──────────────────────────────────────────────────────────

export function useDecks() {
  return useQuery({
    queryKey: ['student-decks'],
    queryFn: () => apiRequest<{ decks: FlashcardDeck[] }>('/api/student/decks'),
  });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; subject?: string; description?: string }) =>
      apiRequest<FlashcardDeck>('/api/student/decks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-decks'] }),
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/student/decks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-decks'] }),
  });
}

// ─── Flashcards ───────────────────────────────────────────────────────────────

export function useDeckCards(deckId: string | null) {
  return useQuery({
    queryKey: ['student-cards', deckId],
    queryFn: () =>
      apiRequest<{ cards: Flashcard[] }>(`/api/student/decks/${deckId}/cards`),
    enabled: !!deckId,
  });
}

export function useDueCards() {
  return useQuery({
    queryKey: ['student-cards-due'],
    queryFn: () => apiRequest<{ cards: Flashcard[] }>('/api/student/cards/due'),
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deckId, ...data }: { deckId: string; front: string; back: string }) =>
      apiRequest<Flashcard>(`/api/student/decks/${deckId}/cards`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['student-cards', vars.deckId] });
      qc.invalidateQueries({ queryKey: ['student-decks'] });
      qc.invalidateQueries({ queryKey: ['student-cards-due'] });
    },
  });
}

export function useReviewCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quality }: { id: string; quality: number }) =>
      apiRequest<{ ok: boolean; next_due: string; interval_days: number }>(
        `/api/student/cards/${id}/review`,
        { method: 'POST', body: JSON.stringify({ quality }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-cards-due'] });
      qc.invalidateQueries({ queryKey: ['student-decks'] });
    },
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/student/cards/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-cards-due'] });
      qc.invalidateQueries({ queryKey: ['student-decks'] });
    },
  });
}

// ─── Student Notes ────────────────────────────────────────────────────────────

export function useStudentNotes(docType?: string) {
  return useQuery({
    queryKey: ['student-notes', docType],
    queryFn: () =>
      apiRequest<{ notes: StudentNote[] }>(
        `/api/student/notes${docType ? `?type=${docType}` : ''}`,
      ),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StudentNote>) =>
      apiRequest<StudentNote>('/api/student/notes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-notes'] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<StudentNote> & { id: string }) =>
      apiRequest<StudentNote>(`/api/student/notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-notes'] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/student/notes/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-notes'] }),
  });
}

// ─── Resources ────────────────────────────────────────────────────────────────

export function useStudentResources(sourceType?: string) {
  return useQuery({
    queryKey: ['student-resources', sourceType],
    queryFn: () =>
      apiRequest<{ resources: StudentResource[] }>(
        `/api/student/resources${sourceType ? `?type=${sourceType}` : ''}`,
      ),
  });
}

export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StudentResource>) =>
      apiRequest<StudentResource>('/api/student/resources', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-resources'] }),
  });
}

export function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/student/resources/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-resources'] }),
  });
}

// ─── AI Tutor ─────────────────────────────────────────────────────────────────

export function useTutorChat() {
  return useMutation({
    mutationFn: ({
      messages,
      subject,
    }: {
      messages: TutorMessage[];
      subject?: string;
    }) =>
      apiRequest<{ reply: string }>('/api/student/tutor', {
        method: 'POST',
        body: JSON.stringify({ messages, subject }),
      }),
  });
}
