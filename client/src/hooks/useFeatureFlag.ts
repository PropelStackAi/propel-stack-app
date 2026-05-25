// ─── useFeatureFlag — Enhancement 32 (A/B Testing Scaffold) ──────────────────
// Propel Stack AI, LLC
//
// Fetches a single feature flag from the server. Returns { enabled, variant }
// with sensible defaults while loading. Server uses deterministic hash-based
// rollout so the same user always sees the same variant.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface FlagResponse {
  key: string;
  enabled: boolean;
  rollout_percentage: number;
  variant: string | null;
}

interface ExperimentVariant {
  key: string;
  variant: 'control' | 'treatment' | string;
}

/**
 * Returns whether a feature flag is enabled for the current user.
 *
 * @example
 * const { enabled, isLoading } = useFeatureFlag('dark_mode');
 * if (!isLoading && enabled) { ... }
 */
export function useFeatureFlag(flagKey: string) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['feature-flag', flagKey],
    queryFn: () => apiRequest<FlagResponse>(`/api/flags/${flagKey}`),
    staleTime: 5 * 60 * 1000, // flags are stable — cache 5 min
    retry: false,
  });

  return {
    enabled: data?.enabled ?? false,
    variant: data?.variant ?? null,
    rolloutPct: data?.rollout_percentage ?? 0,
    isLoading,
    isError,
  };
}

/**
 * Returns the experiment variant assigned to the current user.
 * Variant is 'control' or 'treatment' (or custom string) — deterministic
 * based on userId + flagKey hash so it's consistent across sessions.
 *
 * @example
 * const { variant } = useExperimentVariant('model_routing_v2');
 * if (variant === 'treatment') { ... }
 */
export function useExperimentVariant(experimentKey: string) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['experiment-variant', experimentKey],
    queryFn: () => apiRequest<ExperimentVariant>(`/api/flags/experiment/${experimentKey}/variant`),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    variant: data?.variant ?? 'control',
    isLoading,
    isError,
  };
}
