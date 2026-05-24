// ─── AI Life Coach Page ───────────────────────────────────────────────────────
// Enhancement 22 — Propel Stack AI, LLC

import { useState } from 'react';
import { CoachingInsightCard } from '../features/coaching/components/CoachingInsightCard';
import { useCoachingHistory, useCoachingPreferences, useUpdateCoachingPreferences, useGenerateInsight } from '../features/coaching/api';
import { INSIGHT_META } from '../features/coaching/types';
import type { InsightType } from '../features/coaching/types';

type Tab = 'today' | 'history' | 'settings';

function HistoryTab() {
  const { data, isLoading } = useCoachingHistory();
  const insights = data?.insights ?? [];

  if (isLoading) return <p className="text-sm text-surface-muted text-center py-8">Loading…</p>;
  if (insights.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-3xl">🤖</p>
        <p className="text-sm text-surface-muted mt-2">No insights yet.</p>
        <p className="text-xs text-surface-muted">Insights appear here once generated — up to one per day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-surface-muted">All past coaching insights — full transparency on what AI observed from your data.</p>
      {insights.map((insight) => {
        const meta = INSIGHT_META[insight.insight_type as InsightType] ?? { label: 'Insight', emoji: '🤖' };
        const hubs = insight.hubs_used ? insight.hubs_used.split(',').filter(Boolean) : [];
        const isDismissed = !!insight.dismissed;
        return (
          <div key={insight.id}
            className={`rounded-xl border p-3 space-y-1.5 ${isDismissed ? 'opacity-50 bg-surface-raised border-surface-ink/10' : 'bg-surface-raised border-surface-ink/10'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span>{meta.emoji}</span>
                <span className="text-xs font-semibold text-surface-ink capitalize">{meta.label}</span>
                {hubs.map((h) => (
                  <span key={h} className="text-[10px] bg-surface-sunk text-surface-muted px-1.5 py-0.5 rounded-full">{h}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {isDismissed && <span className="text-[10px] text-surface-muted italic">{insight.dismiss_type === 'permanent_type' ? 'Hidden forever' : 'Dismissed'}</span>}
                {insight.opened_at && !isDismissed && <span className="text-[10px] text-green-600">Seen</span>}
                <span className="text-[10px] text-surface-muted">{insight.created_at.split('T')[0]}</span>
              </div>
            </div>
            <p className="text-xs text-surface-ink leading-relaxed">{insight.insight_text}</p>
          </div>
        );
      })}
    </div>
  );
}

function SettingsTab() {
  const { data: prefsData, isLoading } = useCoachingPreferences();
  const update = useUpdateCoachingPreferences();
  const prefs = prefsData?.preferences;

  if (isLoading || !prefs) return <p className="text-sm text-surface-muted text-center py-8">Loading…</p>;

  function toggle(field: 'ai_coach_enabled' | 'mental_health_enabled', current: number) {
    update.mutate({ [field]: current ? 0 : 1 });
  }

  return (
    <div className="space-y-4">
      {/* AI Coach toggle */}
      <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-surface-ink">AI Life Coach</p>
            <p className="text-xs text-surface-muted">Daily cross-hub pattern observations and gentle nudges</p>
          </div>
          <button type="button"
            onClick={() => toggle('ai_coach_enabled', prefs.ai_coach_enabled)}
            disabled={update.isPending}
            className={`relative w-12 h-6 rounded-full transition-colors ${prefs.ai_coach_enabled ? 'bg-brand-teal' : 'bg-surface-sunk'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs.ai_coach_enabled ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        <p className="text-[10px] text-surface-muted">
          When enabled, AI Life Coach checks your data once per day and surfaces patterns worth reflecting on.
          Insights are observations and questions only — never directives or advice.
        </p>
      </div>

      {/* Mental health opt-in */}
      <div className={`bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3 ${!prefs.ai_coach_enabled ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-surface-ink">Health & Wellbeing Insights</p>
            <p className="text-xs text-surface-muted">Optional — observe health logging trends</p>
          </div>
          <button type="button"
            onClick={() => toggle('mental_health_enabled', prefs.mental_health_enabled)}
            disabled={update.isPending || !prefs.ai_coach_enabled}
            className={`relative w-12 h-6 rounded-full transition-colors ${prefs.mental_health_enabled ? 'bg-brand-teal' : 'bg-surface-sunk'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs.mental_health_enabled ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        <p className="text-[10px] text-surface-muted">
          Requires explicit opt-in. Notices changes in your health logging patterns.
          Never diagnoses conditions or recommends medical actions.
        </p>
      </div>

      {/* Hard limits transparency */}
      <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">AI Coach Hard Limits</p>
        {[
          'Never diagnoses, prescribes, or recommends medical/financial actions',
          'Insights are observations and questions — never directives',
          'Maximum 1 insight per day',
          'Dismissed insight types are permanently remembered',
          'Full history of all insights shown above — nothing hidden',
          'All data stays private — never shared with third parties',
        ].map((rule) => (
          <div key={rule} className="flex items-start gap-2 text-xs text-surface-muted">
            <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
            <span>{rule}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AICoach(): JSX.Element {
  const [tab, setTab] = useState<Tab>('today');
  const generate = useGenerateInsight();

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'today',    label: "Today's Insight", emoji: '🤖' },
    { id: 'history',  label: 'History',          emoji: '📋' },
    { id: 'settings', label: 'Settings',         emoji: '⚙️' },
  ];

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          🤖 AI Life Coach
        </h2>
        <p className="text-xs text-surface-muted">
          Cross-hub pattern observations — warm, specific, and always phrased as questions. Never directives.
        </p>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              tab === t.id
                ? 'bg-brand-indigo text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px] space-y-4">
        {tab === 'today' && (
          <>
            <CoachingInsightCard onViewAll={() => setTab('history')} />
            <div className="flex justify-center">
              <button type="button" onClick={() => generate.mutate()} disabled={generate.isPending}
                className="text-xs text-surface-muted hover:text-surface-ink disabled:opacity-40">
                {generate.isPending ? 'Checking your data…' : 'Check for new insight'}
              </button>
            </div>
          </>
        )}
        {tab === 'history'  && <HistoryTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>

      {/* Privacy footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI · AI Life Coach · Insights are generated from your own data. Never shared. Solo+ plan feature.
      </p>
    </div>
  );
}
