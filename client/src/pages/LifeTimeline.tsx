/**
 * Life Timeline & Memory Archive — Enhancement 29
 * Propel Stack AI, LLC
 *
 * Private chronological archive of life moments.
 * On This Day, monthly AI summaries, Year in Review.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Memory {
  id: string;
  occurred_on: string;
  title: string;
  body: string | null;
  hub_source: string | null;
  memory_type: string;
  photo_url: string | null;
  is_shared: boolean;
  is_private: boolean;
  created_at: string;
}

interface MonthlySummary { summary: string; }

const MEMORY_TYPE_ICONS: Record<string, string> = {
  win: '🏆', goal: '🎯', milestone: '⭐', trip: '✈️',
  manual: '📝', streak: '🔥', baby: '👶',
};

const HUB_SOURCE_LABELS: Record<string, string> = {
  health: 'Health', athlete: 'Athlete', finance: 'Finance', contacts: 'Contacts',
  documents: 'Documents', manual: 'Manual', life_wins: 'Life Wins', goals: 'Goals',
};

function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: (id: string) => void }) {
  return (
    <div className="flex gap-4 group">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <span className="text-2xl">{MEMORY_TYPE_ICONS[memory.memory_type] ?? '📝'}</span>
        <div className="w-px flex-1 bg-surface-ink/10 mt-2" />
      </div>
      <div className="flex-1 pb-6">
        <div className="rounded-xl bg-surface-sunk p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-surface-ink">{memory.title}</p>
              <p className="text-xs text-surface-muted mt-0.5">
                {new Date(memory.occurred_on).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                {memory.hub_source && ` · ${HUB_SOURCE_LABELS[memory.hub_source] ?? memory.hub_source}`}
              </p>
            </div>
            <button
              onClick={() => { if (confirm('Delete this memory?')) onDelete(memory.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-surface-muted hover:text-brand-coral"
            >
              ✕
            </button>
          </div>
          {memory.body && <p className="text-sm text-surface-ink/70 mt-2">{memory.body}</p>}
          {memory.photo_url && (
            <img src={memory.photo_url} alt="" className="mt-3 rounded-lg max-h-40 object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}

export function LifeTimeline() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ occurred_on: '', title: '', body: '', memory_type: 'manual' });
  const [summaryMonth, setSummaryMonth] = useState('');

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['timeline', filterType, filterYear],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterType) params.set('memory_type', filterType);
      if (filterYear) params.set('year', filterYear);
      return apiRequest<Memory[]>(`/api/timeline/memories?${params}`);
    },
  });

  const { data: onThisDay = [] } = useQuery({
    queryKey: ['on-this-day'],
    queryFn: () => apiRequest<Memory[]>('/api/timeline/on-this-day'),
  });

  const { data: years = [] } = useQuery({
    queryKey: ['timeline-years'],
    queryFn: () => apiRequest<number[]>('/api/timeline/years'),
  });

  const { data: summary, refetch: fetchSummary } = useQuery({
    queryKey: ['monthly-summary', summaryMonth],
    queryFn: () => apiRequest<MonthlySummary>(`/api/timeline/monthly-summary${summaryMonth ? `?year=${summaryMonth.split('-')[0]}&month=${summaryMonth.split('-')[1]}` : ''}`),
    enabled: false,
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest<{ id: string }>('/api/timeline/memories', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline'] });
      qc.invalidateQueries({ queryKey: ['timeline-years'] });
      setShowAdd(false);
      setForm({ occurred_on: '', title: '', body: '', memory_type: 'manual' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/timeline/memories/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeline'] }),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Life Timeline</h1>
          <p className="text-sm text-surface-muted mt-1">Your private archive of life moments.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Memory</button>
      </div>

      {/* On This Day */}
      {onThisDay.length > 0 && (
        <section className="card bg-gradient-to-r from-brand-indigo/5 to-brand-purple/5 border border-brand-indigo/20">
          <div className="flex items-center gap-2 mb-3">
            <span>📅</span>
            <h2 className="text-sm font-semibold text-brand-indigo">On This Day</h2>
          </div>
          <div className="space-y-2">
            {onThisDay.map((m) => {
              const yearsAgo = new Date().getFullYear() - new Date(m.occurred_on).getFullYear();
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-xl">{MEMORY_TYPE_ICONS[m.memory_type] ?? '📝'}</span>
                  <div>
                    <p className="text-sm font-medium text-surface-ink">{m.title}</p>
                    <p className="text-xs text-surface-muted">{yearsAgo} year{yearsAgo !== 1 ? 's' : ''} ago</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Monthly AI Summary */}
      <section className="card">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-surface-ink">Monthly AI Summary</h2>
          <input
            type="month"
            className="input text-xs"
            value={summaryMonth}
            onChange={(e) => setSummaryMonth(e.target.value)}
          />
          <button className="btn-ghost text-xs" onClick={() => fetchSummary()}>Generate</button>
        </div>
        {summary?.summary && (
          <div className="mt-3 rounded-xl bg-surface-sunk p-4 text-sm text-surface-ink/80 italic">
            {summary.summary}
          </div>
        )}
      </section>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('')}
          className={`chip text-xs ${!filterType ? 'bg-brand-indigo/10 text-brand-indigo font-semibold' : ''}`}
        >All</button>
        {Object.entries(MEMORY_TYPE_ICONS).map(([type, icon]) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? '' : type)}
            className={`chip text-xs ${filterType === type ? 'bg-brand-indigo/10 text-brand-indigo font-semibold' : ''}`}
          >
            {icon} {type}
          </button>
        ))}
        {years.length > 0 && (
          <select
            className="input text-xs"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="py-10 text-center text-surface-muted text-sm animate-pulse">Loading memories…</div>
      ) : memories.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-5xl mb-3">📖</div>
          <p className="text-surface-muted">No memories yet. Add your first one above.</p>
          <p className="text-xs text-surface-muted mt-1">Life Wins, completed goals, and milestones auto-archive here.</p>
        </div>
      ) : (
        <div>
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      {/* Add Memory Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface-raised rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-ink mb-4">Add Memory</h2>
            <div className="space-y-3">
              <input
                type="date"
                className="input w-full"
                value={form.occurred_on}
                onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
              />
              <input
                type="text"
                className="input w-full"
                placeholder="Memory title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="input w-full h-20 resize-none"
                placeholder="Description (optional)"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
              <select
                className="input w-full"
                value={form.memory_type}
                onChange={(e) => setForm({ ...form, memory_type: e.target.value })}
              >
                {Object.entries(MEMORY_TYPE_ICONS).map(([type, icon]) => (
                  <option key={type} value={type}>{icon} {type}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={!form.occurred_on || !form.title.trim() || addMutation.isPending}
                onClick={() => addMutation.mutate(form)}
              >
                {addMutation.isPending ? 'Saving…' : 'Save Memory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
