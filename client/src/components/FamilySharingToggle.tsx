/**
 * Family Sharing Toggle — Enhancement 22
 *
 * Allows family plan users to toggle whether their data is visible to
 * family members. Private = only you see it. Shared = family can see it.
 */
import { Users, Lock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { UpgradePrompt } from './UpgradeModal';

interface FamilySharingStatus {
  enabled: boolean;
  available: boolean;
  planTier: string;
}

export function FamilySharingToggle() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['settings', 'family-sharing'],
    queryFn: () => apiRequest<FamilySharingStatus>('/api/settings/family-sharing'),
    staleTime: 5 * 60_000,
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest<{ enabled: boolean; ok: boolean }>('/api/settings/family-sharing', {
        method: 'POST',
        body: { enabled },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'family-sharing'] }),
  });

  if (!data) return null;

  // Not on a family plan — show upgrade prompt
  if (!data.available) {
    return <UpgradePrompt feature="Family data sharing" currentTier={data.planTier} />;
  }

  const isEnabled = data.enabled;

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex-shrink-0 rounded-xl p-2"
            style={{ background: isEnabled ? 'rgba(1,105,111,0.1)' : 'rgba(107,114,128,0.1)' }}
          >
            {isEnabled ? (
              <Users size={16} color="#01696F" />
            ) : (
              <Lock size={16} color="#9CA3AF" />
            )}
          </div>
          <div>
            <p className="font-display font-bold text-sm text-surface-ink">
              {isEnabled ? 'Sharing with family' : 'Private mode'}
            </p>
            <p className="text-xs text-surface-muted mt-0.5">
              {isEnabled
                ? 'Your life wins, goals, and highlights are visible to family members.'
                : "Your data is private — only you can see it. Family members won't see your activity."}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(!isEnabled)}
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
            isEnabled ? 'bg-brand-teal' : 'bg-surface-sunk'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
