/**
 * Plan Pricing Constants — Propel Stack AI, LLC
 *
 * Enhancement 21: Annual Plan Pricing
 * Single source of truth for all plan pricing displayed in the app.
 * Stripe price IDs are read from env vars at checkout time.
 */

export type PlanTier = 'spark' | 'solo' | 'family' | 'network' | 'elite';

export interface PlanDetails {
  id: PlanTier;
  name: string;
  monthlyPrice: number;   // USD/month when billed monthly
  annualPrice: number;    // USD/year when billed annually (20% off)
  annualMonthlyRate: number; // effective monthly rate when annual
  tokenBudget: number;    // tokens/month
  tokenLabel: string;     // formatted token budget label
  features: string[];
  cta: string;
  highlight?: boolean;    // most popular
}

export const PLANS: PlanDetails[] = [
  {
    id: 'spark',
    name: 'Spark',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthlyRate: 0,
    tokenBudget: 25_000,
    tokenLabel: '25K tokens/mo',
    features: [
      'Dashboard & core features',
      '25K AI tokens/month',
      'Morning briefings',
      'Streak tracking',
    ],
    cta: 'Free forever',
  },
  {
    id: 'solo',
    name: 'Solo',
    monthlyPrice: 12,
    annualPrice: 115,
    annualMonthlyRate: 9.60,
    tokenBudget: 500_000,
    tokenLabel: '500K tokens/mo',
    features: [
      'Everything in Spark',
      '500K AI tokens/month',
      'Memory & personalization',
      'Weekly life reviews',
      'Predictive task surfacing',
    ],
    cta: 'Get Solo',
    highlight: true,
  },
  {
    id: 'family',
    name: 'Family',
    monthlyPrice: 25,
    annualPrice: 240,
    annualMonthlyRate: 20,
    tokenBudget: 2_000_000,
    tokenLabel: '2M tokens/mo',
    features: [
      'Everything in Solo',
      '2M AI tokens/month',
      'Up to 6 family members',
      'Shared & private data toggle',
      'Parental controls',
      'Family network hub',
    ],
    cta: 'Get Family',
  },
  {
    id: 'network',
    name: 'Network',
    monthlyPrice: 45,
    annualPrice: 432,
    annualMonthlyRate: 36,
    tokenBudget: 5_000_000,
    tokenLabel: '5M tokens/mo',
    features: [
      'Everything in Family',
      '5M AI tokens/month',
      'Advisor platform access',
      'Priority support',
      'Advanced AI coaching',
    ],
    cta: 'Get Network',
  },
  {
    id: 'elite',
    name: 'Elite',
    monthlyPrice: 99,
    annualPrice: 950,
    annualMonthlyRate: 79,
    tokenBudget: 15_000_000,
    tokenLabel: '15M tokens/mo',
    features: [
      'Everything in Network',
      '15M AI tokens/month',
      'Digital twin (beta)',
      'White-glove onboarding',
      'Custom integrations',
    ],
    cta: 'Get Elite',
  },
];

export const PLAN_MAP: Record<PlanTier, PlanDetails> = Object.fromEntries(
  PLANS.map((p) => [p.id, p]),
) as Record<PlanTier, PlanDetails>;

/** Returns the next plan tier above the given one, or null if already Elite. */
export function nextPlan(currentTier: string): PlanDetails | null {
  const idx = PLANS.findIndex((p) => p.id === currentTier);
  if (idx === -1 || idx >= PLANS.length - 1) return null;
  return PLANS[idx + 1];
}

/** Annual savings percentage vs monthly */
export const ANNUAL_SAVINGS_PCT = 20;
