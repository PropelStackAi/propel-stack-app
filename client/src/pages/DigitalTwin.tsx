/**
 * Enhancement 36 — AI Personal Digital Twin
 * Propel Stack AI, LLC
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface TwinProfile {
  id: string;
  user_id: string;
  behavioral_model: Record<string, unknown>;
  voice_model: Record<string, unknown>;
  last_updated: string;
}

interface MemoryEntry {
  id: string;
  category: string;
  fact: string;
  confidence: number;
  created_at: string;
}

export function DigitalTwin() {
  const qc = useQueryClient();
  const [question, setQuestion] = useState('');
  const [draftTopic, setDraftTopic] = useState('');
  const [draftType, setDraftType] = useState('message');
  const [askResult, setAskResult] = useState('');
  const [draftResult, setDraftResult] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<TwinProfile | null>({
    queryKey: ['twin-profile'],
    queryFn: () => apiRequest<TwinProfile | null>('/api/twin/profile'),
  });

  const { data: memories = [] } = useQuery<MemoryEntry[]>({
    queryKey: ['twin-memories'],
    queryFn: () => apiRequest<MemoryEntry[]>('/api/twin/memories'),
  });

  const rebuildMutation = useMutation({
    mutationFn: () => apiRequest<{ generated: boolean; profile?: Record<string,unknown>; message?: string }>('/api/twin/rebuild', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['twin-profile'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/twin/memory/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['twin-memories'] }),
  });

  async function handleAsk() {
    if (!question.trim()) return;
    setAskLoading(true);
    try {
      const r = await apiRequest<{ answer: string }>('/api/twin/ask', {
        method: 'POST',
        body: JSON.stringify({ question }),
      });
      setAskResult(r.answer);
    } finally {
      setAskLoading(false);
    }
  }

  async function handleDraft() {
    if (!draftTopic.trim()) return;
    setDraftLoading(true);
    try {
      const r = await apiRequest<{ draft: string }>('/api/twin/draft', {
        method: 'POST',
        body: JSON.stringify({ topic: draftTopic, type: draftType }),
      });
      setDraftResult(r.draft);
    } finally {
      setDraftLoading(false);
    }
  }

  const model = profile?.behavioral_model as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-surface-ink">AI Personal Digital Twin</h1>
        <p className="text-surface-muted text-sm mt-1">Your behavioral profile — built from your Life OS data. 30 days of activity required.</p>
      </div>

      {/* Rebuild */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-surface-ink">Behavioral Profile</h2>
            {profile?.last_updated && (
              <p className="text-xs text-surface-muted">Last updated: {new Date(profile.last_updated).toLocaleDateString()}</p>
            )}
          </div>
          <button
            onClick={() => rebuildMutation.mutate()}
            disabled={rebuildMutation.isPending}
            className="btn-primary text-sm"
          >
            {rebuildMutation.isPending ? 'Rebuilding…' : 'Rebuild Twin'}
          </button>
        </div>

        {rebuildMutation.data?.message && !rebuildMutation.data.generated && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            {rebuildMutation.data.message}
          </div>
        )}

        {model && Object.keys(model).length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {!!model.top_traits && (
              <ProfileCard title="Top Traits" items={model.top_traits as string[]} color="indigo" />
            )}
            {!!model.motivators && (
              <ProfileCard title="Motivators" items={model.motivators as string[]} color="coral" />
            )}
            {!!model.growth_areas && (
              <ProfileCard title="Growth Areas" items={model.growth_areas as string[]} color="teal" />
            )}
            {!!model.decision_tendencies && (
              <ProfileCard title="Decision Tendencies" items={model.decision_tendencies as string[]} color="purple" />
            )}
            {!!model.communication_style && (
              <div className="sm:col-span-2 rounded-lg bg-surface-sunk p-4">
                <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-1">Communication Style</div>
                <p className="text-sm text-surface-ink">{String(model.communication_style)}</p>
              </div>
            )}
            {!!model.recurring_patterns && (
              <div className="sm:col-span-2">
                <ProfileCard title="Recurring Patterns" items={model.recurring_patterns as string[]} color="indigo" />
              </div>
            )}
          </div>
        ) : !profileLoading ? (
          <p className="text-sm text-surface-muted">No profile yet. Click "Rebuild Twin" once you have 30+ days of data.</p>
        ) : (
          <p className="text-sm text-surface-muted">Loading…</p>
        )}
      </div>

      {/* Decision Replay */}
      <div className="card">
        <h2 className="font-semibold text-surface-ink mb-3">Decision Replay — "What Would I Do?"</h2>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Ask about a decision scenario…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
          />
          <button onClick={handleAsk} disabled={askLoading} className="btn-primary whitespace-nowrap">
            {askLoading ? 'Thinking…' : 'Ask Twin'}
          </button>
        </div>
        {askResult && (
          <div className="mt-3 rounded-lg bg-brand-indigo/5 border border-brand-indigo/20 p-4 text-sm text-surface-ink leading-relaxed">
            {askResult}
          </div>
        )}
      </div>

      {/* Draft in Voice */}
      <div className="card">
        <h2 className="font-semibold text-surface-ink mb-3">Draft in Your Voice</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="input flex-1"
            placeholder="Topic to draft…"
            value={draftTopic}
            onChange={e => setDraftTopic(e.target.value)}
          />
          <select className="input w-36" value={draftType} onChange={e => setDraftType(e.target.value)}>
            <option value="message">Message</option>
            <option value="email">Email</option>
            <option value="post">Social Post</option>
            <option value="note">Note</option>
          </select>
          <button onClick={handleDraft} disabled={draftLoading} className="btn-primary whitespace-nowrap">
            {draftLoading ? 'Drafting…' : 'Draft'}
          </button>
        </div>
        {draftResult && (
          <div className="mt-3 rounded-lg bg-surface-sunk p-4 text-sm text-surface-ink leading-relaxed whitespace-pre-wrap font-mono">
            {draftResult}
          </div>
        )}
      </div>

      {/* Memory Entries */}
      {memories.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-surface-ink mb-3">Twin Memory ({memories.length})</h2>
          <div className="space-y-2">
            {memories.map(m => (
              <div key={m.id} className="flex items-start justify-between gap-3 rounded-lg bg-surface-sunk px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <span className="chip text-xs mr-2">{m.category}</span>
                  <span className="text-sm text-surface-ink">{m.fact}</span>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(m.id)}
                  className="text-xs text-red-500 hover:text-red-700 shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  const bg = { indigo: 'bg-brand-indigo/5 border-brand-indigo/20', coral: 'bg-brand-coral/5 border-brand-coral/20', teal: 'bg-brand-teal/5 border-brand-teal/20', purple: 'bg-brand-purple/5 border-brand-purple/20' }[color] ?? 'bg-surface-sunk';
  const chip = { indigo: 'bg-brand-indigo/10 text-brand-indigo', coral: 'bg-brand-coral/10 text-brand-coral', teal: 'bg-brand-teal/10 text-brand-teal', purple: 'bg-brand-purple/10 text-brand-purple' }[color] ?? 'bg-surface-sunk';
  return (
    <div className={`rounded-lg border p-4 ${bg}`}>
      <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${chip}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
