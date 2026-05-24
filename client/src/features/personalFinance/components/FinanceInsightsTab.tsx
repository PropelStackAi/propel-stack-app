// ─── Finance Insights Tab ─────────────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC
// COMPLIANCE: Observations only. Never financial advice.

import { useState } from 'react';
import { useSpendInsights } from '../api';

export function FinanceInsightsTab(): JSX.Element {
  const getInsights = useSpendInsights();
  const [insight, setInsight] = useState('');

  function handle() {
    getInsights.mutate(undefined, {
      onSuccess: (d) => setInsight(d.insight),
    });
  }

  return (
    <div className="space-y-4">
      {/* Compliance banner — always visible */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
        <p className="text-xs font-semibold text-blue-800">📋 Spending Observations Only</p>
        <p className="text-[11px] text-blue-700 leading-relaxed">
          This feature surfaces factual observations about your spending patterns.
          It does <strong>not</strong> provide financial, investment, tax, or legal advice.
          Consult a licensed financial advisor for personal guidance.
        </p>
      </div>

      {/* AI Insights block */}
      <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-surface-ink">🤖 Spend Observations</p>
          <button
            type="button"
            onClick={handle}
            disabled={getInsights.isPending}
            className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
          >
            {getInsights.isPending ? 'Analysing…' : insight ? 'Refresh' : 'Analyse spending'}
          </button>
        </div>

        {insight ? (
          <div className="text-sm text-surface-ink leading-relaxed whitespace-pre-wrap">{insight}</div>
        ) : (
          <p className="text-xs text-surface-muted leading-relaxed">
            Click "Analyse spending" to get AI-generated observations about your spending categories and trends this month.
            Add transactions in the Spending tab first for best results.
          </p>
        )}

        {insight && (
          <p className="text-[10px] text-surface-muted border-t border-surface-ink/[0.06] pt-2">
            These are spending observations only — not financial advice. Never include account numbers or sensitive details in this app.
          </p>
        )}
      </div>

      {/* Tips */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Visibility Tips</p>
        {[
          { emoji: '📊', tip: 'Log expenses regularly for more accurate category observations.' },
          { emoji: '📋', tip: 'Set budgets per category to see how actual spending compares.' },
          { emoji: '💰', tip: 'Track savings goals separately from your spending patterns.' },
          { emoji: '🏦', tip: 'Update account balances periodically to keep net worth accurate.' },
        ].map((t) => (
          <div key={t.tip} className="flex gap-2 bg-surface-raised border border-surface-ink/10 rounded-xl px-3 py-2">
            <span className="text-base flex-shrink-0">{t.emoji}</span>
            <p className="text-xs text-surface-muted leading-relaxed">{t.tip}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-surface-muted text-center pb-4">
        Propel Stack AI Personal Finance Hub · Visibility &amp; organisation tool only · Not financial, investment, tax, or legal advice.
      </p>
    </div>
  );
}
