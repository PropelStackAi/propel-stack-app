/**
 * Connected Apps Hub
 * Propel Stack AI, LLC
 *
 * Manage all third-party integrations and data connections.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface CatalogItem {
  id: string;
  name: string;
  app_url: string;
  connection_type: string;
  target_hub: string;
  description?: string;
}

interface Connection {
  id: string;
  app_name: string;
  connection_type: string;
  target_hub: string;
  last_synced_at: string | null;
  sync_status: string;
  is_active: boolean;
}

const CATALOG_CATEGORIES: Array<{
  label: string;
  icon: string;
  apps: Array<{ name: string; description: string; comingSoon?: boolean }>;
}> = [
  {
    label: 'Finance',
    icon: '💰',
    apps: [
      { name: 'Plaid', description: 'Connect bank accounts and track transactions automatically.' },
      { name: 'Stripe', description: 'Sync revenue and payment data from your business.' },
    ],
  },
  {
    label: 'Health',
    icon: '🏃',
    apps: [
      { name: 'Apple Health', description: 'Import steps, sleep, heart rate, and workouts.' },
      { name: 'Fitbit', description: 'Sync daily activity, sleep stages, and health metrics.' },
      { name: 'Oura', description: 'Import readiness, sleep, and activity ring data.' },
      { name: 'WHOOP', description: 'Sync strain, recovery, and sleep performance.' },
      { name: 'Garmin', description: 'Import GPS workouts, VO2 max, and health stats.' },
    ],
  },
  {
    label: 'Productivity',
    icon: '📅',
    apps: [
      { name: 'Google Calendar', description: 'Sync events and schedule for AI analysis.' },
      { name: 'Outlook', description: 'Connect Microsoft Outlook calendar and events.' },
    ],
  },
  {
    label: 'Social',
    icon: '📱',
    apps: [
      { name: 'Facebook', description: 'Import milestones and life events.' },
      { name: 'Instagram', description: 'Connect for Life Timeline media.' },
      { name: 'LinkedIn', description: 'Sync career updates and network connections.' },
      { name: 'TikTok', description: 'Social media integration.', comingSoon: true },
    ],
  },
  {
    label: 'Smart Home',
    icon: '🏠',
    apps: [
      { name: 'Apple HomeKit', description: 'Smart home device integration.', comingSoon: true },
      { name: 'Google Home', description: 'Connect smart home devices.', comingSoon: true },
      { name: 'Amazon Alexa', description: 'Alexa skill integration.', comingSoon: true },
    ],
  },
];

function formatSyncDate(dateStr: string | null) {
  if (!dateStr) return 'Never synced';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function AppIntegrations() {
  const qc = useQueryClient();
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: catalog = [] } = useQuery<CatalogItem[]>({
    queryKey: ['credential-catalog'],
    queryFn: () => apiRequest<CatalogItem[]>('/api/credential-bridge/catalog'),
  });

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ['credential-connections'],
    queryFn: () => apiRequest<Connection[]>('/api/credential-bridge/connections'),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/credential-bridge/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credential-connections'] }),
  });

  const connectMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest<{ id: string }>('/api/credential-bridge/connections', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credential-connections'] }),
  });

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      await apiRequest(`/api/credential-bridge/connections/${id}/sync`, { method: 'POST' });
      qc.invalidateQueries({ queryKey: ['credential-connections'] });
    } finally {
      setSyncingId(null);
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      for (const conn of connections.filter(c => c.is_active)) {
        await apiRequest(`/api/credential-bridge/connections/${conn.id}/sync`, { method: 'POST' });
      }
      qc.invalidateQueries({ queryKey: ['credential-connections'] });
    } finally {
      setSyncingAll(false);
    }
  }

  function handleConnect(appName: string) {
    const catalogItem = catalog.find(c => c.name.toLowerCase() === appName.toLowerCase());
    if (catalogItem) {
      connectMutation.mutate({
        app_name: catalogItem.name,
        connection_type: catalogItem.connection_type,
        target_hub: catalogItem.target_hub,
      });
    } else {
      // Route to credential bridge for manual setup
      window.location.hash = '/credential-bridge';
    }
  }

  const connectedAppNames = new Set(connections.map(c => c.app_name.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Connected Apps</h1>
          <p className="text-surface-muted text-sm mt-1">
            Manage all your third-party integrations and data connections in one place.
          </p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncingAll || connections.filter(c => c.is_active).length === 0}
          className="btn-secondary text-sm"
        >
          {syncingAll ? 'Syncing…' : '🔄 Sync All'}
        </button>
      </div>

      {/* Connected Apps */}
      {connections.length > 0 && (
        <div>
          <h2 className="font-semibold text-surface-ink mb-3">Connected</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {connections.map(conn => (
              <div key={conn.id} className="card space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-surface-ink">{conn.app_name}</div>
                    <div className="text-xs text-surface-muted capitalize">{conn.target_hub.replace(/_/g, ' ')}</div>
                  </div>
                  <span className={`chip text-xs ${conn.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-sunk text-surface-muted'}`}>
                    {conn.is_active ? '● Active' : '○ Inactive'}
                  </span>
                </div>
                <div className="text-xs text-surface-muted">
                  {conn.sync_status !== 'idle' && (
                    <span className="capitalize mr-2">{conn.sync_status}</span>
                  )}
                  {formatSyncDate(conn.last_synced_at)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSync(conn.id)}
                    disabled={syncingId === conn.id}
                    className="btn-secondary text-xs py-1.5"
                  >
                    {syncingId === conn.id ? 'Syncing…' : 'Sync Now'}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Disconnect ${conn.app_name}?`)) {
                        disconnectMutation.mutate(conn.id);
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div>
        <h2 className="font-semibold text-surface-ink mb-2">Available Integrations</h2>

        {CATALOG_CATEGORIES.map(cat => (
          <div key={cat.label}>
            <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2 mt-4">
              {cat.icon} {cat.label}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.apps.map(app => {
                const isConnected = connectedAppNames.has(app.name.toLowerCase());
                return (
                  <div key={app.name} className="card flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-surface-ink text-sm">{app.name}</div>
                      {isConnected && (
                        <span className="chip bg-green-100 text-green-700 text-xs flex-shrink-0">Connected ✓</span>
                      )}
                      {app.comingSoon && !isConnected && (
                        <span className="chip bg-surface-sunk text-surface-muted text-xs flex-shrink-0">Coming Soon</span>
                      )}
                    </div>
                    {app.description && (
                      <p className="text-xs text-surface-muted leading-relaxed">{app.description}</p>
                    )}
                    {!isConnected && !app.comingSoon && (
                      <button
                        onClick={() => handleConnect(app.name)}
                        disabled={connectMutation.isPending}
                        className="btn-primary text-xs py-1.5 mt-auto"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Custom / Credential Bridge */}
        <div>
          <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2 mt-4">
            🔗 Custom
          </div>
          <div className="card">
            <div className="font-medium text-surface-ink text-sm mb-1">Custom Integration</div>
            <p className="text-xs text-surface-muted mb-3">
              Connect any service using your own API credentials via the Credential Bridge.
            </p>
            <a href="#/credential-bridge" className="btn-secondary text-xs py-1.5 inline-block">
              Open Credential Bridge →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
