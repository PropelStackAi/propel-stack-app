// ─── Smart Notification Intelligence — Page ───────────────────────────────────
// Propel Stack AI, LLC

import { useState } from 'react';
import { BellOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { NotificationFeed } from '../features/notifications/components/NotificationFeed';
import { NotificationSettings } from '../features/notifications/components/NotificationSettings';

interface NotNowStatus { active: boolean; until: string | null; untilFormatted: string | null; }
type Duration = '1h' | '4h' | '8h' | 'tomorrow';
const DURATIONS: { value: Duration; label: string }[] = [
  { value: '1h',       label: '1 hour'    },
  { value: '4h',       label: '4 hours'   },
  { value: '8h',       label: '8 hours'   },
  { value: 'tomorrow', label: 'Tomorrow'  },
];

function NotNowToggle() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['settings', 'not-now'], queryFn: () => apiRequest<NotNowStatus>('/api/settings/not-now'), staleTime: 2 * 60_000 });
  const activate = useMutation({ mutationFn: (d: Duration) => apiRequest('/api/settings/not-now', { method: 'POST', body: { duration: d } }), onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'not-now'] }) });
  const deactivate = useMutation({ mutationFn: () => apiRequest('/api/settings/not-now', { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'not-now'] }) });

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <BellOff size={15} color={data?.active ? '#F05A28' : '#9CA3AF'} />
        <h3 className="font-display font-bold text-sm text-surface-ink">Not Now Mode</h3>
        {data?.active && <span className="ml-auto badge text-orange-700 bg-orange-100 border-0">Active</span>}
      </div>
      <p className="text-xs text-surface-muted mb-3">
        Pause all briefings and re-engagement messages for a set period. Nothing is deleted.
      </p>
      {data?.active ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-orange-700">Paused{data.untilFormatted ? ` until ${data.untilFormatted}` : ''}</span>
          <button type="button" onClick={() => deactivate.mutate()} disabled={deactivate.isPending} className="btn-secondary !py-1.5 !text-xs">Resume</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button key={d.value} type="button" onClick={() => activate.mutate(d.value)} disabled={activate.isPending} className="btn-secondary !py-1.5 !text-xs">
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Tab = 'feed' | 'settings';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'feed',     label: 'Inbox',    emoji: '🔔' },
  { id: 'settings', label: 'Settings', emoji: '⚙️' },
];

export function Notifications(): JSX.Element {
  const [tab, setTab] = useState<Tab>('feed');

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          🔔 Smart Notifications
        </h2>
        <p className="text-xs text-surface-muted">
          Contextual nudges that adapt to when you're most responsive. Never spam — always relevant.
        </p>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              tab === t.id
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Not Now toggle — always visible above tabs (Enhancement 17) */}
      <NotNowToggle />

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'feed'     && <NotificationFeed />}
        {tab === 'settings' && <NotificationSettings />}
      </div>
    </div>
  );
}
