/**
 * Not Now Banner — Enhancement 17 (Do Not Disturb / "Not Now" Mode)
 *
 * Shows a gentle banner at the top of the app when Not Now mode is active.
 * Only renders when the mode is active — zero layout impact otherwise.
 * Users activate it via Settings or via the Notifications page.
 */
import { BellOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface NotNowStatus {
  active: boolean;
  until: string | null;
  untilFormatted: string | null;
}

export function NotNowBanner() {
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['settings', 'not-now'],
    queryFn: () => apiRequest<NotNowStatus>('/api/settings/not-now'),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const deactivate = useMutation({
    mutationFn: () => apiRequest<NotNowStatus>('/api/settings/not-now', { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'not-now'] }),
  });

  // Only render when mode is active
  if (!status?.active) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2"
      style={{ background: '#FFF7ED', borderBottom: '1px solid rgba(251,146,60,0.25)' }}
    >
      <BellOff size={13} color="#9A3412" className="flex-shrink-0" />
      <span className="text-xs text-orange-800 flex-1">
        <strong>Not Now mode on</strong>
        {status.untilFormatted && ` · resumes ${status.untilFormatted}`}
        {' '}— briefings and notifications are paused.
      </span>
      <button
        type="button"
        onClick={() => deactivate.mutate()}
        disabled={deactivate.isPending}
        className="text-xs font-semibold text-orange-700 hover:text-orange-900 hover:underline transition-colors"
      >
        Resume
      </button>
    </div>
  );
}
