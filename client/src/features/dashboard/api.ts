import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type { Activity, Agenda, Brief, CaptureKind, Habit, SmartTask, StructuredBrief, Summary, Task, Weather, WeeklyReview } from './types';

// HARD RULE #3: object form. HARD RULE #4: apiRequest returns parsed JSON.

const K = {
  summary: ['dashboard', 'summary'] as const,
  agenda: ['dashboard', 'agenda'] as const,
  activity: ['dashboard', 'activity'] as const,
  brief: ['dashboard', 'brief'] as const,
  tasks: ['dashboard', 'tasks'] as const,
  habits: ['dashboard', 'habits'] as const,
};

export function useSummary() {
  return useQuery({ queryKey: K.summary, queryFn: () => apiRequest<Summary>('/api/dashboard/summary') });
}
export function useAgenda() {
  return useQuery({ queryKey: K.agenda, queryFn: () => apiRequest<Agenda>('/api/dashboard/agenda') });
}
export function useActivity() {
  return useQuery({ queryKey: K.activity, queryFn: () => apiRequest<Activity[]>('/api/dashboard/activity') });
}
export function useBrief() {
  return useQuery({ queryKey: K.brief, queryFn: () => apiRequest<Brief>('/api/dashboard/brief'), staleTime: 60 * 60_000 });
}

// Enhancement 9: Predictive smart tasks
export function useSmartTasks() {
  return useQuery({
    queryKey: ['briefing', 'smart-tasks'],
    queryFn: () => apiRequest<SmartTask[]>('/api/briefing/smart-tasks'),
    staleTime: 15 * 60_000, // refresh every 15 minutes
  });
}

// Enhancement 7: Structured morning briefing
export function useTodayBriefing() {
  return useQuery({
    queryKey: ['briefing', 'today'],
    queryFn: () => apiRequest<StructuredBrief>('/api/briefing/today'),
    staleTime: 60 * 60_000,
  });
}
export function useRegenerateBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<StructuredBrief>('/api/briefing/generate', { method: 'POST' }),
    onSuccess: (data) => qc.setQueryData(['briefing', 'today'], data),
  });
}

// Enhancement 8: Weekly life reviews
export function useWeeklyReview() {
  return useQuery({
    queryKey: ['briefing', 'weekly'],
    queryFn: () => apiRequest<WeeklyReview>('/api/briefing/weekly'),
    staleTime: 60 * 60_000,
  });
}
export function useWeeklyReviews() {
  return useQuery({
    queryKey: ['briefing', 'weekly-list'],
    queryFn: () => apiRequest<WeeklyReview[]>('/api/briefing/weekly/list'),
    staleTime: 60 * 60_000,
  });
}
export function useRegenerateWeeklyReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<WeeklyReview>('/api/briefing/generate-weekly', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['briefing', 'weekly'] });
      qc.invalidateQueries({ queryKey: ['briefing', 'weekly-list'] });
    },
  });
}
export function useWeather(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: ['dashboard', 'weather', lat, lon],
    queryFn: () => apiRequest<Weather>(`/api/dashboard/weather?lat=${lat}&lon=${lon}`),
    enabled: lat != null && lon != null,
    staleTime: 30 * 60_000,
  });
}

export function useTasks() {
  return useQuery({ queryKey: K.tasks, queryFn: () => apiRequest<Task[]>('/api/dashboard/tasks') });
}
export function useHabits() {
  return useQuery({ queryKey: K.habits, queryFn: () => apiRequest<Habit[]>('/api/dashboard/habits') });
}

function useDashInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['contacts'] });
    qc.invalidateQueries({ queryKey: ['financial'] });
  };
}

export function useToggleTask() {
  const invalidate = useDashInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiRequest<Task>(`/api/dashboard/tasks/${id}/toggle`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}
export function useDeleteTask() {
  const invalidate = useDashInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/dashboard/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useAddHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiRequest<Habit[]>('/api/dashboard/habits', { method: 'POST', body: { name } }),
    onSuccess: (data) => qc.setQueryData(K.habits, data),
  });
}
export function useToggleHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<Habit[]>(`/api/dashboard/habits/${id}/toggle`, { method: 'POST' }),
    onSuccess: (data) => qc.setQueryData(K.habits, data),
  });
}
export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/dashboard/habits/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.habits }),
  });
}

export function useQuickCapture() {
  const invalidate = useDashInvalidate();
  return useMutation({
    mutationFn: (body: { kind: CaptureKind; text: string; amount?: number }) =>
      apiRequest<{ ok: boolean; kind: string }>('/api/dashboard/capture', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}
