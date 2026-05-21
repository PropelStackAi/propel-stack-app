import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';
import type {
  AskResponse,
  Bill,
  BillInput,
  BudgetCategory,
  BudgetCategoryInput,
  DisclaimerStatus,
  Goal,
  GoalInput,
  Investment,
  InvestmentInput,
  NetWorthInput,
  NetWorthSnapshot,
  Transaction,
  TransactionInput,
} from './types';

// HARD RULE #3: object form. HARD RULE #4: apiRequest returns parsed JSON.

const DISCLAIMER_KEY = ['financial', 'disclaimer'] as const;

export function useDisclaimer() {
  return useQuery({
    queryKey: DISCLAIMER_KEY,
    queryFn: () => apiRequest<DisclaimerStatus>('/api/financial/disclaimer'),
  });
}

export function useAcknowledgeDisclaimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signatureName: string) =>
      apiRequest<DisclaimerStatus>('/api/financial/disclaimer', { method: 'POST', body: { signatureName } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISCLAIMER_KEY }),
  });
}

/** Generic per-entity CRUD hooks bound to /api/financial/<path>. */
function crudHooks<T, Input>(path: string) {
  const key = ['financial', path] as const;
  return {
    useList: () =>
      useQuery({ queryKey: key, queryFn: () => apiRequest<T[]>(`/api/financial/${path}`) }),
    useCreate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (input: Input) => apiRequest<T>(`/api/financial/${path}`, { method: 'POST', body: input }),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
      });
    },
    useUpdate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (v: { id: string; input: Input }) =>
          apiRequest<T>(`/api/financial/${path}/${v.id}`, { method: 'PATCH', body: v.input }),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
      });
    },
    useRemove: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => apiRequest<null>(`/api/financial/${path}/${id}`, { method: 'DELETE' }),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
      });
    },
  };
}

export const budgetApi = crudHooks<BudgetCategory, BudgetCategoryInput>('budget-categories');
export const txApi = crudHooks<Transaction, TransactionInput>('transactions');
export const billsApi = crudHooks<Bill, BillInput>('bills');
export const goalsApi = crudHooks<Goal, GoalInput>('goals');
export const investmentsApi = crudHooks<Investment, InvestmentInput>('investments');
export const netWorthApi = crudHooks<NetWorthSnapshot, NetWorthInput>('net-worth');

export function useAsk() {
  return useMutation({
    mutationFn: (question: string) =>
      apiRequest<AskResponse>('/api/financial/ask', { method: 'POST', body: { question } }),
  });
}
