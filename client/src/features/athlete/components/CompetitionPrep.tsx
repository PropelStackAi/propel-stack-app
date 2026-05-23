import { useState } from 'react';
import { PacingCalculator } from './PacingCalculator';
import { COMPETITION_CHECKLIST } from '../types';
import type { AthleteProfile } from '../types';

interface Props { profile: AthleteProfile; }

type CompTab = 'countdown' | 'pacing' | 'peakweek' | 'checklist';

const COMP_TABS: { id: CompTab; label: string; emoji: string }[] = [
  { id: 'countdown', label: 'Countdown', emoji: '⏳' },
  { id: 'pacing', label: 'Pacing Calc', emoji: '⏱️' },
  { id: 'peakweek', label: 'Peak Week', emoji: '📈' },
  { id: 'checklist', label: 'Checklist', emoji: '✅' },
];

const PEAK_WEEK_TIPS = [
  { day: 'Mon', title: 'Last hard session', desc: 'Final quality workout — keep it short and crisp. Confirm your race plan.' },
  { day: 'Tue', title: 'Active recovery', desc: 'Light movement only. Foam roll, stretch, prioritize sleep.' },
  { day: 'Wed', title: 'Shakeout + strides', desc: '20–30 min easy + 4–6 short strides. Legs should feel springy.' },
  { day: 'Thu', title: 'Rest or very easy', desc: 'Walk, yoga, or complete rest. Stay off your feet as much as possible.' },
  { day: 'Fri', title: 'Pre-race shakeout', desc: '15–20 min easy + 3–4 strides. Visualize your race strategy.' },
  { day: 'Sat', title: 'Race day!', desc: 'Trust your training. Warm up thoroughly. Execute your pacing plan.' },
  { day: 'Sun', title: 'Active recovery', desc: 'Light walk or swim. Celebrate your effort! Begin recovery week.' },
];

const NUTRITION_TIPS = [
  'Carb-load 2–3 days before: increase complex carb intake to 8–10g/kg',
  'Maintain protein intake throughout taper week',
  'Avoid new/unfamiliar foods in the final 48 hours',
  'Pre-race meal: high carb, low fat/fiber, tested in training',
  'Race-morning: eat 2–3 hours before, familiar foods you\'ve practiced',
  'Stay well hydrated all week — urine should be pale yellow',
];

export function CompetitionPrep({ profile }: Props): JSX.Element {
  const [tab, setTab] = useState<CompTab>('countdown');
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const compDate = profile.competition_date;

  function toggleCheck(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function daysUntil(): number | null {
    if (!compDate) return null;
    const diff = new Date(compDate + 'T12:00:00').getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  const days = daysUntil();

  return (
    <div className="space-y-4">
      {/* Tab nav */}
      <div className="flex flex-wrap gap-1.5">
        {COMP_TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              tab === t.id
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Countdown */}
      {tab === 'countdown' && (
        <div className="space-y-4">
          {compDate ? (
            <div className="rounded-2xl bg-gradient-to-br from-brand-teal/10 to-brand-indigo/10 border border-brand-teal/20 px-6 py-8 text-center">
              <div className={`text-7xl font-black mb-2 ${days !== null && days <= 0 ? 'text-green-600' : 'text-brand-teal'}`}>
                {days === null ? '—' : days <= 0 ? '🎉' : days}
              </div>
              {days !== null && days > 0 && <div className="text-surface-muted text-sm">days until competition</div>}
              {days !== null && days <= 0 && <div className="text-green-600 font-bold text-lg">Race day is here!</div>}
              <div className="text-surface-ink font-semibold mt-2">
                {new Date(compDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              {days !== null && days > 0 && days <= 7 && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-800">
                  🏁 Race week! Switch to peak week protocol. Reduce training volume 40–60%.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm text-surface-muted">No competition date set. Update your profile to add a target event date.</p>
            </div>
          )}

          {/* Pre-race nutrition reminders */}
          <div className="rounded-xl bg-surface-sunk/30 border border-surface-ink/[0.06] px-4 py-3 space-y-2">
            <h4 className="text-xs font-semibold text-surface-ink">Pre-race nutrition reminders</h4>
            {NUTRITION_TIPS.map((tip, i) => (
              <div key={i} className="flex gap-2 text-xs text-surface-muted">
                <span className="text-brand-teal flex-shrink-0">•</span>{tip}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pacing Calculator */}
      {tab === 'pacing' && <PacingCalculator />}

      {/* Peak week guide */}
      {tab === 'peakweek' && (
        <div className="space-y-3">
          <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-xs text-indigo-800">
            <strong>Peak Week:</strong> The final week before competition. Reduce volume by 40–60% while maintaining intensity. Trust your training — fitness is already built.
          </div>
          <div className="space-y-2">
            {PEAK_WEEK_TIPS.map((tip, i) => (
              <div key={i} className="flex gap-3 rounded-xl bg-surface-raised border border-surface-ink/[0.06] px-4 py-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center">
                  <span className="text-[10px] font-black text-brand-teal">{tip.day}</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-surface-ink">{tip.title}</div>
                  <p className="text-xs text-surface-muted leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competition checklist */}
      {tab === 'checklist' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-surface-ink">Competition preparation checklist</h4>
            <span className="text-xs text-surface-muted">{checked.size}/{COMPETITION_CHECKLIST.length} done</span>
          </div>
          {/* Progress */}
          <div className="h-2 bg-surface-sunk rounded-full overflow-hidden mb-3">
            <div className="h-full bg-brand-teal rounded-full transition-all" style={{ width: `${(checked.size / COMPETITION_CHECKLIST.length) * 100}%` }} />
          </div>
          {COMPETITION_CHECKLIST.map((item, i) => (
            <label key={i} className="flex items-start gap-3 cursor-pointer rounded-xl px-3 py-2 hover:bg-surface-sunk/30 transition-colors">
              <input type="checkbox" checked={checked.has(i)} onChange={() => toggleCheck(i)} className="mt-0.5 accent-brand-teal" />
              <span className={`text-xs leading-relaxed ${checked.has(i) ? 'line-through text-surface-muted' : 'text-surface-ink'}`}>{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
