/**
 * Universal Web App Credential Bridge — Enhancement 26
 * Propel Stack AI, LLC
 *
 * Users connect third-party apps via OAuth or encrypted credentials.
 * Enables automatic data sync into the correct hub.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface CatalogApp {
  id: string;
  name: string;
  url: string;
  hub: string;
  type: 'oauth' | 'credential' | 'api_key';
}

interface Connection {
  id: string;
  app_name: string;
  app_url: string;
  connection_type: string;
  target_hub: string;
  sync_frequency: string;
  last_synced_at: string | null;
  sync_status: string;
  sync_error: string | null;
  is_active: boolean;
  created_at: string;
}

const HUB_LABELS: Record<string, string> = {
  athlete: 'Athlete Hub', health: 'Health Hub', finance: 'Finance Hub',
  student: 'Student Mode', general: 'General',
};

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  oauth:      { label: 'OAuth',      cls: 'bg-brand-teal/10 text-brand-teal' },
  credential: { label: 'Credential', cls: 'bg-brand-purple/10 text-brand-purple' },
  api_key:    { label: 'API Key',    cls: 'bg-brand-indigo/10 text-brand-indigo' },
};

export function CredentialBridge() {
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null);
  const [syncFrequency, setSyncFrequency] = useState('daily');

  const { data: catalog = [] } = useQuery({
    queryKey: ['cbc-catalog'],
    queryFn: () => apiRequest<CatalogApp[]>('/api/credential-bridge/catalog'),
  });

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['cbc-connections'],
    queryFn: () => apiRequest<Connection[]>('/api/credential-bridge/connections'),
  });

  const addMutation = useMutation({
    mutationFn: (data: Partial<Connection>) =>
      apiRequest<{ id: string }>('/api/credential-bridge/connections', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cbc-connections'] }); setShowAddModal(false); setSelectedApp(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/credential-bridge/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbc-connections'] }),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/credential-bridge/connections/${id}/sync`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbc-connections'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/credential-bridge/connections/${id}/toggle`, { method: 'PUT' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cbc-connections'] }),
  });

  function handleConnect() {
    if (!selectedApp) return;
    addMutation.mutate({
      app_name: selectedApp.name,
      app_url: selectedApp.url,
      connection_type: selectedApp.type,
      target_hub: selectedApp.hub,
      sync_frequency: syncFrequency,
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Credential Bridge</h1>
          <p className="text-sm text-surface-muted mt-1">
            Connect third-party apps to automatically sync data into your hubs.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Connect App
        </button>
      </div>

      {/* Security notice */}
      <div className="rounded-xl bg-brand-teal/5 border border-brand-teal/20 px-4 py-3 text-sm text-brand-teal flex gap-2">
        <span>🔐</span>
        <span>OAuth tokens are encrypted at rest. Credentials are never decrypted server-side.</span>
      </div>

      {/* Connected apps */}
      <section className="card">
        <h2 className="text-lg font-semibold text-surface-ink mb-4">Connected Apps</h2>
        {isLoading ? (
          <div className="py-8 text-center text-surface-muted text-sm animate-pulse">Loading connections…</div>
        ) : connections.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-4xl mb-3">🔌</div>
            <p className="text-surface-muted text-sm">No apps connected yet.</p>
            <button className="btn-primary mt-4" onClick={() => setShowAddModal(true)}>Connect your first app</button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => {
              const badge = TYPE_BADGES[conn.connection_type] ?? TYPE_BADGES.oauth;
              return (
                <div key={conn.id} className="flex items-center justify-between gap-4 rounded-xl bg-surface-sunk p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-surface-ink text-sm">{conn.app_name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                      <span className="chip text-xs">{HUB_LABELS[conn.target_hub] ?? conn.target_hub}</span>
                      {!conn.is_active && <span className="text-xs text-surface-muted">(paused)</span>}
                    </div>
                    <p className="text-xs text-surface-muted mt-0.5">
                      {conn.last_synced_at
                        ? `Last synced: ${new Date(conn.last_synced_at).toLocaleString()}`
                        : 'Never synced'}
                      {conn.sync_status === 'error' && (
                        <span className="ml-2 text-brand-coral">⚠ Sync error</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="text-xs px-2 py-1 rounded bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink transition-colors"
                      onClick={() => syncMutation.mutate(conn.id)}
                      disabled={syncMutation.isPending}
                    >
                      Sync
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink transition-colors"
                      onClick={() => toggleMutation.mutate(conn.id)}
                    >
                      {conn.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                      onClick={() => { if (confirm('Remove this connection?')) deleteMutation.mutate(conn.id); }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* App Catalog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-surface-raised rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-ink/[0.06]">
              <h2 className="text-lg font-semibold text-surface-ink">Connect an App</h2>
              <p className="text-sm text-surface-muted mt-0.5">Select an app to connect to your account.</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {catalog.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app.id === selectedApp?.id ? null : app)}
                    className={[
                      'rounded-xl border p-3 text-left transition-all',
                      selectedApp?.id === app.id
                        ? 'border-brand-indigo bg-brand-indigo/5'
                        : 'border-surface-ink/10 bg-surface-sunk hover:border-brand-indigo/40',
                    ].join(' ')}
                  >
                    <div className="text-sm font-semibold text-surface-ink">{app.name}</div>
                    <div className="text-xs text-surface-muted mt-0.5">{HUB_LABELS[app.hub] ?? app.hub}</div>
                    <div className={`text-[10px] font-semibold mt-1.5 inline-block px-1.5 py-0.5 rounded ${TYPE_BADGES[app.type]?.cls}`}>
                      {TYPE_BADGES[app.type]?.label}
                    </div>
                  </button>
                ))}
              </div>
              {selectedApp && (
                <div className="mt-4 rounded-xl bg-brand-indigo/5 border border-brand-indigo/20 p-4">
                  <p className="text-sm font-semibold text-surface-ink">Sync frequency for {selectedApp.name}</p>
                  <div className="flex gap-2 mt-2">
                    {['on_open', 'hourly', 'daily', 'weekly'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setSyncFrequency(f)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          syncFrequency === f ? 'bg-brand-indigo text-white border-brand-indigo' : 'border-surface-ink/20 text-surface-muted'
                        }`}
                      >
                        {f.replace('_', '-')}
                      </button>
                    ))}
                  </div>
                  {selectedApp.type === 'credential' && (
                    <p className="text-xs text-brand-coral mt-3">
                      ⚠ Credential-based connections require credentials — they are encrypted on your device and never sent to our servers unencrypted.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-surface-ink/[0.06] flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => { setShowAddModal(false); setSelectedApp(null); }}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!selectedApp || addMutation.isPending}
                onClick={handleConnect}
              >
                {addMutation.isPending ? 'Connecting…' : `Connect ${selectedApp?.name ?? ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
