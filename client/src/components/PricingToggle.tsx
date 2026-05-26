/**
 * PricingToggle — Phase 3 Step 10 + Enterprise Onboarding
 * Propel Stack AI, LLC
 *
 * Three-segment pricing: Consumer, Education, Business.
 * Monthly / Annual billing toggle (annual = monthly × 10, 2 months free).
 *
 * Calls POST /api/billing/checkout with { planId, billingPeriod }.
 * Server returns { url } → full-page redirect to Stripe Checkout.
 */

import { useState } from 'react';
import { Sparkles, Check, Loader2, User, GraduationCap, Briefcase } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

type Segment = 'consumer' | 'education' | 'business';

interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  priceLabel?: string;        // override for custom pricing
  features: string[];
  highlight?: boolean;
  tokenBudget?: string;
  badge?: string;
  contactSales?: boolean;     // for enterprise tiers
}

// ─── Consumer Plans ───────────────────────────────────────────────────────────

const CONSUMER_PLANS: Plan[] = [
  {
    id: 'spark',
    name: 'Spark',
    tagline: 'Try it free',
    monthlyPrice: 0,
    tokenBudget: '25K tokens/mo',
    features: ['Core life hubs', 'Basic AI assistant', 'Memory system', '25K AI tokens/mo'],
  },
  {
    id: 'solo',
    name: 'Solo',
    tagline: 'For individuals serious about their life',
    monthlyPrice: 19,
    tokenBudget: '500K tokens/mo',
    features: ['Everything in Spark', 'Daily briefings', 'Full memory system', 'Health & wellness hubs', '500K AI tokens/mo'],
  },
  {
    id: 'family',
    name: 'Family',
    tagline: 'Up to 5 profiles, shared AI',
    monthlyPrice: 39,
    tokenBudget: '2M tokens/mo',
    highlight: true,
    features: ['Everything in Solo', '5 family profiles', 'Parental controls', 'Kids Zone', 'Family hub', '2M AI tokens/mo'],
  },
  {
    id: 'network',
    name: 'Network',
    tagline: 'For extended families & small teams',
    monthlyPrice: 79,
    tokenBudget: '5M tokens/mo',
    features: ['Everything in Family', 'Up to 15 profiles', 'Network hub', 'Business hub', '5M AI tokens/mo'],
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'For power users who want everything',
    monthlyPrice: 149,
    tokenBudget: '15M tokens/mo',
    features: ['Everything in Network', 'Advisor platform', 'Digital twin', 'Priority AI routing', '15M AI tokens/mo'],
  },
];

// ─── Education Plans ──────────────────────────────────────────────────────────

const EDUCATION_PLANS: Plan[] = [
  {
    id: 'classroom',
    name: 'Classroom',
    tagline: 'For individual teachers & tutors',
    monthlyPrice: 29,
    tokenBudget: 'Up to 50 students',
    features: [
      'Up to 50 student seats',
      'Class workspace + planner',
      'AI study assistant',
      'Student invite by link or code',
      'Assignment tracker & calendar',
      'Basic student activity reports',
      'Standard support',
    ],
  },
  {
    id: 'campus',
    name: 'Campus',
    tagline: 'For schools & departments',
    monthlyPrice: 199,
    tokenBudget: 'Bundled seat blocks',
    highlight: true,
    badge: 'Most popular',
    features: [
      'Multi-class / program workspaces',
      'Campus admin + counselor roles',
      'LMS / SIS roster import',
      'SSO support',
      'Department-level reporting',
      'Faculty enablement portal',
      'FERPA-aware settings',
      'Priority support + onboarding',
    ],
  },
  {
    id: 'district',
    name: 'District / University',
    tagline: 'Systemwide deployment',
    monthlyPrice: 0,
    priceLabel: 'Custom',
    contactSales: true,
    features: [
      'Districtwide / campuswide provisioning',
      'Multi-campus hierarchy',
      'FTE / site license logic',
      'Executive dashboards + exports',
      'Dedicated onboarding lead',
      'SSO + MFA + audit logging',
      'SIS, LMS, API / webhook integration',
      'FERPA compliance controls',
      '30-day & 90-day rollout reviews',
    ],
  },
];

// ─── Business Plans ───────────────────────────────────────────────────────────

const BUSINESS_PLANS: Plan[] = [
  {
    id: 'biz-starter',
    name: 'Business Starter',
    tagline: 'For solopreneurs & small teams',
    monthlyPrice: 49,
    tokenBudget: '3–10 users',
    features: [
      '3–10 user seats',
      'One business workspace',
      'Shared tasks, notes & docs',
      'AI operations assistant',
      'Basic automations & reminders',
      'Calendar, email, drive integration',
      'Standard support',
    ],
  },
  {
    id: 'biz-growth',
    name: 'Business Growth',
    tagline: 'For agencies & growing teams',
    monthlyPrice: 149,
    tokenBudget: '10–50 users',
    highlight: true,
    badge: 'Most popular',
    features: [
      'Up to 50 user seats',
      'Multi-workspace (client / team / project)',
      'Role permissions + approval flows',
      'Advanced automations & routing',
      'CRM, support desk integration',
      'Team analytics + adoption dashboard',
      'Priority support',
      'SSO support',
    ],
  },
  {
    id: 'biz-enterprise',
    name: 'Business Enterprise',
    tagline: 'For large organizations',
    monthlyPrice: 0,
    priceLabel: 'Custom',
    contactSales: true,
    features: [
      '50+ seats / custom contract',
      'Multi-entity hierarchy workspaces',
      'SSO, MFA, least-privilege access',
      'Dedicated onboarding + CSM',
      'SLA-backed support',
      'ERP, CRM, API, webhook integrations',
      'Executive dashboards + ROI reporting',
      'Security review artifacts + DPA',
      'Custom automations + API-triggered flows',
    ],
  },
];

// ─── Segment config ───────────────────────────────────────────────────────────

const SEGMENTS: { id: Segment; label: string; sub: string; icon: typeof User }[] = [
  { id: 'consumer',  label: 'My Life',           sub: 'Personal · Family · Health · Finance', icon: User          },
  { id: 'education', label: 'Students & Schools', sub: 'Classroom · Campus · District',        icon: GraduationCap },
  { id: 'business',  label: 'Teams & Business',   sub: 'Starter · Growth · Enterprise',        icon: Briefcase     },
];

const PLANS_BY_SEGMENT: Record<Segment, Plan[]> = {
  consumer:  CONSUMER_PLANS,
  education: EDUCATION_PLANS,
  business:  BUSINESS_PLANS,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function annualTotal(monthly: number): number { return monthly * 10; }

function displayMonthly(plan: Plan, isAnnual: boolean): string {
  if (plan.priceLabel) return plan.priceLabel;
  if (plan.monthlyPrice === 0) return 'Free';
  if (!isAnnual) return `$${plan.monthlyPrice}/mo`;
  const effective = Math.round((annualTotal(plan.monthlyPrice) / 12) * 10) / 10;
  return `$${effective}/mo`;
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan, isAnnual, currentPlan, onSelect, loading,
}: {
  plan: Plan; isAnnual: boolean; currentPlan?: string;
  onSelect: (planId: string, period: 'monthly' | 'annual') => void;
  loading: string | null;
}) {
  const isCurrent = plan.id === currentPlan;
  const isFree = plan.monthlyPrice === 0 && !plan.priceLabel;
  const isLoading = loading === plan.id;

  return (
    <div className={[
      'relative rounded-2xl border p-5 flex flex-col gap-4 transition-all',
      plan.highlight
        ? 'border-brand-indigo ring-2 ring-brand-indigo/20 bg-brand-indigo/3 dark:bg-brand-indigo/5'
        : 'border-surface-ink/[0.08] dark:border-white/[0.08]',
    ].join(' ')}>
      {(plan.highlight || plan.badge) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-0.5 rounded-full bg-brand-indigo text-white text-[11px] font-bold uppercase tracking-wider">
            {plan.badge ?? 'Most popular'}
          </span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <p className="font-display font-bold text-lg text-surface-ink dark:text-white">{plan.name}</p>
          {isAnnual && plan.monthlyPrice > 0 && !plan.priceLabel && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
              Save 17%
            </span>
          )}
        </div>
        <p className="text-xs text-surface-muted mt-0.5">{plan.tagline}</p>
      </div>

      <div>
        <p className="text-3xl font-bold text-surface-ink dark:text-white">
          {displayMonthly(plan, isAnnual)}
        </p>
        {isAnnual && plan.monthlyPrice > 0 && !plan.priceLabel && (
          <p className="text-xs text-surface-muted mt-0.5">
            Billed ${annualTotal(plan.monthlyPrice)}/year · 14-day free trial
          </p>
        )}
        {!isAnnual && plan.monthlyPrice > 0 && !plan.priceLabel && (
          <p className="text-xs text-surface-muted mt-0.5">7-day free trial</p>
        )}
        {plan.tokenBudget && (
          <p className="text-xs text-brand-indigo font-medium mt-1">{plan.tokenBudget}</p>
        )}
      </div>

      <ul className="space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-surface-ink dark:text-white">
            <Check size={14} className="text-brand-teal shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="py-2.5 rounded-full text-center text-sm font-semibold text-surface-muted border border-surface-ink/10 dark:border-white/10">
          Current plan
        </div>
      ) : plan.contactSales ? (
        <a
          href="mailto:sales@propelstackai.com"
          className="block w-full py-2.5 rounded-full text-center text-sm font-semibold border border-brand-indigo text-brand-indigo hover:bg-brand-indigo/5 transition-colors"
        >
          Contact Sales
        </a>
      ) : isFree ? (
        <div className="py-2.5 rounded-full text-center text-sm font-semibold text-surface-muted border border-surface-ink/10 dark:border-white/10">
          Free forever
        </div>
      ) : (
        <button
          type="button"
          disabled={!!loading}
          onClick={() => onSelect(plan.id, isAnnual ? 'annual' : 'monthly')}
          className={[
            'w-full py-2.5 rounded-full text-sm font-semibold transition-all',
            plan.highlight
              ? 'bg-brand-indigo text-white hover:brightness-110'
              : 'border border-brand-indigo text-brand-indigo hover:bg-brand-indigo/5',
            loading ? 'opacity-60' : '',
          ].join(' ')}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Redirecting…
            </span>
          ) : (
            `Start ${isAnnual ? '14' : '7'}-day trial`
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface PricingToggleProps {
  currentPlan?: string;
  defaultSegment?: Segment;
}

export function PricingToggle({ currentPlan = 'spark', defaultSegment = 'consumer' }: PricingToggleProps) {
  const [segment, setSegment] = useState<Segment>(defaultSegment);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plans = PLANS_BY_SEGMENT[segment];
  const showAnnualToggle = segment === 'consumer'; // Education and Business bill on contract terms

  async function handleSelect(planId: string, period: 'monthly' | 'annual') {
    setLoading(planId);
    setError(null);
    try {
      const { url } = await apiRequest<{ url: string }>('/api/billing/checkout', {
        method: 'POST',
        body: { planId, billingPeriod: period },
      });
      window.location.href = url;
    } catch {
      setError('Failed to start checkout. Please try again or contact support@propelstackai.com');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Segment tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {SEGMENTS.map(({ id, label, sub, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSegment(id)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
              segment === id
                ? 'border-brand-indigo bg-brand-indigo/5 text-brand-indigo'
                : 'border-surface-ink/10 text-surface-muted hover:border-surface-ink/20',
            ].join(' ')}
          >
            <Icon size={15} />
            <span>{label}</span>
            <span className="hidden sm:inline text-xs opacity-60">— {sub}</span>
          </button>
        ))}
      </div>

      {/* Annual toggle — consumer only */}
      {showAnnualToggle && (
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-surface-ink dark:text-white' : 'text-surface-muted'}`}>
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            onClick={() => setIsAnnual((v) => !v)}
            className={['relative w-12 h-6 rounded-full transition-colors', isAnnual ? 'bg-brand-indigo' : 'bg-surface-sunk'].join(' ')}
          >
            <span className={['absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', isAnnual ? 'translate-x-6' : ''].join(' ')} />
          </button>
          <span className={`text-sm font-medium flex items-center gap-1.5 ${isAnnual ? 'text-surface-ink dark:text-white' : 'text-surface-muted'}`}>
            Annual
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
              2 months free
            </span>
          </span>
        </div>
      )}

      {/* Education / Business note */}
      {segment !== 'consumer' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-indigo/5 dark:bg-brand-indigo/10 border border-brand-indigo/20 max-w-2xl mx-auto">
          <Sparkles size={16} className="text-brand-indigo shrink-0 mt-0.5" />
          <p className="text-sm text-brand-indigo">
            {segment === 'education'
              ? 'Education pricing is per-institution. Enterprise tiers include a dedicated onboarding lead and rollout support. Contact sales@propelstackai.com for a quote.'
              : 'Business pricing is per-workspace. Enterprise tiers are custom-contracted. Contact sales@propelstackai.com to get started.'}
          </p>
        </div>
      )}

      {isAnnual && segment === 'consumer' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-indigo/5 dark:bg-brand-indigo/10 border border-brand-indigo/20">
          <Sparkles size={16} className="text-brand-indigo shrink-0" />
          <p className="text-sm text-brand-indigo font-medium">
            Annual subscribers get a 14-day free trial and can cancel anytime.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {/* Plan grid */}
      <div className={[
        'grid gap-4',
        plans.length <= 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      ].join(' ')}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isAnnual={isAnnual}
            currentPlan={currentPlan}
            onSelect={handleSelect}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
