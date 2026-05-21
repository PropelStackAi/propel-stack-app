import { QueryClient } from '@tanstack/react-query';

/**
 * HARD RULE #3: All useQuery calls must use the v5 object form:
 *   useQuery({ queryKey: [...], queryFn: ... })
 * The positional v4 signature will not work.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry client errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});
