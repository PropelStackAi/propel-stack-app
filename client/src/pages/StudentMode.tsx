// ─── Student Mode Hub ─────────────────────────────────────────────────────────
// Session 14 (Bug Fix) — Propel Stack AI, LLC
//
// Tabs: AI Tutor | Flashcards | Courses | Writing | Resources

import { useState } from 'react';
import { AITutor }          from '../features/student/components/AITutor';
import { Flashcards }       from '../features/student/components/Flashcards';
import { CoursesTracker }   from '../features/student/components/CoursesTracker';
import { WritingTab }       from '../features/student/components/WritingTab';
import { ResourcesLibrary } from '../features/student/components/ResourcesLibrary';

type Tab = 'tutor' | 'flashcards' | 'courses' | 'writing' | 'resources';

const TABS: { id: Tab; label: string; emoji: string; description: string }[] = [
  { id: 'tutor',      label: 'AI Tutor',   emoji: '🎓', description: 'Guided, Socratic learning — I ask, you think' },
  { id: 'flashcards', label: 'Flashcards', emoji: '🃏', description: 'SM-2 spaced repetition for maximum retention'  },
  { id: 'courses',    label: 'Courses',    emoji: '📚', description: 'Track your coursework and GPA'                 },
  { id: 'writing',    label: 'Writing',    emoji: '✍️', description: 'Essays, research papers, theses, and notes'    },
  { id: 'resources',  label: 'Resources',  emoji: '🔬', description: 'Research library — save sources and articles'  },
];

export function StudentMode(): JSX.Element {
  const [tab, setTab] = useState<Tab>('tutor');
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          🎓 Student Mode
        </h2>
        <p className="text-xs text-surface-muted">
          K–12 through graduate school. AI that guides, never writes for you.
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
                ? 'bg-brand-coral text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Active tab subtitle */}
      <p className="text-xs text-surface-muted">{active.description}</p>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'tutor'      && <AITutor />}
        {tab === 'flashcards' && <Flashcards />}
        {tab === 'courses'    && <CoursesTracker />}
        {tab === 'writing'    && <WritingTab />}
        {tab === 'resources'  && <ResourcesLibrary />}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI, LLC · Student Mode ·
        Academic integrity matters — always cite sources and submit your own work.
      </p>
    </div>
  );
}
