/**
 * Memory Hub — Memory Health Card
 * Propel Stack AI, LLC
 *
 * Enhancement 18: Memory Reset Controls / Memory Health Card
 * Shows what AI knows about the user (semantic + procedural memories),
 * recent episodic entries, detected trends, and full reset controls.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import {
  Brain, Zap, RefreshCw, Trash2, ChevronDown, ChevronUp,
  ShieldCheck, BarChart2, Clock, AlertTriangle, Check, X,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemoryEntry {
  id: string;
  namespace: 'episodic' | 'semantic' | 'procedural';
  content: string;
  context_key: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryTrend {
  id: string;
  trend_type: string;
  description: string;
  confidence: number;
  created_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  namespace: string | null;
  description: string | null;
  created_at: string;
}

interface MemoryHealthData {
  episodic: MemoryEntry[];
  semantic: MemoryEntry[];
  procedural: MemoryEntry[];
  trends: MemoryTrend[];
  auditLog: AuditEntry[];
  totalCount: number;
  oldestEntry: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  return formatDate(s);
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? '#01696F' : pct >= 50 ? '#F05A28' : '#9F9A94';
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>
      {pct}% confidence
    </span>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

function MemorySection({
  title, icon: Icon, count, color, items, onDelete, defaultOpen = false,
}: {
  title: string;
  icon: LucideIcon;
  count: number;
  color: string;
  items: MemoryEntry[];
  onDelete?: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-sunk/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
            <Icon size={16} className="shrink-0" color={color} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-surface-ink">{title}</p>
            <p className="text-xs text-surface-muted">{count} {count === 1 ? 'entry' : 'entries'}</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-surface-muted" /> : <ChevronDown size={16} className="text-surface-muted" />}
      </button>

      {open && (
        <div className="border-t border-surface-border divide-y divide-surface-border">
          {items.length === 0 ? (
            <p className="px-5 py-4 text-sm text-surface-muted italic">No memories yet.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-start justify-between gap-3 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-ink leading-snug">{item.content}</p>
                  <p className="text-[11px] text-surface-muted mt-0.5">{formatRelative(item.created_at)}</p>
                </div>
                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-surface-muted hover:text-brand-coral transition-all"
                    aria-label="Delete memory"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reset dialog ─────────────────────────────────────────────────────────────

type ResetType = 'soft' | 'hard';

function ResetDialog({
  namespace, type, onConfirm, onCancel,
}: {
  namespace: string; type: ResetType; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-coral/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-brand-coral" />
          </div>
          <div>
            <h3 className="font-bold text-surface-ink">
              {type === 'soft' ? 'Soft Reset' : 'Hard Reset (Permanent)'}
            </h3>
            <p className="text-xs text-surface-muted capitalize">{namespace} memories</p>
          </div>
        </div>
        <p className="text-sm text-surface-muted mb-6">
          {type === 'soft'
            ? `This will mark all ${namespace} memories as stale. The AI will no longer use them but they are not deleted.`
            : `This will permanently delete all ${namespace} memories. This cannot be undone.`}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-sm text-white transition-colors"
            style={{ background: type === 'hard' ? '#dc2626' : '#F05A28' }}
          >
            {type === 'soft' ? 'Mark Stale' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MemoryHub() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'trends'>('overview');
  const [resetDialog, setResetDialog] = useState<{ namespace: string; type: ResetType } | null>(null);
  const [analyzeToast, setAnalyzeToast] = useState(false);

  const { data, isLoading } = useQuery<MemoryHealthData>({
    queryKey: ['memory-health'],
    queryFn: () => apiRequest('/api/memory/health'),
  });

  const deleteMem = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/memory/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memory-health'] }),
  });

  const softReset = useMutation({
    mutationFn: (namespace: string) =>
      apiRequest('/api/memory/soft-reset', { method: 'POST', body: JSON.stringify({ namespace }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory-health'] });
      setResetDialog(null);
    },
  });

  const hardReset = useMutation({
    mutationFn: (namespace: string) =>
      apiRequest('/api/memory/hard-reset', { method: 'POST', body: JSON.stringify({ namespace }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory-health'] });
      setResetDialog(null);
    },
  });

  const analyze = useMutation({
    mutationFn: () => apiRequest('/api/memory/analyze', { method: 'POST' }),
    onSuccess: () => {
      setAnalyzeToast(true);
      setTimeout(() => setAnalyzeToast(false), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-surface-muted text-sm">
        Loading your memory data…
      </div>
    );
  }

  const health = data!;
  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'trends', label: `Trends (${health.trends?.length ?? 0})` },
    { id: 'audit', label: 'Audit Log' },
  ] as const;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-surface-ink flex items-center gap-2">
            <Brain size={24} className="text-brand-indigo" />
            Memory Health
          </h1>
          <p className="text-sm text-surface-muted mt-1">
            What your AI knows about you — view, edit, or reset at any time.
          </p>
        </div>
        <button
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending}
          className="btn btn-ghost flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={analyze.isPending ? 'animate-spin' : ''} />
          Analyze Now
        </button>
      </div>

      {/* Toast */}
      {analyzeToast && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-sm font-medium">
          <Check size={16} />
          Memory analysis queued — results update within minutes.
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Total Memories', value: health.totalCount, icon: Brain, color: '#4F35C2' },
          { label: 'About You', value: health.semantic?.length ?? 0, icon: ShieldCheck, color: '#01696F' },
          { label: 'Preferences', value: health.procedural?.length ?? 0, icon: Zap, color: '#F05A28' },
          { label: 'Trends Found', value: health.trends?.length ?? 0, icon: BarChart2, color: '#6B21A8' },
        ] as { label: string; value: number; icon: LucideIcon; color: string }[]).map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-surface-raised border border-surface-border p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <p className="font-bold text-xl text-surface-ink leading-none">{value}</p>
              <p className="text-[11px] text-surface-muted mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-sunk rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: activeTab === t.id ? '#fff' : 'transparent',
              color: activeTab === t.id ? '#1A1614' : '#9F9A94',
              boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* What AI knows about you */}
          <MemorySection
            title="What AI Knows About You"
            icon={ShieldCheck}
            color="#01696F"
            count={health.semantic?.length ?? 0}
            items={health.semantic ?? []}
            onDelete={(id) => deleteMem.mutate(id)}
            defaultOpen
          />

          {/* Preferences */}
          <MemorySection
            title="Your Preferences & Style"
            icon={Zap}
            color="#F05A28"
            count={health.procedural?.length ?? 0}
            items={health.procedural ?? []}
            onDelete={(id) => deleteMem.mutate(id)}
            defaultOpen
          />

          {/* Recent episodic */}
          <MemorySection
            title="Recent Activity Log"
            icon={Clock}
            color="#4F35C2"
            count={health.episodic?.length ?? 0}
            items={health.episodic?.slice(0, 20) ?? []}
            onDelete={(id) => deleteMem.mutate(id)}
          />

          {/* Reset controls */}
          <div className="rounded-xl border border-surface-border bg-surface-raised p-5 space-y-4">
            <h3 className="font-semibold text-surface-ink">Reset Controls</h3>
            <p className="text-sm text-surface-muted">
              Overconfident personalization can feel intrusive. Use these controls to correct what your AI remembers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['episodic', 'semantic', 'procedural', 'all'] as const).map((ns) => (
                <div key={ns} className="p-4 rounded-xl bg-surface-sunk space-y-3">
                  <p className="text-sm font-semibold text-surface-ink capitalize">{ns === 'all' ? 'All Memories' : `${ns} Memory`}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setResetDialog({ namespace: ns, type: 'soft' })}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border border-surface-border text-surface-muted hover:text-surface-ink hover:border-brand-coral/40 transition-colors"
                    >
                      Soft Reset
                    </button>
                    <button
                      onClick={() => setResetDialog({ namespace: ns, type: 'hard' })}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border border-brand-coral/30 text-brand-coral hover:bg-brand-coral/5 transition-colors"
                    >
                      Delete All
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Oldest memory */}
          {health.oldestEntry && (
            <p className="text-xs text-surface-muted text-center">
              Memory history starts {formatDate(health.oldestEntry)}
            </p>
          )}
        </div>
      )}

      {/* ── Trends tab ── */}
      {activeTab === 'trends' && (
        <div className="space-y-3">
          {(!health.trends || health.trends.length === 0) ? (
            <div className="rounded-xl bg-surface-raised border border-surface-border p-10 text-center">
              <BarChart2 size={32} className="mx-auto text-surface-muted mb-3" />
              <p className="font-semibold text-surface-ink">No trends detected yet</p>
              <p className="text-sm text-surface-muted mt-1">
                Trends emerge after 2+ weeks of activity. Click "Analyze Now" to check.
              </p>
            </div>
          ) : (
            health.trends.map((trend) => (
              <div key={trend.id} className="rounded-xl bg-surface-raised border border-surface-border p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-semibold text-surface-ink text-sm leading-snug">{trend.description}</p>
                  <ConfidenceBadge value={trend.confidence} />
                </div>
                <p className="text-xs text-surface-muted">
                  Detected {formatRelative(trend.created_at)} · Type: {trend.trend_type.replace(/_/g, ' ')}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Audit tab ── */}
      {activeTab === 'audit' && (
        <div className="rounded-xl border border-surface-border bg-surface-raised overflow-hidden">
          {(!health.auditLog || health.auditLog.length === 0) ? (
            <p className="p-6 text-sm text-surface-muted italic text-center">No audit entries yet.</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {health.auditLog.map((entry) => (
                <div key={entry.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-surface-sunk flex items-center justify-center shrink-0 mt-0.5">
                    {entry.action.includes('reset') || entry.action.includes('delete') ? (
                      <X size={12} className="text-brand-coral" />
                    ) : (
                      <Check size={12} className="text-brand-teal" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-ink font-medium capitalize">
                      {entry.action.replace(/_/g, ' ')}
                      {entry.namespace && <span className="text-surface-muted font-normal"> · {entry.namespace}</span>}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-surface-muted mt-0.5 truncate">{entry.description}</p>
                    )}
                    <p className="text-[11px] text-surface-muted mt-0.5">{formatRelative(entry.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reset dialog */}
      {resetDialog && (
        <ResetDialog
          namespace={resetDialog.namespace}
          type={resetDialog.type}
          onCancel={() => setResetDialog(null)}
          onConfirm={() => {
            if (resetDialog.type === 'soft') {
              softReset.mutate(resetDialog.namespace);
            } else {
              hardReset.mutate(resetDialog.namespace);
            }
          }}
        />
      )}
    </div>
  );
}
