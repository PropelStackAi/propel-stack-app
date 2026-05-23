// ─── Athlete Feature API Hooks ──────────────────────────────────────────────
// Session 13 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  AthleteProfile, TrainingPlan, TrainingSession,
  NutritionLog, RecoveryLog, AthletePR,
} from './types';

const BASE = '/api/athlete';

// ─── Profile ────────────────────────────────────────────────────────────────

export function useAthleteProfile() {
  return useQuery<AthleteProfile | null>({
    queryKey: ['athlete-profile'],
    queryFn: () => apiRequest(`${BASE}/profile`),
  });
}

export function useSaveAthleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest(`${BASE}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['athlete-profile'] }); },
  });
}

export function useDismissDisclaimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest(`${BASE}/profile/dismiss-disclaimer`, { method: 'POST' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['athlete-profile'] }); },
  });
}

// ─── Plans ──────────────────────────────────────────────────────────────────

export function useActivePlan() {
  return useQuery<TrainingPlan | null>({
    queryKey: ['athlete-active-plan'],
    queryFn: () => apiRequest(`${BASE}/plans/active`),
  });
}

export function useGeneratePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest(`${BASE}/plans/generate`, { method: 'POST' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['athlete-active-plan'] }); },
  });
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export function useTrainingSessions() {
  return useQuery<TrainingSession[]>({
    queryKey: ['athlete-sessions'],
    queryFn: () => apiRequest(`${BASE}/sessions`),
  });
}

export function useLogSession() {
  const qc = useQueryClient();
  return useMutation<{ session: TrainingSession; newPRs: AthletePR[] }, Error, Record<string, unknown>>({
    mutationFn: (data) => apiRequest(`${BASE}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['athlete-sessions'] });
      void qc.invalidateQueries({ queryKey: ['athlete-prs'] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`${BASE}/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['athlete-sessions'] }); },
  });
}

// ─── Nutrition ──────────────────────────────────────────────────────────────

export function useNutritionLogs() {
  return useQuery<NutritionLog[]>({
    queryKey: ['athlete-nutrition'],
    queryFn: () => apiRequest(`${BASE}/nutrition`),
  });
}

export function useLogNutrition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest(`${BASE}/nutrition`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['athlete-nutrition'] }); },
  });
}

export function useDeleteNutritionLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`${BASE}/nutrition/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['athlete-nutrition'] }); },
  });
}

// ─── Recovery ───────────────────────────────────────────────────────────────

export function useRecoveryLogs() {
  return useQuery<RecoveryLog[]>({
    queryKey: ['athlete-recovery'],
    queryFn: () => apiRequest(`${BASE}/recovery`),
  });
}

export function useLogRecovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest(`${BASE}/recovery`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['athlete-recovery'] }); },
  });
}

// ─── PRs ────────────────────────────────────────────────────────────────────

export function useAthletePRs() {
  return useQuery<AthletePR[]>({
    queryKey: ['athlete-prs'],
    queryFn: () => apiRequest(`${BASE}/prs`),
  });
}

// ─── AI Ask ─────────────────────────────────────────────────────────────────

export function useAthleteAsk() {
  return useMutation<{ answer: string; injuryDetected?: boolean; critical?: boolean }, Error, { question: string }>({
    mutationFn: (data) => apiRequest(`${BASE}/ai/ask`, { method: 'POST', body: JSON.stringify(data) }),
  });
}
