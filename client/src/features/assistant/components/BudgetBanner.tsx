/**
 * Budget Banner — Enhancement 19 (Contextual Upgrade Prompts)
 *
 * Shows when user is at 90%+ of monthly token budget.
 * Upgraded to show the UpgradeModal when clicked.
 */
import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useUsage } from '../api';
import { UpgradeModal } from '../../../components/UpgradeModal';
import { nextPlan } from '../../../lib/pricing';

export function BudgetBanner() {
  const { data } = useUsage();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!data || data.budget <= 0) return null;
  const pct = data.used / data.budget;
  if (pct < 0.9) return null;

  const isCritical = pct >= 1;
  const next = nextPlan(data.planTier);

  return (
    <>
      <div
        className="rounded-xl px-3 py-2.5 flex items-center gap-2"
        style={{
          background: isCritical ? '#FEF2F2' : '#FFFBEB',
          border: `1px solid ${isCritical ? '#FECACA' : '#FDE68A'}`,
        }}
      >
        <Zap size={14} color={isCritical ? '#DC2626' : '#F59E0B'} className="flex-shrink-0" />
        <p className="text-xs flex-1" style={{ color: isCritical ? '#991B1B' : '#92400E' }}>
          {isCritical
            ? 'Monthly token budget reached.'
            : `${data.remaining.toLocaleString()} tokens remaining this month.`}
          {next && (
            <>
              {' '}
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="font-semibold underline"
              >
                Upgrade to {next.name} for {next.tokenLabel}
              </button>
            </>
          )}
        </p>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="budget"
      />
    </>
  );
}
