// ─── Burnout Insights — Enhancement 26 (Burnout Pattern Detection) ───────────
// Propel Stack AI, LLC

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, TrendingDown, CheckCircle2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = 'low' | 'moderate' | 'high';

interface BurnoutStatus {
  risk_score: number;
  risk_level: RiskLevel;
  signals_detected: number;
  intervention: string | null;
  last_evaluated_at: string | null;
}

interface BurnoutSignal {
  id: number;
  signal_type: string;
  signal_value: number;
  detected_at: string;
}

// ─── Risk Ring ────────────────────────────────────────────────────────────────

const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string; ring: string }> = {
  low:      { label: 'Low Risk',      color: '#16a34a', bg: '#f0fdf4', ring: '#22c55e', },
  moderate: { label: 'Moderate Risk', color: '#d97706', bg: '#fffbeb', ring: '#f59e0b', },
  high:     { label: 'High Risk',     color: '#dc2626', bg: '#fef2f2', ring: '#ef4444', },
};

function RiskRing({ score, level }: { score: number; level: RiskLevel }) {
  const meta = RISK_META[level];
  const radius = 44;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (circ * Math.min(score, 100)) / 100;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={104} height={104} aria-hidden>
        <circle cx={52} cy={52} r={radius} fill="none" stroke="rgba(26,22,37,0.06)" strokeWidth={8} />
        <circle
          cx={52} cy={52} r={radius}
          fill="none"
          stroke={meta.ring}
          strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 52 52)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display font-bold" style={{ color: meta.color }}>{score}</span>
        <span className="text-[10px] font-semibold text-surface-muted">/ 100</span>
      </div>
    </div>
  );
}

// ─── Signal Type Labels ───────────────────────────────────────────────────────

const SIGNAL_LABELS: Record<string, string> = {
  low_mood:           'Low average mood',
  low_task_completion:'Low task completion rate',
  low_energy:         'Low energy levels',
  low_journal_freq:   'Reduced journaling frequency',
  high_risk_override: 'Manual override',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BurnoutInsights() {
  const qc = useQueryClient();
  const [signalsOpen, setSignalsOpen] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['burnout-status'],
    queryFn: () => apiRequest<BurnoutStatus>('/api/burnout/status'),
  });

  const { data: signalsData } = useQuery({
    queryKey: ['burnout-signals'],
    queryFn: () => apiRequest<{ signals: BurnoutSignal[] }>('/api/burnout/signals'),
    enabled: signalsOpen,
  });

  const dismiss = useMutation({
    mutationFn: () =>
      apiRequest('/api/burnout/dismiss', { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['burnout-status'] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-sunk rounded-lg animate-pulse" />
        <div className="h-48 bg-surface-sunk rounded-xl2 animate-pulse" />
      </div>
    );
  }

  const riskLevel  = status?.risk_level  ?? 'low';
  const riskScore  = status?.risk_score  ?? 0;
  const intervention = status?.intervention;
  const meta = RISK_META[riskLevel];
  const signals = signalsData?.signals ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={22} className="text-brand-coral" />
          <h1 className="font-display text-2xl font-bold text-surface-ink dark:text-white">Burnout Insights</h1>
        </div>
        <p className="text-sm text-surface-muted">
          Propel Stack AI monitors patterns across your mood, energy, tasks, and habits to detect early burnout signals.
        </p>
      </div>

      {/* Risk card */}
      <div className="card" style={{ borderLeft: `4px solid ${meta.ring}` }}>
        <div className="flex items-center gap-6">
          <RiskRing score={riskScore} level={riskLevel} />
          <div className="flex-1">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-2"
              style={{ background: meta.bg, color: meta.color }}
            >
              <ShieldAlert size={11} />
              {meta.label}
            </div>
            <p className="text-sm text-surface-ink dark:text-white leading-relaxed">
              {riskLevel === 'low' && 'You\'re doing great. No significant burnout signals detected in the past two weeks.'}
              {riskLevel === 'moderate' && 'A few warning signals detected. Consider taking some recovery time or adjusting your workload.'}
              {riskLevel === 'high' && 'Multiple burnout signals detected. We recommend pausing, resting, and speaking with someone you trust.'}
            </p>
            {status?.signals_detected != null && status.signals_detected > 0 && (
              <p className="text-xs text-surface-muted mt-1">
                {status.signals_detected} signal{status.signals_detected !== 1 ? 's' : ''} detected in the last 14 days
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Intervention */}
      {intervention && (
        <div
          className="card space-y-3"
          style={{ background: `${meta.bg}`, borderColor: `${meta.ring}30` }}
        >
          <div className="flex items-center gap-2">
            <TrendingDown size={16} style={{ color: meta.color }} />
            <p className="font-semibold text-sm" style={{ color: meta.color }}>Personalized check-in</p>
          </div>
          <p className="text-sm text-surface-ink dark:text-white/90 leading-relaxed">{intervention}</p>

          {riskLevel !== 'low' && (
            <button
              type="button"
              onClick={() => dismiss.mutate()}
              disabled={dismiss.isPending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-muted hover:text-surface-ink dark:hover:text-white transition-colors"
            >
              <CheckCircle2 size={13} />
              {dismiss.isPending ? 'Marking…' : 'I\'ve addressed this'}
            </button>
          )}
        </div>
      )}

      {/* Signals accordion */}
      <div className="card">
        <button
          type="button"
          onClick={() => setSignalsOpen(v => !v)}
          className="w-full flex items-center justify-between"
          aria-expanded={signalsOpen}
        >
          <span className="font-semibold text-sm text-surface-ink dark:text-white">Signal details</span>
          {signalsOpen ? <ChevronUp size={16} className="text-surface-muted" /> : <ChevronDown size={16} className="text-surface-muted" />}
        </button>

        {signalsOpen && (
          <div className="mt-4 space-y-2">
            {signals.length === 0 ? (
              <p className="text-sm text-surface-muted text-center py-4">No signals recorded yet.</p>
            ) : (
              signals.map(sig => (
                <div key={sig.id} className="flex items-start gap-3 py-2 border-b border-surface-ink/[0.06] dark:border-white/[0.06] last:border-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: sig.signal_value > 50 ? meta.ring : '#22c55e' }}
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-surface-ink dark:text-white">
                      {SIGNAL_LABELS[sig.signal_type] ?? sig.signal_type}
                    </p>
                    <p className="text-xs text-surface-muted">
                      Score: {sig.signal_value.toFixed(0)} · {new Date(sig.detected_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Recompute hint */}
      <div className="flex items-center gap-2 text-xs text-surface-muted">
        <RefreshCw size={12} />
        <span>Risk score is recomputed automatically when you log mood, energy, or complete tasks.</span>
      </div>

      {/* Recovery tips */}
      <div className="card space-y-3">
        <p className="font-semibold text-sm text-surface-ink dark:text-white">Recovery tips</p>
        <ul className="space-y-2">
          {[
            { emoji: '😴', tip: 'Prioritize 7–9 hours of sleep consistently.' },
            { emoji: '🚶', tip: 'Take short walks — even 10 minutes reduces cortisol.' },
            { emoji: '📵', tip: 'Set device-free hours in the evening.' },
            { emoji: '🗣️', tip: 'Talk to someone you trust about what\'s on your mind.' },
            { emoji: '🎯', tip: 'Say no to one non-essential commitment this week.' },
          ].map(({ emoji, tip }) => (
            <li key={tip} className="flex items-start gap-2.5">
              <span className="text-base mt-0.5 shrink-0">{emoji}</span>
              <p className="text-xs text-surface-ink dark:text-white/80 leading-relaxed">{tip}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] text-surface-muted/60 text-center pb-2">
        Propel Stack AI is not a medical provider. If you are experiencing a mental health crisis, please contact a professional.
      </p>
    </div>
  );
}
