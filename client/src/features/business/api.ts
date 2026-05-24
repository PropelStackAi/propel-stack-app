// ─── Business Hub API Hooks ───────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  BusinessClient,
  BusinessProject,
  BusinessInvoice,
  BusinessExpense,
  BusinessMetrics,
} from './types';

// ─── Clients ──────────────────────────────────────────────────────────────────

export function useBusinessClients() {
  return useQuery({
    queryKey: ['biz-clients'],
    queryFn: () => apiRequest<{ clients: BusinessClient[] }>('/api/business/clients'),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BusinessClient>) =>
      apiRequest<BusinessClient>('/api/business/clients', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biz-clients'] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<BusinessClient> & { id: string }) =>
      apiRequest<BusinessClient>(`/api/business/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biz-clients'] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/business/clients/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biz-clients'] }),
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function useBusinessProjects() {
  return useQuery({
    queryKey: ['biz-projects'],
    queryFn: () => apiRequest<{ projects: BusinessProject[] }>('/api/business/projects'),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BusinessProject>) =>
      apiRequest<BusinessProject>('/api/business/projects', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biz-projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<BusinessProject> & { id: string }) =>
      apiRequest<BusinessProject>(`/api/business/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biz-projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/business/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biz-projects'] }),
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useBusinessInvoices() {
  return useQuery({
    queryKey: ['biz-invoices'],
    queryFn: () => apiRequest<{ invoices: BusinessInvoice[] }>('/api/business/invoices'),
  });
}

export type CreateInvoicePayload = Omit<Partial<BusinessInvoice>, 'items'> & {
  items?: Array<{ description: string; quantity: number; unit_price: number }>;
};

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoicePayload) =>
      apiRequest<BusinessInvoice>('/api/business/invoices', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biz-invoices'] });
      qc.invalidateQueries({ queryKey: ['biz-metrics'] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest<BusinessInvoice>(`/api/business/invoices/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biz-invoices'] });
      qc.invalidateQueries({ queryKey: ['biz-metrics'] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/business/invoices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biz-invoices'] });
      qc.invalidateQueries({ queryKey: ['biz-metrics'] });
    },
  });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export function useBusinessExpenses() {
  return useQuery({
    queryKey: ['biz-expenses'],
    queryFn: () => apiRequest<{ expenses: BusinessExpense[] }>('/api/business/expenses'),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BusinessExpense>) =>
      apiRequest<BusinessExpense>('/api/business/expenses', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biz-expenses'] });
      qc.invalidateQueries({ queryKey: ['biz-metrics'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/business/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biz-expenses'] });
      qc.invalidateQueries({ queryKey: ['biz-metrics'] });
    },
  });
}

// ─── Metrics & Insights ───────────────────────────────────────────────────────

export function useBusinessMetrics() {
  return useQuery({
    queryKey: ['biz-metrics'],
    queryFn: () => apiRequest<BusinessMetrics>('/api/business/metrics'),
  });
}

export function useBusinessInsights() {
  return useMutation({
    mutationFn: () => apiRequest<{ insight: string; snapshot: unknown }>('/api/business/insights', { method: 'POST' }),
  });
}
