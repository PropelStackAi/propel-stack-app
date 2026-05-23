// ─── Athlete Performance Hub ────────────────────────────────────────────────
// Session 13 — Propel Stack AI, LLC

import { useState } from 'react';
import { useAthleteProfile } from '../features/athlete/api';
import { DisclaimerBanner } from '../features/athlete/components/DisclaimerBanner';
import { ProfileWizard } from '../features/athlete/components/ProfileWizard';
import { MyPlan } from '../features/athlete/components/MyPlan';
import { WorkoutLogger } from '../features/athlete/components/WorkoutLogger';
import { NutritionTab } from '../features/athlete/components/NutritionTab';
import { RecoveryTab } from '../features/athlete/components/RecoveryTab';
import { CompetitionPrep } from '../features/athlete/components/CompetitionPrep';
import { AthleteAI } from '../features/athlete/components/AthleteAI';

type HubTab = 'plan' | 'workouts' | 'nutrition' | 'recovery' | 'compete' | 'ai';

const HUB_TABS: { id: HubTab; label: string; emoji: string }[] = [
  { id: 'plan', label: 'My Plan', emoji: '📋' },
  { id: 'workouts', label: 'Workouts', emoji: '🏋️' },
  { id: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { id: 'recovery', label: 'Recovery', emoji: '😴' },
  { id: 'compete', label: 'Compete', emoji: '🏆' },
  { id: 'ai', label: 'AI Coach', emoji: '🤖' },
];

export function AthleteHub(): JSX.Element {
  const { data: profile, isLoading } = useAthleteProfile();
  const [tab, setTab] = useState<HubTab>('plan');
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-surface-muted">Loading Athlete Hub…</div>
      </div>
    );
  }

  // No profile — show wizard
  if (!profile || showWizard) {
    return (
      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-xl font-bold text-surface-ink">Athlete Performance Hub</h2>
          <p className="text-sm text-surface-muted mt-1">Let's set up your athlete profile to personalize your training experience.</p>
        </div>
        <ProfileWizard onComplete={() => setShowWizard(false)} />
      </div>
    );
  }

  const sports: string[] = (() => { try { return JSON.parse(profile.sports) as string[]; } catch { return []; } })();
  const dismissedAt = dismissedLocally ? new Date().toISOString() : (profile.disclaimer_dismissed_at ?? null);

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
            🏆 Athlete Performance Hub
            {profile.is_youth_under_14 && (
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-lg px-2 py-0.5 font-semibold">Youth Mode</span>
            )}
          </h2>
          <p className="text-xs text-surface-muted">{sports.join(' · ') || 'No sports selected'}</p>
        </div>
        <button onClick={() => setShowWizard(true)} className="btn-outline text-xs flex-shrink-0">
          ✏️ Edit profile
        </button>
      </div>

      {/* Disclaimer banner */}
      <DisclaimerBanner
        dismissedAt={dismissedAt}
        onDismissed={() => setDismissedLocally(true)}
      />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {HUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all',
              tab === t.id
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink hover:bg-surface-sunk',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'plan' && <MyPlan profile={profile} />}
        {tab === 'workouts' && <WorkoutLogger profile={profile} />}
        {tab === 'nutrition' && <NutritionTab profile={profile} />}
        {tab === 'recovery' && <RecoveryTab />}
        {tab === 'compete' && <CompetitionPrep profile={profile} />}
        {tab === 'ai' && <AthleteAI profile={profile} />}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI, LLC · Athlete Performance Hub · PSAI-ATH-DISC-v1.0 ·
        For medical concerns or serious injury, stop training and seek professional care immediately.
      </p>
    </div>
  );
}
