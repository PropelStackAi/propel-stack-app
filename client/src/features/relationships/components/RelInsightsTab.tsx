// ─── Relationship Insights Tab ────────────────────────────────────────────────
// Enhancement 19 — Propel Stack AI, LLC
// PRIVACY: Only first names + cadence data sent to AI. Never notes or details.

import { useState } from 'react';
import { useRelationshipContacts, useRelationshipInsights } from '../api';
import type { StrengthLabel } from '../types';

const STRENGTH_META: Record<StrengthLabel, { color: string; bar: string; pct: number }> = {
  Warm:    { color: 'text-green-700',  bar: 'bg-green-400',  pct: 100 },
  Active:  { color: 'text-teal-700',   bar: 'bg-teal-400',   pct: 75  },
  Cooling: { color: 'text-orange-600', bar: 'bg-orange-400', pct: 40  },
  Distant: { color: 'text-gray-500',   bar: 'bg-gray-300',   pct: 15  },
};

export function RelInsightsTab(): JSX.Element {
  const { data: contactData } = useRelationshipContacts();
  const getInsights = useRelationshipInsights();
  const [insight, setInsight] = useState('');

  const contacts = contactData?.contacts ?? [];

  // Strength distribution
  const dist: Record<StrengthLabel, number> = { Warm: 0, Active: 0, Cooling: 0, Distant: 0 };
  contacts.forEach((c) => { dist[c.strength] = (dist[c.strength] ?? 0) + 1; });

  function handle() {
    getInsights.mutate(undefined, { onSuccess: (d) => setInsight(d.insight) });
  }

  return (
    <div className="space-y-4">
      {/* Strength breakdown */}
      {contacts.length > 0 && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Circle Health</p>
          <div className="space-y-2">
            {(['Warm', 'Active', 'Cooling', 'Distant'] as StrengthLabel[]).map((s) => {
              const meta = STRENGTH_META[s];
              const count = dist[s] ?? 0;
              const pct = contacts.length > 0 ? (count / contacts.length) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold w-16 flex-shrink-0 ${meta.color}`}>{s}</span>
                  <div className="flex-1 h-2 bg-surface-sunk rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-surface-muted w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-surface-muted">
            🔒 Strength shown as qualitative label only — never a score or number.
            Based on recency and frequency of logged interactions.
          </p>
        </div>
      )}

      {/* AI Insights */}
      <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-surface-ink">🤖 Weekly Relationship Insights</p>
          <button
            type="button"
            onClick={handle}
            disabled={getInsights.isPending || contacts.length === 0}
            className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
          >
            {getInsights.isPending ? 'Thinking…' : insight ? 'Refresh' : 'Get insights'}
          </button>
        </div>

        {insight ? (
          <div className="text-sm text-surface-ink leading-relaxed whitespace-pre-wrap">{insight}</div>
        ) : (
          <p className="text-xs text-surface-muted leading-relaxed">
            {contacts.length === 0
              ? 'Add people to your close circle first to receive personalised weekly insights.'
              : 'Get a warm, weekly summary of who to reach out to — based on check-in cadence only.'}
          </p>
        )}

        <div className="border-t border-surface-ink/[0.06] pt-2 space-y-1">
          <p className="text-[10px] text-surface-muted font-semibold">Privacy guarantee:</p>
          <p className="text-[10px] text-surface-muted">
            Only first names and check-in cadence data are shared with AI. Interaction notes, relationship details,
            and personal information are never included in any AI context.
          </p>
        </div>
      </div>
    </div>
  );
}
