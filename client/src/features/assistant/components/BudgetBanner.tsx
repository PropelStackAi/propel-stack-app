import { useUsage } from '../api';
import { UPGRADE_HINT } from '../types';

/** Persistent banner when the user has consumed >= 90% of their monthly token budget. */
export function BudgetBanner() {
  const { data } = useUsage();
  if (!data || data.budget <= 0) return null;
  if (data.used / data.budget < 0.9) return null;

  return (
    <div className="rounded-lg bg-brand-coral/10 ring-1 ring-brand-coral/20 px-3 py-2 text-sm text-brand-coral">
      You have {data.remaining.toLocaleString()} tokens remaining this month.{' '}
      {UPGRADE_HINT[data.planTier] ? <span className="font-semibold">{UPGRADE_HINT[data.planTier]}</span> : null}
    </div>
  );
}
