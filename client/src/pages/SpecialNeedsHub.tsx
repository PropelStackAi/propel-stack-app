import { useState } from 'react';
import { useSnfsDisclaimer } from '../features/snfs/api';
import { DisclaimerGate } from '../features/snfs/components/DisclaimerGate';
import { CrisisPanel } from '../features/snfs/components/CrisisPanel';
import { SNFSAI } from '../features/snfs/components/SNFSAI';
import { ConditionLibrary } from '../features/snfs/components/ConditionLibrary';
import { IEPToolkit } from '../features/snfs/components/IEPToolkit';
import { BehaviorLibrary } from '../features/snfs/components/BehaviorLibrary';
import { CrisisPlanTool } from '../features/snfs/components/CrisisPlanTool';
import { CaregiverSupport } from '../features/snfs/components/CaregiverSupport';
import { TransitionHub } from '../features/snfs/components/TransitionHub';
import { MedicationReference } from '../features/snfs/components/MedicationReference';
import { CommunityDirectory } from '../features/snfs/components/CommunityDirectory';
import { DocumentOrganizer } from '../features/snfs/components/DocumentOrganizer';
import { ProgressTracker } from '../features/snfs/components/ProgressTracker';
import { EmergencyInfoCard } from '../features/snfs/components/EmergencyInfoCard';
import { CareTeamManager } from '../features/snfs/components/CareTeamManager';

/**
 * Special Needs Family Support Hub — Session 12.
 *
 * SAFETY ARCHITECTURE (enforced in strict order):
 *   1. Disclaimer gate PSAI-SNFS-DISC-v1.0 — scroll-lock, user must agree before any access.
 *   2. Crisis panel — persistent on EVERY tab.
 *   3. AI crisis detection — server-side, runs before every AI call (in SNFSAI component + server route).
 *   4. AI guardrails — never diagnoses, never recommends medications, cites DSM-5/IDEA 2004/AAP/CDC/NAMI.
 */

type Tab =
  | 'ai' | 'conditions' | 'iep' | 'behavior'
  | 'crisis-plan' | 'care-team' | 'caregiver'
  | 'transition' | 'medications' | 'community'
  | 'documents' | 'progress' | 'emergency-card';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'ai',            label: 'Ask AI',           emoji: '💜' },
  { id: 'conditions',    label: 'Condition Library', emoji: '📚' },
  { id: 'iep',           label: 'IEP & 504',         emoji: '🎓' },
  { id: 'behavior',      label: 'Behavior',          emoji: '🧠' },
  { id: 'crisis-plan',   label: 'Crisis Plan',       emoji: '🚨' },
  { id: 'care-team',     label: 'Care Team',         emoji: '👥' },
  { id: 'caregiver',     label: 'Caregiver Support', emoji: '💚' },
  { id: 'transition',    label: 'Transition (14+)',  emoji: '🔄' },
  { id: 'medications',   label: 'Medications',       emoji: '💊' },
  { id: 'community',     label: 'Community',         emoji: '🏘️' },
  { id: 'documents',     label: 'Documents',         emoji: '📁' },
  { id: 'progress',      label: 'Progress',          emoji: '📈' },
  { id: 'emergency-card',label: 'Emergency Card',    emoji: '🆘' },
];

export function SpecialNeedsHub(): JSX.Element {
  const { data: disclaimer, isLoading } = useSnfsDisclaimer();
  const [localAgreed, setLocalAgreed] = useState(false);
  const [tab, setTab] = useState<Tab>('ai');

  // While loading disclaimer status, show nothing (prevents flash)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-surface-muted text-sm">Loading…</div>
      </div>
    );
  }

  // Show disclaimer gate if not acknowledged
  const hasAcknowledged = disclaimer?.acknowledged || localAgreed;
  if (!hasAcknowledged) {
    return <DisclaimerGate onAgreed={() => setLocalAgreed(true)} />;
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="font-display font-bold text-2xl text-surface-ink">Special Needs Family Support</h1>
        <p className="text-surface-muted text-sm mt-0.5">
          Support hub for families and caregivers — condition library, IEP tools, behavior strategies, crisis planning, and AI Q&A.
        </p>
      </div>

      {/* ── PERSISTENT CRISIS PANEL — required on every screen ── */}
      <CrisisPanel />

      {/* Disclaimer version chip */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-surface-muted bg-surface-sunk rounded-full px-2 py-0.5">
          PSAI-SNFS-DISC-v1.0 acknowledged
        </span>
        <span className="text-[10px] text-surface-muted">·</span>
        <span className="text-[10px] text-surface-muted">
          General information only — not professional medical, psychological, or legal advice.
          Always consult a licensed professional.
        </span>
      </div>

      {/* Tab navigation — horizontally scrollable on mobile */}
      <div className="flex overflow-x-auto gap-1 mb-6 pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0',
              tab === t.id
                ? 'bg-brand-purple text-white'
                : 'text-surface-muted hover:text-surface-ink hover:bg-surface-sunk',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content — crisis panel is always shown at top (above) */}
      <div>
        {tab === 'ai'            && <SNFSAI />}
        {tab === 'conditions'    && <ConditionLibrary />}
        {tab === 'iep'           && <IEPToolkit />}
        {tab === 'behavior'      && <BehaviorLibrary />}
        {tab === 'crisis-plan'   && <CrisisPlanTool />}
        {tab === 'care-team'     && <CareTeamManager />}
        {tab === 'caregiver'     && <CaregiverSupport />}
        {tab === 'transition'    && <TransitionHub />}
        {tab === 'medications'   && <MedicationReference />}
        {tab === 'community'     && <CommunityDirectory />}
        {tab === 'documents'     && <DocumentOrganizer />}
        {tab === 'progress'      && <ProgressTracker />}
        {tab === 'emergency-card' && <EmergencyInfoCard />}
      </div>
    </div>
  );
}
