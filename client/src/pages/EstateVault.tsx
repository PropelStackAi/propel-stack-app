/**
 * Estate & Legacy Vault — Enhancement 30
 * Propel Stack AI, LLC
 *
 * DISCLAIMER: This is an organizational tool ONLY.
 * Not legal advice. Not a legally binding will/trust.
 * Always consult a licensed estate attorney.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface DisclaimerStatus {
  acknowledged: boolean;
  version: string;
  acknowledged_at?: string;
}

interface VaultEntry {
  id: string;
  section: string;
  title: string;
  content_enc: string | null;
  last_updated: string;
  created_at: string;
}

interface Delegate {
  id: string;
  delegate_name: string;
  delegate_email: string;
  relationship: string;
  access_level: string;
  is_verified: boolean;
  created_at: string;
}

const SECTIONS = [
  { id: 'digital_assets', label: 'Digital Assets',     icon: '💻', desc: 'Bank, investment, crypto, social accounts' },
  { id: 'beneficiaries',  label: 'Beneficiaries',      icon: '👥', desc: 'Who inherits what — per account' },
  { id: 'letter',         label: 'Letter of Instruction', icon: '✉️', desc: 'Plain-language guidance for your family' },
  { id: 'funeral',        label: 'Memorial Preferences', icon: '🕊️', desc: 'Service wishes, music, charitable requests' },
  { id: 'passwords',      label: 'Password Handoff',   icon: '🔑', desc: 'Critical passwords for designated inheritor' },
  { id: 'documents',      label: 'Documents',          icon: '📄', desc: 'Will, trust, POA, healthcare proxy' },
];

export function EstateVault() {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState('digital_assets');
  const [showDelegates, setShowDelegates] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', content_enc: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [delegateForm, setDelegateForm] = useState({ delegate_name: '', delegate_email: '', relationship: '', access_level: 'full' });

  const { data: disclaimer } = useQuery({
    queryKey: ['estate-disclaimer'],
    queryFn: () => apiRequest<DisclaimerStatus>('/api/estate-vault/disclaimer'),
  });

  const ackMutation = useMutation({
    mutationFn: () => apiRequest('/api/estate-vault/disclaimer', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estate-disclaimer'] }),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['estate-section', activeSection],
    queryFn: () => apiRequest<VaultEntry[]>(`/api/estate-vault/sections/${activeSection}`),
    enabled: !!disclaimer?.acknowledged,
  });

  const { data: delegates = [] } = useQuery({
    queryKey: ['estate-delegates'],
    queryFn: () => apiRequest<Delegate[]>('/api/estate-vault/delegates'),
    enabled: !!disclaimer?.acknowledged,
  });

  const addEntryMutation = useMutation({
    mutationFn: (data: typeof addForm) =>
      apiRequest<{ id: string }>(`/api/estate-vault/sections/${activeSection}`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estate-section', activeSection] });
      setShowAddForm(false);
      setAddForm({ title: '', content_enc: '' });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/estate-vault/sections/${activeSection}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estate-section', activeSection] }),
  });

  const addDelegateMutation = useMutation({
    mutationFn: (data: typeof delegateForm) =>
      apiRequest<{ id: string }>('/api/estate-vault/delegates', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['estate-delegates'] }); setDelegateForm({ delegate_name: '', delegate_email: '', relationship: '', access_level: 'full' }); },
  });

  const deleteDelegateMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/estate-vault/delegates/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estate-delegates'] }),
  });

  // ── Disclaimer gate ────────────────────────────────────────────────────────
  if (!disclaimer?.acknowledged) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full card">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏛️</div>
            <h1 className="text-2xl font-display font-bold text-surface-ink">Estate & Legacy Vault</h1>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 mb-6 space-y-2">
            <p><strong>Important Legal Notice — PSAI-EST-DISC-v1.0</strong></p>
            <p>The Estate & Legacy Vault is an <strong>organizational tool only</strong>. It is not legal advice and does not constitute a legally binding will, trust, or estate document.</p>
            <p>Always work with a licensed estate attorney for legally binding documents.</p>
            <p>Propel Stack AI, LLC is not responsible for the legal validity of any documents stored or generated here.</p>
          </div>
          <button
            className="btn-primary w-full"
            onClick={() => ackMutation.mutate()}
            disabled={ackMutation.isPending}
          >
            {ackMutation.isPending ? 'Acknowledging…' : 'I Understand — Enter Vault'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Estate & Legacy Vault</h1>
          <p className="text-xs text-surface-muted mt-1">Organizational tool only — not legal advice</p>
        </div>
        <button className="btn-ghost text-sm" onClick={() => setShowDelegates(!showDelegates)}>
          👥 Trusted Access ({delegates.length}/2)
        </button>
      </div>

      {/* Security reminder */}
      <div className="rounded-xl bg-brand-teal/5 border border-brand-teal/20 px-3 py-2 text-xs text-brand-teal flex gap-2">
        <span>🔐</span>
        <span>All vault content is encrypted. Content is never decrypted server-side.</span>
      </div>

      <div className="flex gap-6">
        {/* Section sidebar */}
        <nav className="hidden sm:block w-48 shrink-0">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => { setActiveSection(s.id); setShowAddForm(false); }}
                  className={[
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    activeSection === s.id
                      ? 'bg-brand-indigo/10 text-brand-indigo font-semibold'
                      : 'text-surface-ink/80 hover:bg-surface-sunk',
                  ].join(' ')}
                >
                  <span>{s.icon}</span>
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile section selector */}
        <select
          className="input sm:hidden w-full text-sm"
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value)}
        >
          {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
        </select>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {!showDelegates ? (
            <div className="card">
              {(() => {
                const sec = SECTIONS.find((s) => s.id === activeSection)!;
                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-surface-ink">{sec.icon} {sec.label}</h2>
                        <p className="text-xs text-surface-muted">{sec.desc}</p>
                      </div>
                      <button className="btn-primary text-sm" onClick={() => setShowAddForm(!showAddForm)}>
                        {showAddForm ? 'Cancel' : '+ Add Entry'}
                      </button>
                    </div>

                    {showAddForm && (
                      <div className="rounded-xl bg-surface-sunk p-4 mb-4 space-y-3">
                        <input
                          type="text"
                          className="input w-full"
                          placeholder="Title"
                          value={addForm.title}
                          onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                        />
                        <textarea
                          className="input w-full h-24 resize-none"
                          placeholder="Details (will be stored encrypted)"
                          value={addForm.content_enc}
                          onChange={(e) => setAddForm({ ...addForm, content_enc: e.target.value })}
                        />
                        <button
                          className="btn-primary text-sm"
                          disabled={!addForm.title.trim() || addEntryMutation.isPending}
                          onClick={() => addEntryMutation.mutate(addForm)}
                        >
                          {addEntryMutation.isPending ? 'Saving…' : 'Save Entry'}
                        </button>
                      </div>
                    )}

                    {entries.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="text-3xl mb-2">{sec.icon}</div>
                        <p className="text-sm text-surface-muted">No entries yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {entries.map((entry) => (
                          <div key={entry.id} className="rounded-xl bg-surface-sunk p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-surface-ink">{entry.title}</p>
                                <p className="text-xs text-surface-muted mt-0.5">
                                  Updated {new Date(entry.last_updated).toLocaleDateString()}
                                </p>
                                {entry.content_enc && (
                                  <p className="text-xs text-surface-ink/70 mt-1 line-clamp-2">{entry.content_enc}</p>
                                )}
                              </div>
                              <button
                                className="text-xs text-brand-coral hover:underline shrink-0"
                                onClick={() => { if (confirm('Delete this entry?')) deleteEntryMutation.mutate(entry.id); }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            /* Trusted Access Delegates */
            <div className="card">
              <h2 className="text-lg font-semibold text-surface-ink mb-2">Trusted Access Delegates</h2>
              <p className="text-xs text-surface-muted mb-4">
                Designate up to 2 trusted people who can request access upon verified death or incapacitation.
                Access is never automatic — it requires identity verification and internal review.
              </p>

              {delegates.length < 2 && (
                <div className="rounded-xl bg-surface-sunk p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" className="input w-full" placeholder="Full name"
                      value={delegateForm.delegate_name} onChange={(e) => setDelegateForm({ ...delegateForm, delegate_name: e.target.value })} />
                    <input type="email" className="input w-full" placeholder="Email"
                      value={delegateForm.delegate_email} onChange={(e) => setDelegateForm({ ...delegateForm, delegate_email: e.target.value })} />
                  </div>
                  <input type="text" className="input w-full" placeholder="Relationship (e.g. Spouse, Attorney)"
                    value={delegateForm.relationship} onChange={(e) => setDelegateForm({ ...delegateForm, relationship: e.target.value })} />
                  <select className="input w-full" value={delegateForm.access_level}
                    onChange={(e) => setDelegateForm({ ...delegateForm, access_level: e.target.value })}>
                    <option value="full">Full access</option>
                    <option value="documents_only">Documents only</option>
                    <option value="letter_only">Letter only</option>
                  </select>
                  <button className="btn-primary text-sm"
                    disabled={!delegateForm.delegate_name || !delegateForm.delegate_email || addDelegateMutation.isPending}
                    onClick={() => addDelegateMutation.mutate(delegateForm)}>
                    {addDelegateMutation.isPending ? 'Adding…' : 'Add Delegate'}
                  </button>
                </div>
              )}

              {delegates.length === 0 ? (
                <p className="text-sm text-surface-muted text-center py-4">No delegates added yet.</p>
              ) : (
                <div className="space-y-3">
                  {delegates.map((d) => (
                    <div key={d.id} className="rounded-xl bg-surface-sunk p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-surface-ink">{d.delegate_name}</p>
                        <p className="text-xs text-surface-muted">{d.delegate_email} · {d.relationship}</p>
                        <p className="text-xs text-surface-muted">Access: {d.access_level.replace('_', ' ')}</p>
                      </div>
                      <button className="text-xs text-brand-coral hover:underline"
                        onClick={() => { if (confirm('Remove this delegate?')) deleteDelegateMutation.mutate(d.id); }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
