// ─── Personal Finance Hub — API Hooks ────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  FinanceAccount, FinanceTransaction, FinanceBudget,
  FinanceBill, FinanceSavingsGoal, NetWorthItem, SpendSummary,
} from './types';

// ─── Accounts ─────────────────────────────────────────────────────────────────

export function useFinanceAccounts() {
  return useQuery({
    queryKey: ['fin-accounts'],
    queryFn: () => apiRequest<{ accounts: FinanceAccount[] }>('/api/personal-finance/accounts'),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FinanceAccount>) =>
      apiRequest<FinanceAccount>('/api/personal-finance/accounts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-accounts'] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<FinanceAccount> & { id: string }) =>
      apiRequest<FinanceAccount>(`/api/personal-finance/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/personal-finance/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-accounts'] }),
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function useFinanceTransactions(filters?: { account_id?: string; category?: string; start_date?: string; end_date?: string }) {
  const params = new URLSearchParams();
  if (filters?.account_id) params.set('account_id', filters.account_id);
  if (filters?.category)   params.set('category', filters.category);
  if (filters?.start_date) params.set('start_date', filters.start_date);
  if (filters?.end_date)   params.set('end_date', filters.end_date);
  const qs = params.toString();
  return useQuery({
    queryKey: ['fin-transactions', filters],
    queryFn: () => apiRequest<{ transactions: FinanceTransaction[] }>(`/api/personal-finance/transactions${qs ? '?' + qs : ''}`),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FinanceTransaction>) =>
      apiRequest<FinanceTransaction>('/api/personal-finance/transactions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-transactions'] });
      qc.invalidateQueries({ queryKey: ['fin-summary'] });
      qc.invalidateQueries({ queryKey: ['fin-budgets'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/personal-finance/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-transactions'] });
      qc.invalidateQueries({ queryKey: ['fin-summary'] });
      qc.invalidateQueries({ queryKey: ['fin-budgets'] });
    },
  });
}

// ─── Spend Summary ────────────────────────────────────────────────────────────

export function useSpendSummary(start_date?: string, end_date?: string) {
  const params = new URLSearchParams();
  if (start_date) params.set('start_date', start_date);
  if (end_date)   params.set('end_date', end_date);
  const qs = params.toString();
  return useQuery({
    queryKey: ['fin-summary', start_date, end_date],
    queryFn: () => apiRequest<SpendSummary>(`/api/personal-finance/summary${qs ? '?' + qs : ''}`),
  });
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

export function useFinanceBudgets() {
  return useQuery({
    queryKey: ['fin-budgets'],
    queryFn: () => apiRequest<{ budgets: FinanceBudget[] }>('/api/personal-finance/budgets'),
  });
}

export function useSetBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; monthly_amt: number }) =>
      apiRequest<FinanceBudget>('/api/personal-finance/budgets', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-budgets'] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/personal-finance/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-budgets'] }),
  });
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export function useFinanceBills() {
  return useQuery({
    queryKey: ['fin-bills'],
    queryFn: () => apiRequest<{ bills: FinanceBill[] }>('/api/personal-finance/bills'),
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FinanceBill>) =>
      apiRequest<FinanceBill>('/api/personal-finance/bills', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-bills'] }),
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<FinanceBill> & { id: string }) =>
      apiRequest<{ ok: boolean }>(`/api/personal-finance/bills/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-bills'] }),
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/personal-finance/bills/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-bills'] }),
  });
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export function useSavingsGoals() {
  return useQuery({
    queryKey: ['fin-savings'],
    queryFn: () => apiRequest<{ goals: FinanceSavingsGoal[] }>('/api/personal-finance/savings-goals'),
  });
}

export function useCreateSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FinanceSavingsGoal>) =>
      apiRequest<FinanceSavingsGoal>('/api/personal-finance/savings-goals', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-savings'] }),
  });
}

export function useUpdateSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<FinanceSavingsGoal> & { id: string }) =>
      apiRequest<{ ok: boolean }>(`/api/personal-finance/savings-goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-savings'] }),
  });
}

export function useDeleteSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/personal-finance/savings-goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-savings'] }),
  });
}

// ─── Net Worth ────────────────────────────────────────────────────────────────

export function useNetWorth() {
  return useQuery({
    queryKey: ['fin-networth'],
    queryFn: () => apiRequest<{ items: NetWorthItem[]; total_assets: number; total_liabilities: number; net_worth: number }>('/api/personal-finance/net-worth'),
  });
}

export function useCreateNetWorthItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NetWorthItem>) =>
      apiRequest<NetWorthItem>('/api/personal-finance/net-worth', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-networth'] }),
  });
}

export function useUpdateNetWorthItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<NetWorthItem> & { id: string }) =>
      apiRequest<{ ok: boolean }>(`/api/personal-finance/net-worth/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-networth'] }),
  });
}

export function useDeleteNetWorthItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/personal-finance/net-worth/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-networth'] }),
  });
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export function useSpendInsights() {
  return useMutation({
    mutationFn: () => apiRequest<{ insight: string }>('/api/personal-finance/insights', { method: 'POST' }),
  });
}
