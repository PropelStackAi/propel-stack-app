// ─── DashboardRecapBanner.tsx ─────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC
// Pinned banner shown on the Dashboard when a recap is available or ready to generate.

import { Link } from 'wouter';
import { useCurrentRecap, useGenerateRecap } from '../api';

export function DashboardRecapBanner() {
  const { data, isLoading } = useCurrentRecap();
  const generateRecap = useGenerateRecap();

  if (isLoading) return null;

  const recap = data?.recap;
  const isNew = data?.isNew ?? false;

  // If there's already a recap, show a teaser card
  if (recap) {
    return (
      <Link href="/recap">
        <div className="bg-gradient-to-r from-brand-teal/10 to-indigo-500/10 border border-brand-teal/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:border-brand-teal/40 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-sm font-semibold text-surface-ink flex items-center gap-2">
                Weekly Life Recap
                {isNew && (
                  <span className="text-[10px] font-bold bg-brand-teal text-white rounded-full px-2 py-0.5">
                    NEW
                  </span>
                )}
              </p>
              <p className="text-xs text-surface-muted">
                {recap.insight_key !== 'general'
                  ? `Insight: ${recap.insight_key.replace('-', ' & ')}`
                  : 'Your AI weekly summary is ready'}
              </p>
            </div>
          </div>
          <span className="text-brand-teal text-xs font-semibold shrink-0">View →</span>
        </div>
      </Link>
    );
  }

  // No recap yet — show a gentle generate prompt
  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-xl">📋</span>
        <div>
          <p className="text-sm font-semibold text-surface-ink">Weekly Life Recap</p>
          <p className="text-xs text-surface-muted">Generate your AI weekly summary</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => generateRecap.mutate()}
        disabled={generateRecap.isPending}
        className="btn text-xs py-1.5 px-3 shrink-0"
      >
        {generateRecap.isPending ? 'Generating…' : '✨ Generate'}
      </button>
    </div>
  );
}
