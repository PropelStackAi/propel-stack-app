import { useState } from 'react';
import { HealthDisclaimer } from '../features/health/components/HealthDisclaimer';
import { HealthProfileTab } from '../features/health/components/HealthProfile';
import { VitalsLog } from '../features/health/components/VitalsLog';
import { SymptomJournal } from '../features/health/components/SymptomJournal';
import { MedicationTracker } from '../features/health/components/MedicationTracker';
import { AppointmentList } from '../features/health/components/AppointmentList';
import { HealthAI } from '../features/health/components/HealthAI';

/**
 * Health Hub — Session 10.
 * SAFETY: Medical disclaimer appears on every tab.
 * AI Q&A: never diagnoses; always defers to a physician; crisis keywords → 988.
 */

type Tab = 'profile' | 'vitals' | 'symptoms' | 'medications' | 'appointments' | 'ai';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'profile',      label: 'Profile',      emoji: '👤' },
  { id: 'vitals',       label: 'Vital Signs',  emoji: '📊' },
  { id: 'symptoms',     label: 'Symptoms',     emoji: '📋' },
  { id: 'medications',  label: 'Medications',  emoji: '💊' },
  { id: 'appointments', label: 'Appointments', emoji: '📅' },
  { id: 'ai',           label: 'Ask AI',       emoji: '🩺' },
];

export function HealthHub(): JSX.Element {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="font-display font-bold text-2xl text-surface-ink">Health Hub</h1>
        <p className="text-surface-muted text-sm mt-0.5">
          Personal health tracking — vitals, symptoms, medications, appointments, and AI health information.
        </p>
      </div>

      {/* Persistent disclaimer — required on every page */}
      <HealthDisclaimer />

      {/* Crisis line — always visible */}
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 mb-5 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-red-700 font-semibold">🚨 In a medical emergency, call 911 immediately.</span>
        <div className="flex gap-2">
          <a href="tel:911"   className="text-xs font-bold text-white bg-red-600 rounded-lg px-3 py-1.5 hover:bg-red-700">Call 911</a>
          <a href="tel:988"   className="text-xs font-bold text-red-700 bg-red-100 rounded-lg px-3 py-1.5 hover:bg-red-200">Call 988</a>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex overflow-x-auto gap-1 mb-6 pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0',
              tab === t.id
                ? 'bg-brand-coral text-white'
                : 'text-surface-muted hover:text-surface-ink hover:bg-surface-sunk',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'profile'      && <HealthProfileTab />}
        {tab === 'vitals'       && <VitalsLog />}
        {tab === 'symptoms'     && <SymptomJournal />}
        {tab === 'medications'  && <MedicationTracker />}
        {tab === 'appointments' && <AppointmentList />}
        {tab === 'ai'           && <HealthAI />}
      </div>
    </div>
  );
}
