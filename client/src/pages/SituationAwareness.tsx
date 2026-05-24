/**
 * Situation Awareness — Mindfulness & Awareness Hub
 * Propel Stack AI, LLC
 *
 * NO clinical screening instruments. Mindfulness only.
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Intention {
  intention: string;
  date: string;
}

interface GratitudeEntry {
  items: string[];
  date: string;
}

interface MoodEntry {
  score: number;
  date: string;
}

interface StreakData {
  streak_days: number;
  last_active_date: string | null;
}

interface ReflectionPrompt {
  prompt: string;
  week_start: string;
}

// 4-7-8 breathing cycle phases
const BREATHING_PHASES = [
  { label: 'Inhale…', duration: 4, scale: 1.6 },
  { label: 'Hold…', duration: 7, scale: 1.6 },
  { label: 'Exhale…', duration: 8, scale: 1.0 },
];

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];

export function SituationAwareness() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'today' | 'breathe' | 'gratitude' | 'reflection'>('today');

  // ---- Today tab state ----
  const [intentionText, setIntentionText] = useState('');
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [gratitudeInputs, setGratitudeInputs] = useState(['', '', '']);
  const [gratitudeSaved, setGratitudeSaved] = useState(false);

  // ---- Breathe tab state ----
  const [breatheActive, setBreatheActive] = useState(false);
  const [breathePhaseIdx, setBreathePhaseIdx] = useState(0);
  const [breatheSecondsInPhase, setBreatheSecondsInPhase] = useState(0);
  const [breatheSessionSeconds, setBreatheSessionSeconds] = useState(0);
  const [breatheSessionCount, setBreatheSessionCount] = useState(0);
  const breatheIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breatheStartRef = useRef<number>(0);

  // ---- Reflection tab state ----
  const [reflectionText, setReflectionText] = useState('');
  const [copied, setCopied] = useState(false);

  // ---- Queries ----
  const { data: intention, isLoading: intentionLoading } = useQuery<Intention | null>({
    queryKey: ['awareness-intention'],
    queryFn: () => apiRequest<Intention | null>('/api/awareness/intention'),
  });

  const { data: todayGratitude, isLoading: gratitudeLoading } = useQuery<GratitudeEntry | null>({
    queryKey: ['awareness-gratitude'],
    queryFn: () => apiRequest<GratitudeEntry | null>('/api/awareness/gratitude'),
  });

  const { data: todayMood } = useQuery<MoodEntry | null>({
    queryKey: ['awareness-mood'],
    queryFn: () => apiRequest<MoodEntry | null>('/api/awareness/mood'),
  });

  const { data: streak } = useQuery<StreakData>({
    queryKey: ['awareness-streak'],
    queryFn: () => apiRequest<StreakData>('/api/awareness/streak'),
  });

  const { data: gratitudeHistory = [], isLoading: historyLoading } = useQuery<GratitudeEntry[]>({
    queryKey: ['awareness-gratitude-history'],
    queryFn: () => apiRequest<GratitudeEntry[]>('/api/awareness/gratitude/history'),
  });

  const { data: reflectionPrompt } = useQuery<ReflectionPrompt>({
    queryKey: ['awareness-reflection-prompt'],
    queryFn: () => apiRequest<ReflectionPrompt>('/api/awareness/reflection-prompt'),
  });

  // Pre-fill from today's saved data
  useEffect(() => {
    if (intention?.intention && !intentionText) {
      setIntentionText(intention.intention);
    }
  }, [intention]);

  useEffect(() => {
    if (todayGratitude?.items && !gratitudeSaved) {
      const filled = [...todayGratitude.items, '', '', ''].slice(0, 3);
      setGratitudeInputs(filled);
    }
  }, [todayGratitude]);

  useEffect(() => {
    if (todayMood?.score != null && selectedMood === null) {
      setSelectedMood(todayMood.score);
    }
  }, [todayMood]);

  // ---- Mutations ----
  const saveIntentionMutation = useMutation({
    mutationFn: (text: string) =>
      apiRequest<{ id: string }>('/api/awareness/intention', {
        method: 'POST',
        body: JSON.stringify({ intention: text }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['awareness-intention'] }),
  });

  const saveMoodMutation = useMutation({
    mutationFn: (score: number) =>
      apiRequest<{ id: string }>('/api/awareness/mood', {
        method: 'POST',
        body: JSON.stringify({ score }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['awareness-mood'] }),
  });

  const saveGratitudeMutation = useMutation({
    mutationFn: (items: string[]) =>
      apiRequest<{ id: string }>('/api/awareness/gratitude', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awareness-gratitude'] });
      setGratitudeSaved(true);
    },
  });

  const saveBreathingMutation = useMutation({
    mutationFn: (body: { duration_seconds: number; exercise_type: string }) =>
      apiRequest<{ id: string }>('/api/awareness/breathing', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });

  function handleMoodSelect(score: number) {
    setSelectedMood(score);
    saveMoodMutation.mutate(score);
  }

  function handleGratitudeSave() {
    const items = gratitudeInputs.filter(s => s.trim() !== '');
    if (items.length === 0) return;
    saveGratitudeMutation.mutate(items);
  }

  // ---- Breathing timer ----
  function startBreathing() {
    setBreatheActive(true);
    setBreathePhaseIdx(0);
    setBreatheSecondsInPhase(0);
    setBreatheSessionSeconds(0);
    breatheStartRef.current = Date.now();

    breatheIntervalRef.current = setInterval(() => {
      setBreatheSessionSeconds(prev => prev + 1);
      setBreatheSecondsInPhase(prev => {
        const phase = BREATHING_PHASES[breathePhaseIdx];
        if (prev + 1 >= phase.duration) {
          setBreathePhaseIdx(idx => (idx + 1) % BREATHING_PHASES.length);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  }

  function stopBreathing() {
    if (breatheIntervalRef.current) {
      clearInterval(breatheIntervalRef.current);
      breatheIntervalRef.current = null;
    }
    const duration = Math.floor((Date.now() - breatheStartRef.current) / 1000);
    setBreatheActive(false);
    setBreatheSessionCount(c => c + 1);
    if (duration > 30) {
      saveBreathingMutation.mutate({ duration_seconds: duration, exercise_type: '4-7-8' });
    }
    setBreathePhaseIdx(0);
    setBreatheSecondsInPhase(0);
    setBreatheSessionSeconds(0);
  }

  useEffect(() => {
    return () => {
      if (breatheIntervalRef.current) clearInterval(breatheIntervalRef.current);
    };
  }, []);

  // Breathing phase info
  const currentPhase = BREATHING_PHASES[breathePhaseIdx];
  const phaseSecondsLeft = currentPhase.duration - breatheSecondsInPhase;
  const circleScale = breatheActive ? currentPhase.scale : 1.0;

  // Clipboard copy
  async function handleCopy() {
    if (!reflectionText.trim()) return;
    try {
      await navigator.clipboard.writeText(reflectionText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  const recentHistory = [...gratitudeHistory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 14);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Awareness & Mindfulness</h1>
          <p className="text-surface-muted text-sm mt-1">
            Daily intentions, mood check-ins, breathwork, and gratitude practice.
          </p>
        </div>
        {streak && streak.streak_days > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <span className="text-xl">🔥</span>
            <div>
              <div className="font-bold text-amber-700 text-sm">{streak.streak_days} day streak</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-sunk rounded-xl p-1">
        {(
          [
            { id: 'today', label: '🌅 Today' },
            { id: 'breathe', label: '🫁 Breathe' },
            { id: 'gratitude', label: '🙏 Gratitude' },
            { id: 'reflection', label: '💭 Reflection' },
          ] as const
        ).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-sm py-2 px-2 rounded-lg font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-brand-indigo shadow-sm'
                : 'text-surface-muted hover:text-surface-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* --- TODAY TAB --- */}
      {tab === 'today' && (
        <div className="space-y-5">
          {/* Streak card */}
          {streak && (
            <div className="card flex items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <div className="text-4xl">🔥</div>
              <div>
                <div className="font-bold text-surface-ink text-lg">{streak.streak_days} Day Mindfulness Streak</div>
                <div className="text-sm text-surface-muted">
                  {streak.streak_days === 0
                    ? 'Start your streak today by completing a practice.'
                    : 'Keep it up! Your consistency is building a healthier mind.'}
                </div>
              </div>
            </div>
          )}

          {/* Daily Intention */}
          <div className="card">
            <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">
              Today's Intention
            </div>
            {intentionLoading ? (
              <div className="h-10 bg-surface-sunk rounded-lg animate-pulse" />
            ) : (
              <>
                <textarea
                  className="input resize-none w-full"
                  rows={2}
                  placeholder="Set today's intention… e.g. I will be present and patient."
                  value={intentionText}
                  onChange={e => setIntentionText(e.target.value)}
                />
                <button
                  onClick={() => saveIntentionMutation.mutate(intentionText)}
                  disabled={!intentionText.trim() || saveIntentionMutation.isPending}
                  className="btn-primary text-sm mt-2"
                >
                  {saveIntentionMutation.isPending
                    ? 'Saving…'
                    : intention?.intention
                    ? 'Update Intention'
                    : 'Set Intention'}
                </button>
                {saveIntentionMutation.isSuccess && (
                  <span className="text-xs text-green-600 ml-2">Saved ✓</span>
                )}
              </>
            )}
          </div>

          {/* Mood check-in */}
          <div className="card">
            <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-3">
              Mood Check-In
            </div>
            <div className="flex gap-3 justify-around">
              {MOOD_EMOJIS.map((emoji, i) => {
                const score = i + 1;
                const isSelected = selectedMood === score;
                return (
                  <button
                    key={score}
                    onClick={() => handleMoodSelect(score)}
                    disabled={saveMoodMutation.isPending}
                    className={`text-3xl transition-all rounded-full p-1.5 ${
                      isSelected
                        ? 'ring-2 ring-brand-indigo ring-offset-2 scale-110'
                        : 'hover:scale-110 opacity-70 hover:opacity-100'
                    }`}
                    title={`Score ${score}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {selectedMood && (
              <div className="text-xs text-surface-muted text-center mt-2">
                Mood logged: {MOOD_EMOJIS[selectedMood - 1]}
              </div>
            )}
          </div>

          {/* Gratitude */}
          <div className="card">
            <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-3">
              Gratitude Practice
            </div>
            {gratitudeLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-surface-sunk rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {gratitudeInputs.map((val, i) => (
                  <input
                    key={i}
                    className="input"
                    placeholder={`I'm grateful for…`}
                    value={val}
                    onChange={e => {
                      const updated = [...gratitudeInputs];
                      updated[i] = e.target.value;
                      setGratitudeInputs(updated);
                      setGratitudeSaved(false);
                    }}
                  />
                ))}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={handleGratitudeSave}
                    disabled={
                      gratitudeInputs.every(s => !s.trim()) || saveGratitudeMutation.isPending
                    }
                    className="btn-primary text-sm"
                  >
                    {saveGratitudeMutation.isPending ? 'Saving…' : 'Save Gratitude'}
                  </button>
                  {gratitudeSaved && (
                    <span className="text-xs text-green-600">Saved ✓</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- BREATHE TAB --- */}
      {tab === 'breathe' && (
        <div className="space-y-6">
          <div className="card text-center">
            <h2 className="font-semibold text-surface-ink mb-1">4-7-8 Breathing</h2>
            <p className="text-sm text-surface-muted mb-6">
              Inhale for 4 seconds, hold for 7, exhale for 8. Repeat to calm your nervous system.
            </p>

            {/* Animated circle */}
            <div className="flex justify-center mb-6">
              <div
                className="rounded-full bg-gradient-to-br from-brand-indigo/40 to-brand-teal/40 border-4 border-brand-indigo/30 flex flex-col items-center justify-center"
                style={{
                  width: 160,
                  height: 160,
                  transform: `scale(${circleScale})`,
                  transition: breatheActive
                    ? `transform ${currentPhase.duration}s ease-in-out`
                    : 'transform 0.5s ease',
                }}
              >
                {breatheActive ? (
                  <>
                    <span className="text-brand-indigo font-semibold text-sm">{currentPhase.label}</span>
                    <span className="text-3xl font-bold text-brand-indigo mt-1">{phaseSecondsLeft}</span>
                    <span className="text-xs text-brand-indigo/70 mt-0.5">{currentPhase.duration}s</span>
                  </>
                ) : (
                  <span className="text-brand-indigo/60 text-sm font-medium">Ready</span>
                )}
              </div>
            </div>

            {/* Phase labels */}
            {breatheActive && (
              <div className="flex justify-center gap-4 mb-4">
                {BREATHING_PHASES.map((p, i) => (
                  <div
                    key={p.label}
                    className={`text-xs px-2 py-1 rounded-md ${
                      i === breathePhaseIdx
                        ? 'bg-brand-indigo text-white font-semibold'
                        : 'text-surface-muted'
                    }`}
                  >
                    {p.label} ({p.duration}s)
                  </div>
                ))}
              </div>
            )}

            {/* Session info */}
            {breatheActive && (
              <div className="text-sm text-surface-muted mb-4">
                Session time: {Math.floor(breatheSessionSeconds / 60)}:{String(breatheSessionSeconds % 60).padStart(2, '0')}
              </div>
            )}

            {breatheSessionCount > 0 && !breatheActive && (
              <div className="text-sm text-surface-muted mb-4">
                Last session complete. {breatheSessionCount} session{breatheSessionCount > 1 ? 's' : ''} today.
              </div>
            )}

            <button
              onClick={breatheActive ? stopBreathing : startBreathing}
              className={breatheActive ? 'btn-secondary' : 'btn-primary'}
            >
              {breatheActive ? '⏹ Stop Session' : '▶ Start Breathing'}
            </button>
          </div>

          <div className="rounded-lg bg-surface-sunk border border-surface-ink/[0.06] px-4 py-3 text-xs text-surface-muted">
            Sessions longer than 30 seconds are logged to your mindfulness history. The 4-7-8 technique activates the parasympathetic nervous system — try 3–4 cycles for best results.
          </div>
        </div>
      )}

      {/* --- GRATITUDE HISTORY TAB --- */}
      {tab === 'gratitude' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-surface-ink">Gratitude History</h2>
            <span className="text-xs text-surface-muted">Last 14 entries</span>
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="h-3 bg-surface-sunk rounded w-1/4 mb-3" />
                  <div className="h-3 bg-surface-sunk rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-sunk rounded w-2/3 mb-2" />
                  <div className="h-3 bg-surface-sunk rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">🙏</div>
              <p className="font-medium text-surface-ink">No gratitude entries yet</p>
              <p className="text-sm text-surface-muted mt-1">
                Start your gratitude practice in the Today tab.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentHistory.map((entry, i) => (
                <div key={i} className="card">
                  <div className="text-xs font-semibold text-brand-indigo mb-2">
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <ul className="space-y-1">
                    {entry.items.map((item, j) => (
                      <li key={j} className="text-sm text-surface-ink flex gap-2">
                        <span className="text-brand-indigo">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- REFLECTION TAB --- */}
      {tab === 'reflection' && (
        <div className="space-y-4">
          {/* Weekly prompt */}
          <div className="card bg-gradient-to-br from-brand-indigo/5 to-brand-teal/5 border-brand-indigo/20">
            <div className="text-xs font-semibold text-brand-indigo uppercase tracking-wide mb-2">
              Weekly Reflection Prompt
              {reflectionPrompt?.week_start && (
                <span className="ml-2 font-normal text-surface-muted normal-case">
                  Week of {new Date(reflectionPrompt.week_start).toLocaleDateString()}
                </span>
              )}
            </div>
            {reflectionPrompt ? (
              <p className="text-surface-ink font-medium leading-relaxed text-base">
                {reflectionPrompt.prompt}
              </p>
            ) : (
              <div className="h-12 bg-brand-indigo/10 rounded animate-pulse" />
            )}
          </div>

          {/* Reflection textarea */}
          <div className="card">
            <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">
              Your Reflection
            </div>
            <textarea
              className="input resize-none w-full"
              rows={8}
              placeholder="Write your thoughts here… This is just for you — nothing is saved to the server."
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-surface-muted">
                Not saved — for personal use during this session only.
              </span>
              <button
                onClick={handleCopy}
                disabled={!reflectionText.trim()}
                className="btn-secondary text-sm"
              >
                {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
