// ─── Coaching Insight Card ────────────────────────────────────────────────────
// Enhancement 22 — Propel Stack AI, LLC
// Reusable card used on Dashboard and AI Coach page.

import { useState, useEffect } from 'react';
import { useCoachingInsight, useGenerateInsight, useOpenInsight, useDismissInsight, useCoachingPreferences } from '../api';
import { INSIGHT_META } from '../types';
import type { InsightType } from '../types';

interface Props {
  compact?: boolean;   // true = dashboard version (smaller)
  onViewAll?: () => void;
}

export function CoachingInsightCard({ compact, onViewAll }: Props) {
  const { data, isLoading } = useCoachingInsight();
  const { data: prefsData } = useCoachingPreferences();
  const generate = useGenerateInsight();
  const openInsight = useOpenInsight();
  const dismiss = useDismissInsight();

  const [showDismissMenu, setShowDismissMenu] = useState(false);

  const insight = data?.insight;
  const prefs = prefsData?.preferences;

  // Auto-generate on mount if coach is enabled and no current insight
  useEffect(() => {
    if (prefs?.ai_coach_enabled && !insight && !isLoading) {
      generate.mutate();
    }
  }, [prefs?.ai_coach_enabled, insight, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as opened when user first sees it
  useEffect(() => {
    if (insight && !insight.opened_at) {
      openInsight.mutate(insight.id);
    }
  }, [insight?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // If coach disabled, show nothing
  if (prefs && !prefs.ai_coach_enabled) return null;

  // Loading state
  if (isLoading || generate.isPending) {
    return (
      <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 animate-pulse">
        <div className="h-3 bg-surface-sunk rounded w-24 mb-2" />
        <div className="h-4 bg-surface-sunk rounded w-full mb-1" />
        <div className="h-4 bg-surface-sunk rounded w-3/4" />
      </div>
    );
  }

  // No insight available
  if (!insight) {
    if (compact) return null; // don't show empty state on dashboard
    return (
      <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 text-center space-y-2">
        <p className="text-2xl">🤖</p>
        <p className="text-sm text-surface-muted">No new insight today.</p>
        <p className="text-xs text-surface-muted">Check back tomorrow — insights are generated once per day from your life data.</p>
        <button type="button" onClick={() => generate.mutate()} disabled={generate.isPending}
          className="text-xs bg-brand-indigo/10 text-brand-indigo px-3 py-1.5 rounded-xl font-semibold hover:bg-brand-indigo/20 disabled:opacity-40">
          {generate.isPending ? 'Checking…' : 'Check now'}
        </button>
      </div>
    );
  }

  const meta = INSIGHT_META[insight.insight_type as InsightType] ?? { label: 'Insight', emoji: '🤖', hue: 'indigo' };
  const hubs = insight.hubs_used ? insight.hubs_used.split(',').filter(Boolean) : [];

  const accentClass: Record<string, string> = {
    teal:   'bg-brand-teal/10 border-brand-teal/20',
    indigo: 'bg-brand-indigo/10 border-brand-indigo/20',
    coral:  'bg-brand-coral/10 border-brand-coral/20',
    orange: 'bg-orange-50 border-orange-100',
    green:  'bg-green-50 border-green-100',
  };

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${accentClass[meta.hue] ?? 'bg-surface-raised border-surface-ink/10'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.emoji}</span>
          <div>
            <p className="text-xs font-semibold text-surface-ink">🤖 AI Life Coach</p>
            <div className="flex gap-1 mt-0.5 flex-wrap">
              <span className="text-[10px] text-surface-muted capitalize">{meta.label}</span>
              {hubs.map((h) => (
                <span key={h} className="text-[10px] bg-surface-ink/5 text-surface-muted px-1.5 py-0.5 rounded-full">{h}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        <div className="relative flex-shrink-0">
          <button type="button" onClick={() => setShowDismissMenu(!showDismissMenu)}
            className="text-xs text-surface-muted hover:text-surface-ink p-1 rounded-lg hover:bg-surface-sunk"
            aria-label="Dismiss options">
            ···
          </button>
          {showDismissMenu && (
            <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-raised border border-surface-ink/10 py-1 min-w-[200px]">
              <button type="button"
                onClick={() => { dismiss.mutate({ id: insight.id, dismiss_type: 'once' }); setShowDismissMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 hover:bg-surface-sunk text-surface-ink">
                Dismiss this insight
              </button>
              <button type="button"
                onClick={() => { dismiss.mutate({ id: insight.id, dismiss_type: 'permanent_type' }); setShowDismissMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 hover:bg-surface-sunk text-surface-muted">
                Don't show {meta.label.toLowerCase()} insights again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Insight text */}
      <p className="text-sm text-surface-ink leading-relaxed">{insight.insight_text}</p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px] text-surface-muted">
          🔒 Based on your data only — never shared. Insights are suggestions, not advice.
        </p>
        {onViewAll && (
          <button type="button" onClick={onViewAll}
            className="text-xs text-brand-indigo font-semibold hover:underline flex-shrink-0 ml-2">
            History →
          </button>
        )}
      </div>
    </div>
  );
}
