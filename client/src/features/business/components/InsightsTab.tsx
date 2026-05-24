// ─── Business Insights — AI-powered summary ───────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useState } from 'react';
import { useBusinessMetrics, useBusinessInsights } from '../api';

export function InsightsTab(): JSX.Element {
  const { data: metrics } = useBusinessMetrics();
  const getInsights = useBusinessInsights();
  const [insight, setInsight] = useState('');

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  function handleGetInsights() {
    getInsights.mutate(undefined, {
      onSuccess: (data) => setInsight(data.insight),
    });
  }

  const cards = metrics
    ? [
        { label: 'Total Revenue',   value: fmt(metrics.totalRevenue),   emoji: '💰', color: 'bg-green-50 border-green-100' },
        { label: 'This Month',       value: fmt(metrics.monthRevenue),  emoji: '📅', color: 'bg-blue-50 border-blue-100'   },
        { label: 'Outstanding',      value: fmt(metrics.outstanding),   emoji: '📨', color: metrics.outstanding > 0 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100' },
        { label: 'Month Expenses',   value: fmt(metrics.monthExpenses), emoji: '💸', color: 'bg-red-50 border-red-100'     },
        { label: 'Active Projects',  value: String(metrics.activeProjects), emoji: '🚀', color: 'bg-purple-50 border-purple-100' },
        { label: 'Active Clients',   value: String(metrics.clientCount), emoji: '👥', color: 'bg-teal-50 border-teal-100'  },
      ]
    : [];

  const netProfit = metrics ? metrics.monthRevenue - metrics.monthExpenses : 0;

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className={`border rounded-xl p-3 ${c.color}`}>
            <p className="text-lg">{c.emoji}</p>
            <p className="text-base font-bold text-surface-ink mt-1">{c.value}</p>
            <p className="text-[10px] text-surface-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Net profit banner */}
      {metrics && (
        <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${netProfit >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
          <span className="text-sm font-semibold text-surface-ink">Monthly Net Profit</span>
          <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
          </span>
        </div>
      )}

      {/* Top clients */}
      {metrics && metrics.topClients.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">Top Clients by Revenue</p>
          <div className="space-y-1.5">
            {metrics.topClients.map((c, i) => {
              const maxRev = metrics.topClients[0].revenue || 1;
              return (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="text-xs text-surface-muted w-4">{i + 1}.</span>
                  <span className="text-xs font-medium text-surface-ink flex-1">{c.name}</span>
                  <div className="w-24 h-1.5 bg-surface-sunk rounded-full overflow-hidden">
                    <div className="h-full bg-brand-teal rounded-full" style={{ width: `${(c.revenue / maxRev) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-brand-teal w-20 text-right">{fmt(c.revenue)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="border border-surface-ink/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-surface-ink">🤖 AI Business Insights</p>
          <button
            type="button"
            onClick={handleGetInsights}
            disabled={getInsights.isPending}
            className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
          >
            {getInsights.isPending ? 'Analysing…' : insight ? 'Refresh' : 'Get insights'}
          </button>
        </div>

        {insight ? (
          <div className="text-sm text-surface-ink leading-relaxed whitespace-pre-wrap">{insight}</div>
        ) : (
          <p className="text-xs text-surface-muted">
            Click "Get insights" to receive an AI-powered summary of your business health, revenue trends, and recommended next actions.
          </p>
        )}

        <p className="text-[10px] text-surface-muted border-t border-surface-ink/[0.06] pt-2">
          AI insights are general observations only. Consult a licensed accountant or financial advisor for professional guidance.
        </p>
      </div>
    </div>
  );
}
