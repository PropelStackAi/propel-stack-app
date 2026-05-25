/**
 * Upgrade Modal — Propel Stack AI, LLC
 *
 * Enhancement 19: Contextual Upgrade Prompts
 * Enhancement 21: Annual Plan Pricing
 *
 * Shows plan comparison with monthly/annual toggle when user hits budget or
 * tries to use a plan-gated feature. Includes annual savings callout.
 */
import { useState } from 'react';
import { X, Check, Zap, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { PLANS, nextPlan, ANNUAL_SAVINGS_PCT, type PlanDetails } from '../lib/pricing';

interface User { plan_tier: string }

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: 'budget' | 'feature';
  featureName?: string;
}

function PlanCard({
  plan,
  current,
  annual,
  recommended,
}: {
  plan: PlanDetails;
  current: boolean;
  annual: boolean;
  recommended: boolean;
}) {
  const price = annual ? plan.annualMonthlyRate : plan.monthlyPrice;
  const billingNote = plan.monthlyPrice === 0 ? 'Free forever'
    : annual ? `$${plan.annualPrice}/year · save ${ANNUAL_SAVINGS_PCT}%`
    : 'Billed monthly';

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
        recommended
          ? 'border-brand-indigo bg-brand-indigo/[0.04] ring-2 ring-brand-indigo/30'
          : current
          ? 'border-surface-ink/10 bg-surface-raised/50'
          : 'border-surface-ink/10 bg-surface-raised hover:border-brand-indigo/30'
      }`}
    >
      {recommended && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-brand-indigo px-2.5 py-0.5 text-[11px] font-bold text-white">
          Recommended
        </span>
      )}
      {current && (
        <span className="absolute -top-2.5 right-4 rounded-full bg-surface-ink/10 px-2.5 py-0.5 text-[11px] font-semibold text-surface-muted">
          Current plan
        </span>
      )}

      <div className="mb-3">
        <p className="font-display font-extrabold text-base text-surface-ink">{plan.name}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-display font-extrabold text-2xl text-surface-ink">
            {price === 0 ? 'Free' : `$${price}`}
          </span>
          {price > 0 && <span className="text-sm text-surface-muted">/mo</span>}
        </div>
        <p className="text-[11px] text-surface-muted mt-0.5">{billingNote}</p>
      </div>

      <ul className="flex-1 space-y-1.5 mb-4">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-surface-ink">
            <Check size={12} color="#01696F" className="mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={current || plan.monthlyPrice === 0}
        className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
          current
            ? 'bg-surface-sunk text-surface-muted cursor-default'
            : plan.monthlyPrice === 0
            ? 'bg-surface-sunk text-surface-muted cursor-default'
            : recommended
            ? 'bg-brand-indigo text-white hover:bg-brand-indigo/90'
            : 'bg-surface-ink/10 text-surface-ink hover:bg-brand-indigo hover:text-white'
        }`}
      >
        {current ? 'Current plan' : plan.cta}
      </button>
    </div>
  );
}

export function UpgradeModal({ open, onClose, reason = 'budget', featureName }: UpgradeModalProps) {
  const [annual, setAnnual] = useState(true); // default to annual (best value)
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => apiRequest<User>('/api/me') });
  const currentTier = user?.plan_tier ?? 'spark';
  const next = nextPlan(currentTier);

  if (!open) return null;

  const displayPlans = PLANS.filter((p) => p.id !== 'spark' || currentTier === 'spark');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} color="#4F35C2" />
              <h2 className="font-display font-extrabold text-xl text-surface-ink">
                {reason === 'budget' ? 'Upgrade for more AI power' : `Unlock ${featureName ?? 'this feature'}`}
              </h2>
            </div>
            <p className="text-sm text-surface-muted">
              {reason === 'budget'
                ? "You've reached your monthly token limit. Upgrade to keep going."
                : 'This feature requires a higher plan. Compare options below.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-surface-sunk transition-colors ml-4 flex-shrink-0"
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>

        {/* Annual / Monthly Toggle */}
        <div className="flex justify-center mt-4 pb-0 px-6">
          <div className="flex items-center gap-1 bg-surface-sunk rounded-full p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                !annual ? 'bg-white shadow text-surface-ink' : 'text-surface-muted'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                annual ? 'bg-white shadow text-surface-ink' : 'text-surface-muted'
              }`}
            >
              Annual
              <span className="rounded-full bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5">
                Save {ANNUAL_SAVINGS_PCT}%
              </span>
            </button>
          </div>
        </div>

        {/* Plan grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6">
          {displayPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={plan.id === currentTier}
              annual={annual}
              recommended={next ? plan.id === next.id : false}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="px-6 pb-5 flex items-center gap-2 text-xs text-surface-muted">
          <ArrowRight size={12} />
          All plans include a 14-day satisfaction guarantee. Cancel anytime. Token budgets reset on the 1st of each month.
        </div>
      </div>
    </div>
  );
}

/** Inline upgrade prompt for feature gating — compact version */
export function UpgradePrompt({ feature, currentTier }: { feature: string; currentTier: string }) {
  const [open, setOpen] = useState(false);
  const next = nextPlan(currentTier);
  if (!next) return null;

  return (
    <>
      <div className="rounded-xl border border-brand-indigo/20 bg-brand-indigo/[0.04] px-4 py-3 flex items-center gap-3">
        <Zap size={16} color="#4F35C2" className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-ink">
            {feature} requires {next.name} plan
          </p>
          <p className="text-xs text-surface-muted">From ${next.monthlyPrice}/mo — upgrade to unlock</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary !text-xs !py-1.5 flex-shrink-0"
        >
          Upgrade
        </button>
      </div>
      <UpgradeModal open={open} onClose={() => setOpen(false)} reason="feature" featureName={feature} />
    </>
  );
}
