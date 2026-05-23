import { useState } from 'react';
import { IEP_504_CONTENT } from '../types';

type IEPTab = 'compare' | 'rights' | 'prep' | 'goals' | 'accommodations';

const IEP_TABS: { id: IEPTab; label: string; emoji: string }[] = [
  { id: 'compare', label: 'IEP vs. 504', emoji: '⚖️' },
  { id: 'rights', label: 'Parent Rights', emoji: '🛡️' },
  { id: 'prep', label: 'Meeting Prep', emoji: '📋' },
  { id: 'goals', label: 'Goal Writing', emoji: '🎯' },
  { id: 'accommodations', label: 'Accommodations', emoji: '♿' },
];

export function IEPToolkit(): JSX.Element {
  const [tab, setTab] = useState<IEPTab>('compare');

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
        <strong>IEP & 504 Toolkit:</strong> General information based on IDEA 2004 and Section 504 of the Rehabilitation Act.{' '}
        For legal guidance specific to your situation, consult a special education attorney or contact your state\'s Parent Training and Information (PTI) Center.
      </div>

      <div className="flex flex-wrap gap-1.5">
        {IEP_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              tab === t.id
                ? 'bg-brand-indigo text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink hover:bg-surface-sunk',
            ].join(' ')}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {tab === 'compare' && <IEPCompare />}
      {tab === 'rights' && <ParentRights />}
      {tab === 'prep' && <MeetingPrep />}
      {tab === 'goals' && <GoalWriting />}
      {tab === 'accommodations' && <Accommodations />}
    </div>
  );
}

function IEPCompare(): JSX.Element {
  const { iep, plan504 } = IEP_504_CONTENT.comparison;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50 p-4">
        <div className="font-bold text-indigo-800 text-base mb-1">IEP</div>
        <div className="text-[10px] text-indigo-600 mb-3">{iep.law}</div>
        <div className="text-xs font-semibold text-indigo-700 mb-1">Who qualifies:</div>
        <p className="text-xs text-indigo-800 mb-3">{iep.whoQualifies}</p>
        <div className="text-xs font-semibold text-indigo-700 mb-1">13 Disability categories:</div>
        <ul className="space-y-0.5">
          {iep.categories.map((c) => (
            <li key={c} className="text-xs text-indigo-700 flex gap-1.5"><span className="flex-shrink-0">•</span>{c}</li>
          ))}
        </ul>
        <div className="text-xs font-semibold text-indigo-700 mt-3 mb-1">Includes:</div>
        <ul className="space-y-0.5">
          {iep.includes.map((i) => (
            <li key={i} className="text-xs text-indigo-700 flex gap-1.5"><span className="text-green-500 flex-shrink-0">✓</span>{i}</li>
          ))}
        </ul>
        <p className="text-[10px] text-indigo-600 mt-3">{iep.funding}</p>
      </div>

      <div className="rounded-xl border-2 border-teal-400 bg-teal-50 p-4">
        <div className="font-bold text-teal-800 text-base mb-1">504 Plan</div>
        <div className="text-[10px] text-teal-600 mb-3">{plan504.law}</div>
        <div className="text-xs font-semibold text-teal-700 mb-1">Who qualifies:</div>
        <p className="text-xs text-teal-800 mb-3">{plan504.whoQualifies}</p>
        <div className="text-xs font-semibold text-teal-700 mb-1">Includes:</div>
        <ul className="space-y-0.5">
          {plan504.includes.map((i) => (
            <li key={i} className="text-xs text-teal-700 flex gap-1.5"><span className="text-green-500 flex-shrink-0">✓</span>{i}</li>
          ))}
        </ul>
        <p className="text-[10px] text-teal-600 mt-3">{plan504.funding}</p>
      </div>
    </div>
  );
}

function ParentRights(): JSX.Element {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm text-surface-ink">Your rights under IDEA 2004</h4>
      <div className="space-y-2">
        {IEP_504_CONTENT.parentRights.map((right, i) => (
          <div key={i} className="flex gap-3 rounded-xl bg-surface-sunk/30 px-3 py-2">
            <span className="text-indigo-500 font-bold text-sm flex-shrink-0">{i + 1}</span>
            <p className="text-xs text-surface-ink leading-relaxed">{right}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-surface-muted italic mt-2">
        Rights apply to public schools. Private schools have different rules. Consult a special education attorney for your specific state and situation.
      </p>
    </div>
  );
}

function MeetingPrep(): JSX.Element {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm text-surface-ink">IEP meeting preparation checklist</h4>
        <span className="text-xs text-surface-muted">{checked.size}/{IEP_504_CONTENT.meetingPrepChecklist.length} done</span>
      </div>
      {IEP_504_CONTENT.meetingPrepChecklist.map((item, i) => (
        <label key={i} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked.has(i)}
            onChange={() => toggle(i)}
            className="mt-0.5 accent-indigo-600"
          />
          <span className={`text-xs leading-relaxed ${checked.has(i) ? 'line-through text-surface-muted' : 'text-surface-ink'}`}>{item}</span>
        </label>
      ))}
    </div>
  );
}

function GoalWriting(): JSX.Element {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm text-surface-ink">Writing effective IEP goals</h4>
      {IEP_504_CONTENT.goalWritingTips.map((tip, i) => (
        <div key={i} className={[
          'rounded-xl px-4 py-3 text-xs leading-relaxed',
          tip.startsWith('Good goal') ? 'bg-green-50 border border-green-200 text-green-800' :
          tip.startsWith('Vague goal') ? 'bg-red-50 border border-red-200 text-red-700' :
          'bg-surface-sunk/40 text-surface-ink',
        ].join(' ')}>
          {tip.startsWith('Good goal') && <span className="font-bold text-green-700">✅ </span>}
          {tip.startsWith('Vague goal') && <span className="font-bold text-red-600">❌ </span>}
          {tip}
        </div>
      ))}
    </div>
  );
}

function Accommodations(): JSX.Element {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm text-surface-ink">Common accommodations to consider</h4>
      <p className="text-xs text-surface-muted">Accommodations level the playing field — they do not change what is being taught, only how a student accesses or demonstrates learning.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {IEP_504_CONTENT.commonAccommodations.map((acc, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl bg-surface-raised border border-surface-ink/[0.06] px-3 py-2">
            <span className="text-indigo-400 flex-shrink-0 mt-0.5">✓</span>
            <span className="text-xs text-surface-ink leading-snug">{acc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
