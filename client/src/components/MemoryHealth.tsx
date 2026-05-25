/**
 * MemoryHealth — Phase 2 Step 10
 * Propel Stack AI, LLC
 *
 * Trust & control layer for the Three-Tier Memory System.
 * Shows counts by type, oldest/newest dates, recent memory list
 * with delete, pin, soft-reset, and full-reset controls.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain,
  Trash2,
  Pin,
  PinOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemoryHealth {
  counts: { episodic: number; semantic: number; procedural: number };
  oldest_at: string | null;
  newest_at: string | null;
  stale_count: number;
  pinned_count: number;
}

interface Memory {
  id: string;
  namespace: 'episodic' | 'semantic' | 'procedural';
  content: string;
  is_pinned: boolean;
  is_stale: boolean;
  created_at: string;
}

type ResetMode = 'soft' | 'hard';
type Namespace = 'episodic' | 'semantic' | 'procedural' | 'all';

const NS_COLORS: Record<string, string> = {
  episodic:   'bg-brand-indigo/10 text-brand-indigo',
  semantic:   'bg-brand-teal/10 text-brand-teal',
  procedural: 'bg-brand-orange/10 text-brand-orange',
};

const NS_LABELS: Record<string, string> = {
  episodic:   'Episodic',
  semantic:   'Semantic',
  procedural: 'Procedural',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card text-center py-3 px-4">
      <p className="text-2xl font-bold text-surface-ink dark:text-white">{value.toLocaleString()}</p>
      <p className="text-xs font-semibold text-surface-muted mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-surface-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function MemoryRow({
  memory,
  onDelete,
  onPin,
}: {
  memory: Memory;
  onDelete: (id: string) => void;
  onPin: (id: string, current: boolean) => void;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${memory.is_stale ? 'border-surface-ink/5 opacity-50' : 'border-surface-ink/[0.08] dark:border-white/[0.08]'}`}>
      <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${NS_COLORS[memory.namespace]}`}>
        {NS_LABELS[memory.namespace]}
      </span>
      <p className="flex-1 text-sm text-surface-ink dark:text-white line-clamp-2">
        {memory.content}
      </p>
      <div className="shrink-0 flex items-center gap-1">
        <span className="text-[10px] text-surface-muted">{fmt(memory.created_at)}</span>
        <button
          type="button"
          onClick={() => onPin(memory.id, memory.is_pinned)}
          className="p-1 rounded hover:bg-surface-sunk text-surface-muted hover:text-brand-indigo transition-colors"
          title={memory.is_pinned ? 'Unpin' : 'Pin — never expires'}
        >
          {memory.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
        <button
          type="button"
          onClick={() => onDelete(memory.id)}
          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-muted hover:text-red-500 transition-colors"
          title="Delete memory"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MemoryHealth() {
  const qc = useQueryClient();
  const [showRecent, setShowRecent] = useState(true);
  const [confirmReset, setConfirmReset] = useState<{ mode: ResetMode; ns: Namespace } | null>(null);
  const [confirmToken, setConfirmToken] = useState('');

  // Health summary
  const { data: health, isLoading } = useQuery<MemoryHealth>({
    queryKey: ['memory-health'],
    queryFn: () => apiRequest('/api/memory/health'),
  });

  // Recent episodic memories (30)
  const { data: recent = [] } = useQuery<Memory[]>({
    queryKey: ['memory-recent'],
    queryFn: () => apiRequest('/api/memory/episodic?limit=30'),
  });

  // Pinned memories
  const { data: pinned = [] } = useQuery<Memory[]>({
    queryKey: ['memory-pinned'],
    queryFn: () => apiRequest('/api/memory/episodic?limit=50'),
    select: (rows) => rows.filter((r) => r.is_pinned),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['memory-health'] });
    qc.invalidateQueries({ queryKey: ['memory-recent'] });
    qc.invalidateQueries({ queryKey: ['memory-pinned'] });
  };

  // Delete single
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/memory/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  // Toggle pin
  const pinMutation = useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) =>
      apiRequest(`/api/memory/${id}/pin`, { method: 'PATCH', body: { pinned: !current } }),
    onSuccess: invalidate,
  });

  // Soft reset
  const softReset = useMutation({
    mutationFn: (namespace: Namespace) =>
      apiRequest('/api/memory/soft-reset', { method: 'POST', body: { namespace } }),
    onSuccess: () => { setConfirmReset(null); invalidate(); },
  });

  // Hard reset (full delete)
  const hardReset = useMutation({
    mutationFn: (namespace: Namespace) =>
      apiRequest('/api/memory/hard-reset', { method: 'POST', body: { namespace } }),
    onSuccess: () => { setConfirmReset(null); setConfirmToken(''); invalidate(); },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-surface-muted gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading memory health…</span>
      </div>
    );
  }

  const counts = health?.counts ?? { episodic: 0, semantic: 0, procedural: 0 };
  const total = counts.episodic + counts.semantic + counts.procedural;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain size={18} className="text-brand-indigo" />
        <h2 className="font-display text-lg font-bold text-surface-ink dark:text-white">Memory Health</h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Memories" value={total} />
        <StatCard label="Episodic" value={counts.episodic} sub="recent events" />
        <StatCard label="Semantic" value={counts.semantic} sub="beliefs & prefs" />
        <StatCard label="Procedural" value={counts.procedural} sub="habits & patterns" />
      </div>

      {/* Date range + stale + pinned */}
      <div className="card flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5 text-surface-muted">
          <Clock size={13} />
          <span>Oldest: <b className="text-surface-ink dark:text-white">{fmt(health?.oldest_at ?? null)}</b></span>
        </span>
        <span className="flex items-center gap-1.5 text-surface-muted">
          <CheckCircle2 size={13} />
          <span>Newest: <b className="text-surface-ink dark:text-white">{fmt(health?.newest_at ?? null)}</b></span>
        </span>
        <span className="flex items-center gap-1.5 text-surface-muted">
          <AlertTriangle size={13} className="text-amber-500" />
          <span>Stale: <b className="text-amber-600 dark:text-amber-400">{health?.stale_count ?? 0}</b></span>
        </span>
        <span className="flex items-center gap-1.5 text-surface-muted">
          <Pin size={13} className="text-brand-indigo" />
          <span>Pinned: <b className="text-brand-indigo">{health?.pinned_count ?? 0}</b></span>
        </span>
      </div>

      {/* Pinned section */}
      {pinned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide flex items-center gap-1">
            <Pin size={11} /> Pinned — never expire
          </p>
          <div className="space-y-2">
            {pinned.map((m) => (
              <MemoryRow
                key={m.id}
                memory={m}
                onDelete={(id) => deleteMutation.mutate(id)}
                onPin={(id, cur) => pinMutation.mutate({ id, current: cur })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent memories */}
      <div>
        <button
          type="button"
          onClick={() => setShowRecent((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2"
        >
          {showRecent ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          Recent Memories ({recent.length})
        </button>
        {showRecent && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {recent.length === 0 && (
              <p className="text-sm text-surface-muted py-4 text-center">No memories yet</p>
            )}
            {recent.map((m) => (
              <MemoryRow
                key={m.id}
                memory={m}
                onDelete={(id) => deleteMutation.mutate(id)}
                onPin={(id, cur) => pinMutation.mutate({ id, current: cur })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reset controls */}
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-surface-ink dark:text-white flex items-center gap-2">
          <RefreshCw size={14} className="text-surface-muted" />
          Memory Reset
        </p>
        <p className="text-xs text-surface-muted">
          <b>Soft Reset</b> marks memories as stale — they stop influencing AI but are not deleted (reversible).
          <br />
          <b>Full Reset</b> permanently deletes all unpinned memories in the selected namespace.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['episodic', 'semantic', 'procedural', 'all'] as Namespace[]).map((ns) => (
            <button
              key={ns}
              type="button"
              onClick={() => setConfirmReset({ mode: 'soft', ns })}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              Soft Reset {ns}
            </button>
          ))}
          {(['episodic', 'semantic', 'procedural', 'all'] as Namespace[]).map((ns) => (
            <button
              key={ns}
              type="button"
              onClick={() => setConfirmReset({ mode: 'hard', ns })}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Full Reset {ns}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-surface-ink dark:text-white">
                  {confirmReset.mode === 'soft' ? 'Soft Reset' : 'Full Reset'} — {confirmReset.ns}
                </p>
                {confirmReset.mode === 'hard' ? (
                  <p className="text-xs text-surface-muted mt-1">
                    This permanently deletes all unpinned <b>{confirmReset.ns}</b> memories. Type{' '}
                    <code className="bg-surface-sunk px-1 rounded">DELETE</code> to confirm.
                  </p>
                ) : (
                  <p className="text-xs text-surface-muted mt-1">
                    All <b>{confirmReset.ns}</b> memories older than 30 days will be marked stale. This is reversible.
                  </p>
                )}
              </div>
            </div>

            {confirmReset.mode === 'hard' && (
              <input
                type="text"
                className="input w-full text-sm"
                placeholder='Type "DELETE" to confirm'
                value={confirmToken}
                onChange={(e) => setConfirmToken(e.target.value)}
              />
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setConfirmReset(null); setConfirmToken(''); }}
                className="px-4 py-2 rounded-full text-sm font-semibold border border-surface-ink/10 dark:border-white/10 text-surface-muted hover:bg-surface-sunk transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmReset.mode === 'hard' && confirmToken !== 'DELETE'}
                onClick={() => {
                  if (confirmReset.mode === 'soft') softReset.mutate(confirmReset.ns);
                  else hardReset.mutate(confirmReset.ns);
                }}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition-all"
              >
                {(softReset.isPending || hardReset.isPending) ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : confirmReset.mode === 'soft' ? 'Mark Stale' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
