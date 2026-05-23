import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  HealthAIResponse, HealthAppointment, HealthMetric, HealthProfile,
  Medication, MetricType, SymptomLog, SymptomPattern,
} from './types';

// HARD RULE #3: object form. HARD RULE #4: apiRequest returns parsed JSON.

const PROFILE_KEY   = ['health', 'profile'] as const;
const metricsKey    = (type?: string) => ['health', 'metrics', type ?? 'all'] as const;
const SYMPTOMS_KEY  = ['health', 'symptoms'] as const;
const PATTERNS_KEY  = ['health', 'patterns'] as const;
const MEDS_KEY      = ['health', 'medications'] as const;
const APPTS_KEY     = ['health', 'appointments'] as const;

// ── Profile ───────────────────────────────────────────────────────────────────

export function useHealthProfile() {
  return useQuery({ queryKey: PROFILE_KEY, queryFn: () => apiRequest<HealthProfile>('/api/health/profile') });
}

export function useUpdateHealthProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<{
      fullName: string; bloodType: string; allergies: string[]; conditions: string[];
      emergencyContactName: string; emergencyContactPhone: string; emergencyContactRelation: string; notes: string;
    }>) => apiRequest<HealthProfile>('/api/health/profile', { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export function useHealthMetrics(type?: MetricType) {
  return useQuery({
    queryKey: metricsKey(type),
    queryFn: () => apiRequest<HealthMetric[]>(`/api/health/metrics${type ? `?type=${type}` : '?days=30'}`),
  });
}

export function useAddMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { metricType: MetricType; value: number; value2?: number; unit?: string; notes?: string; measuredAt?: string }) =>
      apiRequest<HealthMetric>('/api/health/metrics', { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', 'metrics'] });
    },
  });
}

export function useDeleteMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/health/metrics/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health', 'metrics'] }),
  });
}

// ── Symptoms ──────────────────────────────────────────────────────────────────

export function useSymptoms() {
  return useQuery({ queryKey: SYMPTOMS_KEY, queryFn: () => apiRequest<SymptomLog[]>('/api/health/symptoms') });
}

export function useSymptomPatterns() {
  return useQuery({
    queryKey: PATTERNS_KEY,
    queryFn: () => apiRequest<{ patterns: SymptomPattern[] }>('/api/health/symptoms/patterns'),
  });
}

export function useLogSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { symptom: string; severity: number; durationHours?: number; notes?: string }) =>
      apiRequest<SymptomLog>('/api/health/symptoms', { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SYMPTOMS_KEY });
      qc.invalidateQueries({ queryKey: PATTERNS_KEY });
    },
  });
}

export function useDeleteSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/health/symptoms/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SYMPTOMS_KEY });
      qc.invalidateQueries({ queryKey: PATTERNS_KEY });
    },
  });
}

// ── Medications ────────────────────────────────────────────────────────────────

export function useMedications() {
  return useQuery({ queryKey: MEDS_KEY, queryFn: () => apiRequest<Medication[]>('/api/health/medications') });
}

export function useAddMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; dose?: string; frequency?: string; reminderTimes?: string[]; startDate?: string; notes?: string }) =>
      apiRequest<Medication>('/api/health/medications', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDS_KEY }),
  });
}

export function useUpdateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Partial<{ name: string; dose: string; frequency: string; active: boolean; notes: string }> }) =>
      apiRequest<Medication>(`/api/health/medications/${v.id}`, { method: 'PATCH', body: v.body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDS_KEY }),
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/health/medications/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDS_KEY }),
  });
}

// ── Appointments ───────────────────────────────────────────────────────────────

export function useAppointments() {
  return useQuery({ queryKey: APPTS_KEY, queryFn: () => apiRequest<HealthAppointment[]>('/api/health/appointments') });
}

export function useAddAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { doctorName: string; specialty?: string; appointmentDate: string; appointmentTime?: string; location?: string; notes?: string }) =>
      apiRequest<HealthAppointment>('/api/health/appointments', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPTS_KEY }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Partial<HealthAppointment> }) =>
      apiRequest<HealthAppointment>(`/api/health/appointments/${v.id}`, { method: 'PATCH', body: v.body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPTS_KEY }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/health/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPTS_KEY }),
  });
}

// ── AI Q&A ─────────────────────────────────────────────────────────────────────

export function useHealthAI() {
  return useMutation({
    mutationFn: (prompt: string) => apiRequest<HealthAIResponse>('/api/health/ai', { method: 'POST', body: { prompt } }),
  });
}

// ── Emergency card ─────────────────────────────────────────────────────────────

export interface EmergencyCard {
  user: { display_name: string; email: string } | null;
  profile: HealthProfile | null;
  medications: Array<{ name: string; dose: string; frequency: string }>;
  retrievedAt: string;
}

export function useEmergencyCard() {
  return useQuery({
    queryKey: ['health', 'emergency-card'],
    queryFn: () => apiRequest<EmergencyCard>('/api/health/emergency-card'),
    retry: 1,
  });
}
