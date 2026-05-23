import { useState } from 'react';
import { MEDICATION_CLASSES, MEDICATION_REFERENCE_DISCLAIMER } from '../types';

export function MedicationReference(): JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* BIG disclaimer — always at the top */}
      <div className="rounded-xl bg-red-50 border-2 border-red-300 px-5 py-4">
        <div className="flex gap-3 items-start">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <p className="text-xs text-red-800 leading-relaxed font-medium">{MEDICATION_REFERENCE_DISCLAIMER}</p>
        </div>
      </div>

      <p className="text-xs text-surface-muted">
        Below are general descriptions of medication <em>classes</em> — not specific drugs — that healthcare providers sometimes discuss in the context of special needs care.
        This section will help you have more informed conversations with your care team.
      </p>

      {/* Medication classes */}
      <div className="space-y-3">
        {MEDICATION_CLASSES.map((medClass) => (
          <div key={medClass.class} className="rounded-xl border border-surface-ink/[0.08] bg-surface-raised overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === medClass.class ? null : medClass.class)}
              className="w-full flex items-start justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
            >
              <div>
                <div className="font-semibold text-sm text-surface-ink">{medClass.class}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {medClass.commonlyDiscussedFor.map((c) => (
                    <span key={c} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5">{c}</span>
                  ))}
                </div>
              </div>
              <span className="text-surface-muted ml-4 flex-shrink-0">{expanded === medClass.class ? '▲' : '▼'}</span>
            </button>

            {expanded === medClass.class && (
              <div className="px-4 pb-4 space-y-3 border-t border-surface-ink/[0.06]">
                <p className="text-xs text-surface-ink leading-relaxed pt-3">{medClass.generalPurpose}</p>

                <div>
                  <div className="text-[10px] font-semibold text-surface-muted uppercase tracking-wider mb-1.5">💬 Questions to ask your doctor</div>
                  <ul className="space-y-1">
                    {medClass.questionsToAsk.map((q) => (
                      <li key={q} className="flex gap-2 text-xs text-surface-ink">
                        <span className="text-indigo-400 flex-shrink-0 mt-0.5">?</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-xs text-amber-800"><strong>Important:</strong> {medClass.importantNote}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3">
        <div className="font-semibold text-xs text-green-700 mb-1">💡 How to use this section</div>
        <ul className="space-y-1">
          {[
            'Use the "Questions to ask your doctor" to prepare for medical appointments.',
            'Never start, stop, or change any medication without your physician\'s guidance.',
            'Bring a list of ALL current medications (including OTC and supplements) to every appointment.',
            'Ask your pharmacist about drug interactions — they are an underutilized resource.',
            'Keep a log of how medications affect behavior, sleep, and mood to share with your care team.',
          ].map((tip, i) => (
            <li key={i} className="flex gap-2 text-xs text-green-800">
              <span className="flex-shrink-0">✓</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
