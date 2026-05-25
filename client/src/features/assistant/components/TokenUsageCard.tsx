/**
 * Token Usage Card — Enhancement 20 (Token Usage Visualization)
 *
 * Visual token meter showing monthly usage, remaining budget,
 * cost estimate, and upgrade CTA when approaching limit.
 */
import { useState } from 'react';
import { Zap, TrendingUp } from 'lucide-react';
import { useUsage } from '../api';
import { UpgradeModal } from '../../../components/UpgradeModal';
import { PLAN_MAP } from '../../../lib/pricing';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** Days until the 1st of next month */
function daysUntilReset(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.ceil((next.getTime() - now.getTime()) / 86_400_000);
}

export function TokenUsageCard({ compact = false }: { compact?: boolean }) {
  const { data } = useUsage();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!data) return null;

  const pct = data.budget > 0 ? Math.min(100, (data.used / data.budget) * 100) : 0;
  const isWarning = pct >= 80;
  const isCritical = pct >= 95;
  const barColor = isCritical ? '#DC2626' : isWarning ? '#F59E0B' : '#4F35C2';
  const days = daysUntilReset();
  const planInfo = PLAN_MAP[data.planTier as keyof typeof PLAN_MAP];

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-sunk">
        <Zap size={12} color={barColor} />
        <div className="flex-1 min-w-0">
          <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>
        <span className="text-[10px] text-surface-muted flex-shrink-0">
          {fmt(data.remaining)} left
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={15} color={barColor} />
            <h3 className="font-display font-bold text-sm text-surface-ink">AI Token Usage</h3>
          </div>
          <span className="text-[11px] text-surface-muted capitalize">
            {planInfo?.name ?? data.planTier} plan
          </span>
        </div>

        {/* Main progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-surface-muted">{fmt(data.used)} used</span>
            <span className="text-xs text-surface-muted">{fmt(data.budget)} total</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-sunk overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] font-semibold" style={{ color: barColor }}>
              {pct.toFixed(0)}% used
            </span>
            <span className="text-[11px] text-surface-muted">
              {fmt(data.remaining)} remaining · resets in {days}d
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-xl bg-surface-sunk px-3 py-2">
            <p className="text-[10px] text-surface-muted uppercase tracking-wide font-semibold mb-0.5">Used</p>
            <p className="font-display font-bold text-base text-surface-ink">{fmt(data.used)}</p>
          </div>
          <div className="rounded-xl bg-surface-sunk px-3 py-2">
            <p className="text-[10px] text-surface-muted uppercase tracking-wide font-semibold mb-0.5">Remaining</p>
            <p className="font-display font-bold text-base text-surface-ink">{fmt(data.remaining)}</p>
          </div>
        </div>

        {/* Warning / upgrade CTA */}
        {isWarning && (
          <div
            className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ background: isCritical ? '#FEF2F2' : '#FFFBEB', borderLeft: `3px solid ${barColor}` }}
          >
            <TrendingUp size={14} color={barColor} className="flex-shrink-0" />
            <p className="text-xs flex-1" style={{ color: barColor }}>
              {isCritical ? 'Budget nearly exhausted.' : 'Approaching monthly limit.'}{' '}
              {planInfo && PLAN_MAP[data.planTier as keyof typeof PLAN_MAP]?.id !== 'elite' && (
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="font-semibold underline"
                >
                  Upgrade for more tokens →
                </button>
              )}
            </p>
          </div>
        )}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason="budget" />
    </>
  );
}
