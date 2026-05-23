// ─── AI Weekly Life Recap Page ───────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useState } from 'react';
import { useCurrentRecap, useGenerateRecap } from '../features/recap/api';
import { RecapCard } from '../features/recap/components/RecapCard';
import { NextWeekSetup } from '../features/recap/components/NextWeekSetup';
import { PastRecaps } from '../features/recap/components/PastRecaps';

type Tab = 'current' | 'history';

export function WeeklyRecap(): JSX.Element {
  const [tab, setTab] = useState<Tab>('current');

  const { data, isLoading: currentLoading } = useCurrentRecap();
  const generateRecap = useGenerateRecap();

  const recap = data?.recap ?? null;
  const isNew = data?.isNew ?? false;

  function handleGenerate() {
    generateRecap.mutate();
  }

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
            📋 Weekly Life Recap
          </h2>
          <p className="text-xs text-surface-muted">
            AI-generated summary of your week across all hubs
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['current', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all',
              tab === t
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            {t === 'current' ? '📋 This Week' : '🗂️ Past Recaps'}
          </button>
        ))}
      </div>

      {/* Current Week Tab */}
      {tab === 'current' && (
        <div className="space-y-4">
          {currentLoading ? (
            <div className="space-y-3">
              <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
              <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          ) : recap ? (
            <>
              <RecapCard recap={recap} isNew={isNew} />
              <NextWeekSetup recap={recap} />
            </>
          ) : (
            /* No recap for this week — show generate prompt */
            <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-2xl p-8 text-center space-y-4">
              <div className="text-4xl">📋</div>
              <div>
                <h3 className="font-bold text-surface-ink mb-1">No recap yet this week</h3>
                <p className="text-xs text-surface-muted max-w-xs mx-auto">
                  Generate your AI weekly life recap — it pulls data from all your hubs and gives you a
                  personalized summary, insights, and intentions for next week.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateRecap.isPending}
                className="btn px-6"
              >
                {generateRecap.isPending ? 'Generating your recap…' : '✨ Generate This Week\'s Recap'}
              </button>
              {generateRecap.isError && (
                <p className="text-xs text-red-500">
                  Failed to generate — please try again in a moment.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && <PastRecaps />}

      {/* Footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI, LLC · Weekly Life Recap · AI insights are for informational purposes only —
        not medical, financial, or professional advice.
      </p>
    </div>
  );
}
