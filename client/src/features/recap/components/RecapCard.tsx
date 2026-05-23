// ─── RecapCard.tsx ────────────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useEffect } from 'react';
import type { WeeklyRecap } from '../types';
import { useMarkOpened } from '../api';

interface RecapCardProps {
  recap: WeeklyRecap;
  isNew?: boolean;
}

const INSIGHT_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
  'sleep-mood': { emoji: '😴', label: 'Sleep & Mood', color: 'bg-indigo-100 text-indigo-700' },
  'fitness':    { emoji: '🏋️', label: 'Fitness',      color: 'bg-teal-100 text-teal-700' },
  'nutrition':  { emoji: '🥗', label: 'Nutrition',    color: 'bg-green-100 text-green-700' },
  'habits':     { emoji: '🔁', label: 'Habits',       color: 'bg-amber-100 text-amber-700' },
  'general':    { emoji: '✨', label: 'Insight',      color: 'bg-purple-100 text-purple-700' },
};

/** Formats YYYY-MM-DD to "Mon D" */
function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Parse the AI text into sections */
function parseSections(text: string): { wins: string; insight: string; nextWeek: string; question: string } {
  const winsMatch = /WINS[\s\S]*?(?=INSIGHT|$)/i.exec(text);
  const insightMatch = /INSIGHT[\s\S]*?(?=NEXT WEEK|$)/i.exec(text);
  const nextMatch = /NEXT WEEK[\s\S]*?(?=What would|$)/i.exec(text);
  const qMatch = /What would[\s\S]*?9\/10[\s\S]*?\?/i.exec(text);

  return {
    wins:     winsMatch ? winsMatch[0].replace(/^WINS\s*[—-]?\s*/i, '').trim() : '',
    insight:  insightMatch ? insightMatch[0].replace(/^INSIGHT\s*[—-]?\s*/i, '').trim() : '',
    nextWeek: nextMatch ? nextMatch[0].replace(/^NEXT WEEK\s*[—-]?\s*/i, '').trim() : '',
    question: qMatch ? qMatch[0].trim() : 'What would make next week a 9/10?',
  };
}

function SectionBlock({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-surface-muted flex items-center gap-1.5">
        <span>{emoji}</span>
        {title}
      </h4>
      <div className="text-sm text-surface-ink leading-relaxed whitespace-pre-line">
        {children}
      </div>
    </div>
  );
}

export function RecapCard({ recap, isNew = false }: RecapCardProps) {
  const markOpened = useMarkOpened();
  const { wins, insight, nextWeek, question } = parseSections(recap.recap_text);
  const badge = INSIGHT_BADGES[recap.insight_key] ?? INSIGHT_BADGES['general'];

  // Auto-mark as opened when card mounts
  useEffect(() => {
    if (isNew && !recap.opened_at) {
      markOpened.mutate(recap.id);
    }
  }, [recap.id, isNew, recap.opened_at]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-teal/10 to-indigo-500/10 px-5 py-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">📋</span>
            <h3 className="font-bold text-surface-ink text-sm">Weekly Life Recap</h3>
            {isNew && (
              <span className="text-[10px] font-semibold bg-brand-teal text-white rounded-full px-2 py-0.5">
                NEW
              </span>
            )}
          </div>
          <p className="text-xs text-surface-muted">
            {fmtDate(recap.week_start)} – {fmtDate(
              (() => {
                const d = new Date(recap.week_start + 'T12:00:00Z');
                d.setUTCDate(d.getUTCDate() + 6);
                return d.toISOString().slice(0, 10);
              })()
            )}
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${badge.color} flex items-center gap-1`}>
          {badge.emoji} {badge.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4 divide-y divide-surface-ink/[0.06]">
        {wins && (
          <SectionBlock title="Wins" emoji="🏆">
            {wins}
          </SectionBlock>
        )}

        {insight && (
          <div className="pt-4">
            <SectionBlock title="Insight" emoji="💡">
              {insight}
            </SectionBlock>
          </div>
        )}

        {nextWeek && (
          <div className="pt-4">
            <SectionBlock title="Next Week" emoji="🎯">
              {nextWeek}
            </SectionBlock>
          </div>
        )}
      </div>

      {/* Footer question */}
      <div className="bg-brand-teal/5 border-t border-brand-teal/20 px-5 py-3">
        <p className="text-xs font-semibold text-brand-teal italic">{question}</p>
      </div>
    </div>
  );
}
