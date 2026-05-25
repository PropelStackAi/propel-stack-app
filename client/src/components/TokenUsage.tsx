/**
 * TokenUsage — Phase 2 Step 11
 * Propel Stack AI, LLC
 *
 * Visual AI token budget meter with category breakdown.
 * Upgrade CTA appears at 80% usage threshold.
 */

import { useQuery } from '@tanstack/react-query';
import { Zap, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenBudget {
  used: number;
  budget: number;
  plan: string;
  burn_rate_per_day: number;
  days_remaining: number;
  breakdown: {
    ai_chat: number;
    morning_briefing: number;
    weekly_review: number;
    background_analysis: number;
  };
}

const PLAN_NEXT: Record<string, { name: string; tokens: string }> = {
  spark:   { name: 'Solo',    tokens: '500K' },
  solo:    { name: 'Family',  tokens: '2M'   },
  family:  { name: 'Network', tokens: '5M'   },
  network: { name: 'Elite',   tokens: '15M'  },
  elite:   { name: 'Elite',   tokens: '15M'  },
};

const BREAKDOWN_LABELS: Record<string, string> = {
  ai_chat:            'AI Chat',
  morning_briefing:   'Morning Briefing',
  weekly_review:      'Weekly Review',
  background_analysis:'Background Analysis',
};

const BREAKDOWN_COLORS: Record<string, string> = {
  ai_chat:            'bg-brand-indigo',
  morning_briefing:   'bg-brand-teal',
  weekly_review:      'bg-brand-orange',
  background_analysis:'bg-brand-purple',
};

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TokenUsage({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery<TokenBudget>({
    queryKey: ['token-budget'],
    queryFn: () => apiRequest('/api/assistant/token-budget'),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-surface-muted text-sm py-2">
        <Loader2 size={14} className="animate-spin" />
        Loading usage…
      </div>
    );
  }

  if (!data) return null;

  const usedPct = pct(data.used, data.budget);
  const isWarning = usedPct >= 80;
  const isCritical = usedPct >= 95;

  const meterColor = isCritical
    ? 'bg-red-500'
    : isWarning
    ? 'bg-brand-orange'
    : 'bg-brand-indigo';

  const nextPlan = PLAN_NEXT[data.plan] ?? PLAN_NEXT.spark;

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-surface-muted font-medium">AI Tokens</span>
          <span className={`font-semibold ${isCritical ? 'text-red-500' : isWarning ? 'text-brand-orange' : 'text-surface-ink dark:text-white'}`}>
            {fmtK(data.used)} / {fmtK(data.budget)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-sunk overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${meterColor}`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-brand-indigo" />
        <h3 className="font-display text-base font-bold text-surface-ink dark:text-white">AI Token Usage</h3>
        <span className="ml-auto text-xs font-semibold text-surface-muted uppercase tracking-wide">
          {data.plan} plan
        </span>
      </div>

      {/* Main meter */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-surface-ink dark:text-white">{fmtK(data.used)}</span>
          <span className="text-sm text-surface-muted">of {fmtK(data.budget)}</span>
        </div>
        <div className="h-3 rounded-full bg-surface-sunk overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${meterColor}`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-surface-muted">
          <span>{usedPct}% used</span>
          <span className="flex items-center gap-1">
            <TrendingUp size={11} />
            ~{data.days_remaining} days remaining at current rate
          </span>
        </div>
      </div>

      {/* Upgrade CTA at 80% */}
      {isWarning && data.plan !== 'elite' && (
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${isCritical ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : 'border-brand-orange/30 bg-brand-orange/5'}`}>
          <AlertTriangle size={16} className={isCritical ? 'text-red-500' : 'text-brand-orange'} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-brand-orange'}`}>
              {isCritical ? 'Budget nearly exhausted' : 'Approaching limit'}
            </p>
            <p className="text-xs text-surface-muted mt-0.5">
              Upgrade to <b>{nextPlan.name}</b> for {nextPlan.tokens} tokens/month
            </p>
          </div>
          <a
            href="/#/plans"
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-brand-indigo text-white hover:brightness-110 transition-all"
          >
            Upgrade
          </a>
        </div>
      )}

      {/* Breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Breakdown by feature</p>
        {Object.entries(data.breakdown).map(([key, val]) => {
          const share = pct(val, data.used || 1);
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-surface-ink dark:text-white">{BREAKDOWN_LABELS[key] ?? key}</span>
                <span className="text-surface-muted">{fmtK(val)} ({share}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-sunk overflow-hidden">
                <div
                  className={`h-full rounded-full ${BREAKDOWN_COLORS[key] ?? 'bg-brand-indigo'}`}
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
