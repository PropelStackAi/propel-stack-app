/**
 * White-Label Advisor Platform — Enhancement 35
 * Propel Stack AI, LLC
 *
 * B2B2C: advisors deploy under their own brand.
 * Client data isolation is enforced at DB layer.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface AdvisorFirm {
  id: string; firm_name: string; brand_primary_color: string;
  brand_logo_url: string | null; custom_domain: string | null; plan: string;
}

interface AdvisorClient {
  id: string; display_name: string; email: string; plan_tier: string;
  shared_hubs: string[]; linked_at: string;
}

export function AdvisorPlatform() {
  const qc = useQueryClient();
  const [firmForm, setFirmForm] = useState({ firm_name: '', brand_primary_color: '#4F35C2', custom_domain: '' });
  const [showFirmSetup, setShowFirmSetup] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const { data: firm } = useQuery({
    queryKey: ['advisor-firm'],
    queryFn: () => apiRequest<AdvisorFirm | null>('/api/advisor/firm'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['advisor-clients'],
    queryFn: () => apiRequest<AdvisorClient[]>('/api/advisor/clients'),
    enabled: !!firm?.id,
  });

  const createFirmMutation = useMutation({
    mutationFn: (data: typeof firmForm) => apiRequest<{ id: string }>('/api/advisor/firm', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advisor-firm'] }); setShowFirmSetup(false); },
  });

  const inviteMutation = useMutation({
    mutationFn: () => apiRequest<{ invite_url: string; firm_name: string }>('/api/advisor/invite', { method: 'POST' }),
    onSuccess: async (data) => {
      await navigator.clipboard.writeText(data.invite_url).catch(() => {});
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 3000);
    },
  });

  if (!firm) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Advisor Platform</h1>
          <p className="text-sm text-surface-muted mt-1">White-label Propel Stack AI for your clients.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { plan: 'Advisor', price: '$99/mo', clients: '25 clients', features: ['Branded experience', 'Client roster', 'Content push', 'Compliance notes'] },
            { plan: 'Advisor Pro', price: '$299/mo', clients: 'Unlimited', features: ['All Advisor features', 'AI assistant', 'CE integration', 'Priority support'] },
            { plan: 'Enterprise', price: 'Custom', clients: 'Unlimited', features: ['Custom domain', 'SSO', 'Dedicated support', 'SLA guarantee'] },
          ].map((p) => (
            <div key={p.plan} className="card text-center">
              <p className="font-display font-bold text-lg text-surface-ink">{p.plan}</p>
              <p className="text-2xl font-bold text-brand-indigo mt-1">{p.price}</p>
              <p className="text-xs text-surface-muted mt-0.5">{p.clients}</p>
              <ul className="mt-3 space-y-1 text-xs text-surface-ink/80 text-left">
                {p.features.map((f) => <li key={f} className="flex gap-1.5"><span className="text-brand-teal">✓</span>{f}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-surface-ink mb-4">Set Up Your Firm</h2>
          {!showFirmSetup ? (
            <button className="btn-primary" onClick={() => setShowFirmSetup(true)}>Get Started →</button>
          ) : (
            <div className="space-y-3">
              <input className="input w-full" placeholder="Firm name (e.g. Smith Financial Partners)" value={firmForm.firm_name} onChange={(e) => setFirmForm({ ...firmForm, firm_name: e.target.value })} />
              <div className="flex items-center gap-3">
                <label className="text-sm text-surface-muted">Brand color:</label>
                <input type="color" className="w-10 h-10 rounded border border-surface-ink/10 cursor-pointer" value={firmForm.brand_primary_color} onChange={(e) => setFirmForm({ ...firmForm, brand_primary_color: e.target.value })} />
                <span className="text-xs text-surface-muted">{firmForm.brand_primary_color}</span>
              </div>
              <input className="input w-full" placeholder="Custom domain (optional — e.g. app.myfinancialfirm.com)" value={firmForm.custom_domain} onChange={(e) => setFirmForm({ ...firmForm, custom_domain: e.target.value })} />
              <div className="flex gap-3">
                <button className="btn-ghost" onClick={() => setShowFirmSetup(false)}>Cancel</button>
                <button className="btn-primary" disabled={!firmForm.firm_name || createFirmMutation.isPending} onClick={() => createFirmMutation.mutate(firmForm)}>
                  {createFirmMutation.isPending ? 'Creating…' : 'Create Firm'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">{firm.firm_name}</h1>
          <p className="text-sm text-surface-muted mt-1">Advisor Dashboard · {clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
          {copiedInvite ? '✓ Link Copied!' : inviteMutation.isPending ? 'Generating…' : '+ Invite Client'}
        </button>
      </div>

      {/* Security reminder */}
      <div className="rounded-xl bg-brand-indigo/5 border border-brand-indigo/20 px-4 py-3 text-xs text-brand-indigo flex gap-2">
        <span>🔒</span>
        <span>
          Client data isolation is enforced at the database layer.
          You only see hubs each client has explicitly shared with you.
          Client data is never cross-contaminated between advisor accounts.
        </span>
      </div>

      {/* Branding */}
      <div className="card flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: firm.brand_primary_color + '20' }}>
          <div className="w-6 h-6 rounded" style={{ backgroundColor: firm.brand_primary_color }} />
        </div>
        <div>
          <p className="font-semibold text-surface-ink">{firm.firm_name}</p>
          <p className="text-xs text-surface-muted">Plan: {firm.plan} · Color: {firm.brand_primary_color}</p>
          {firm.custom_domain && <p className="text-xs text-surface-muted">Domain: {firm.custom_domain}</p>}
        </div>
      </div>

      {/* Client Roster */}
      <section className="card">
        <h2 className="text-lg font-semibold text-surface-ink mb-4">Client Roster</h2>
        {clients.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-surface-muted text-sm">No clients yet. Send an invite link to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => {
              const hubs: string[] = typeof client.shared_hubs === 'string' ? JSON.parse(client.shared_hubs) : client.shared_hubs ?? [];
              return (
                <div key={client.id} className="rounded-xl bg-surface-sunk p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-surface-ink text-sm">{client.display_name}</p>
                      <p className="text-xs text-surface-muted">{client.email} · {client.plan_tier} plan</p>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {hubs.length > 0 ? hubs.map((h) => (
                          <span key={h} className="chip text-[10px] capitalize">{h}</span>
                        )) : <span className="text-xs text-surface-muted">No hubs shared</span>}
                      </div>
                    </div>
                    <p className="text-xs text-surface-muted shrink-0">
                      Linked {new Date(client.linked_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Plan info */}
      <div className="rounded-xl bg-surface-sunk p-4 text-xs text-surface-muted">
        <strong>Advisor</strong> plan · Contact support@propelstack.ai to upgrade to Advisor Pro or Enterprise.
      </div>
    </div>
  );
}
