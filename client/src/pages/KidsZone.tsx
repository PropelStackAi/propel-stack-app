import { useState, useEffect, useRef } from 'react';
import { useChildren } from '../features/parental/api';
import { useKidsScreenTime, useKidsStars, useTickScreenTime } from '../features/kids/api';
import { KidsBanner } from '../features/kids/components/KidsBanner';
import { ScreenTimeLock } from '../features/kids/components/ScreenTimeLock';
import { StoryGenerator } from '../features/kids/components/StoryGenerator';
import { HomeworkHelper } from '../features/kids/components/HomeworkHelper';
import { BrainGame } from '../features/kids/components/BrainGame';
import { StarRewards } from '../features/kids/components/StarRewards';
import type { ActivityType } from '../features/kids/types';
import { ACTIVITY_CONFIG } from '../features/kids/types';

/**
 * Kids Zone — Session 9.
 * Themed section within existing shell for children ages 5-12.
 * COPPA: no behavioral tracking, no ads, content filter enforced.
 * Screen time enforced client-side (countdown) + server-side (423 on AI calls).
 */
export function KidsZone(): JSX.Element {
  const { data: children, isLoading, error } = useChildren();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityType | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const selectedChild = children?.find((c) => c.id === selectedChildId) ?? null;
  const { data: timeStatus } = useKidsScreenTime(selectedChildId);
  const { data: starsData } = useKidsStars(selectedChildId);
  const tickMutation = useTickScreenTime();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick screen time every 60s while a child is active and time is allowed
  useEffect(() => {
    if (!selectedChildId || !timeStatus?.allowed) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      tickMutation.mutate({ childId: selectedChildId, minutes: 1 });
    }, 60_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId, timeStatus?.allowed]);

  // Family plan gate
  const isFamilyGate = !isLoading && (error as Error | null)?.message?.includes('Family plan');

  if (isFamilyGate) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="font-display font-bold text-2xl text-surface-ink mb-2">Family Plan Required</h2>
        <p className="text-surface-muted mb-6">
          Kids Zone is available on the Family plan. Upgrade to unlock safe, fun AI features for children ages 5–12.
        </p>
      </div>
    );
  }

  if (isLoading) return <div className="py-16 text-center text-surface-muted">Loading…</div>;

  // No child profiles
  if (!children || children.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="text-5xl mb-4">👶</div>
        <h2 className="font-display font-bold text-2xl text-surface-ink mb-2">Set up a child profile first</h2>
        <p className="text-surface-muted mb-6">
          Create a child profile in Parental Controls, then come back here to enter the Kids Zone.
        </p>
        <a href="#/parental" className="btn bg-brand-purple text-white hover:bg-brand-purple/90">
          Go to Parental Controls
        </a>
      </div>
    );
  }

  // Child selector screen
  if (!selectedChildId) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌟</div>
          <h1 className="font-display font-bold text-3xl text-brand-purple">Kids Zone</h1>
          <p className="text-surface-muted mt-1">Who's ready to learn and play?</p>
        </div>
        <div className="space-y-3">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => { setSelectedChildId(child.id); setUnlocked(false); setActivity(null); }}
              className="w-full flex items-center gap-4 rounded-2xl border-2 border-brand-purple/20 bg-gradient-to-r from-purple-50 to-pink-50 p-5 hover:border-brand-purple hover:shadow-sm transition-all text-left"
            >
              <span className="text-4xl">{child.avatar_emoji}</span>
              <div>
                <div className="font-display font-bold text-lg text-surface-ink">{child.name}</div>
                <div className="text-xs text-surface-muted">{child.age_range === 'child' ? 'Ages 5–8' : 'Ages 9–12'}</div>
              </div>
              <span className="ml-auto text-brand-purple text-xl">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!selectedChild) return <div className="py-16 text-center text-surface-muted">Loading profile…</div>;

  const timeAllowed = timeStatus?.allowed ?? true;
  const remainingMinutes = timeStatus?.remainingMinutes ?? selectedChild.screen_time_limit_minutes;
  const limitMinutes = timeStatus?.limitMinutes ?? selectedChild.screen_time_limit_minutes;
  const totalStars = starsData?.totalStars ?? 0;

  // Screen time lock
  if (!timeAllowed && !unlocked) {
    return (
      <ScreenTimeLock
        childId={selectedChildId}
        childName={selectedChild.name}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  const approvedSections = JSON.parse(selectedChild.app_sections_approved) as string[];

  return (
    <div>
      <button
        onClick={() => { setSelectedChildId(null); setActivity(null); }}
        className="text-sm text-surface-muted hover:text-surface-ink mb-4 flex items-center gap-1"
      >
        ← Switch child
      </button>

      <KidsBanner
        child={selectedChild}
        totalStars={totalStars}
        remainingMinutes={remainingMinutes}
        limitMinutes={limitMinutes}
      />

      {activity ? (
        <div>
          <button
            onClick={() => setActivity(null)}
            className="text-sm text-surface-muted hover:text-surface-ink mb-4 flex items-center gap-1"
          >
            ← Back to activities
          </button>
          {activity === 'stories'  && <StoryGenerator childId={selectedChildId} />}
          {activity === 'bedtime'  && <StoryGenerator childId={selectedChildId} isBedtime />}
          {activity === 'homework' && <HomeworkHelper childId={selectedChildId} />}
          {activity === 'games'    && (
            <div className="space-y-6">
              <BrainGame childId={selectedChildId} />
              <StarRewards totalStars={totalStars} />
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="font-display font-bold text-lg text-surface-ink mb-4">What do you want to do?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {(Object.entries(ACTIVITY_CONFIG) as [ActivityType, typeof ACTIVITY_CONFIG[ActivityType]][]).map(([type, cfg]) => {
              const sectionKey = type === 'bedtime' ? 'stories' : type;
              const approved = approvedSections.includes(sectionKey);
              return (
                <button
                  key={type}
                  onClick={() => approved && setActivity(type)}
                  className={[
                    'rounded-2xl p-5 flex flex-col items-center gap-2 border-2 transition-all',
                    approved
                      ? `${cfg.bg} border-transparent hover:scale-[1.03] cursor-pointer shadow-sm`
                      : 'bg-surface-sunk border-surface-ink/5 opacity-40 cursor-not-allowed',
                  ].join(' ')}
                >
                  <span className="text-4xl leading-none">{cfg.emoji}</span>
                  <span className={`text-sm font-bold text-center leading-tight ${approved ? cfg.color : 'text-surface-muted'}`}>
                    {cfg.label}
                  </span>
                  {!approved && <span className="text-[10px] text-surface-muted">Locked by parent</span>}
                </button>
              );
            })}
          </div>
          <StarRewards totalStars={totalStars} />
        </div>
      )}
    </div>
  );
}
