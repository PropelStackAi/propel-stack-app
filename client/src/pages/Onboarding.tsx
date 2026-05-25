/**
 * Onboarding Wizard — Propel Stack AI, LLC
 *
 * Enhancement 4: Designed Aha Moment (90-Second Activation)
 * Enhancement 5: Persona-Based Onboarding Tracks
 * Enhancement 6: Import Connectors at Signup
 *
 * 4-step full-screen experience, outside the AppLayout chrome.
 * Step 1: Choose your persona (6 tracks)
 * Step 2: Set your primary goal (12 categories + free-text)
 * Step 3: Aha Moment — AI reflects reframe + habit + first task
 * Step 4: Connect your data sources (Google Calendar, Apple Health, Todoist)
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import {
  Heart, DollarSign, Briefcase, Users, GraduationCap, Smile,
  Home, Plane, Palette, Star, Share2, Scale,
  Calendar, Smartphone, CheckSquare, ArrowRight, ChevronRight,
  Sparkles, Check, Zap, type LucideIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Persona {
  id: string;
  label: string;
  tagline: string;
  emoji: string;
  color: string;
  modules: string[];
}

interface GoalCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

interface AhaMoment {
  reframe: string;
  habit: string;
  firstTask: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PERSONAS: Persona[] = [
  { id: 'busy-parent',       label: 'Busy Parent',         tagline: 'Family first, but me too',           emoji: '👨‍👧', color: '#F05A28', modules: ['family','health','financial-score'] },
  { id: 'building-business', label: 'Building a Business', tagline: 'Growing something that matters',      emoji: '🚀', color: '#4F35C2', modules: ['business','career','financial'] },
  { id: 'want-healthy',      label: 'Getting Healthy',     tagline: 'Mind, body, energy — all of it',     emoji: '💪', color: '#01696F', modules: ['health','sleep','athlete'] },
  { id: 'career-climber',    label: 'Career Focused',      tagline: 'Moving up, on my terms',             emoji: '🏆', color: '#6B21A8', modules: ['career','learning','network'] },
  { id: 'student-learner',   label: 'Student & Learner',   tagline: 'Always growing, always curious',     emoji: '📚', color: '#0EA5E9', modules: ['student','learning','streaks'] },
  { id: 'life-transition',   label: 'Life in Transition',  tagline: 'Navigating change with intention',   emoji: '🌱', color: '#84CC16', modules: ['awareness','health','life-events'] },
];

const GOAL_CATEGORIES: GoalCategory[] = [
  { id: 'health-fitness',       label: 'Health & Fitness',        icon: Heart,          color: '#F05A28' },
  { id: 'financial-freedom',    label: 'Financial Freedom',       icon: DollarSign,     color: '#01696F' },
  { id: 'career-business',      label: 'Career & Business',       icon: Briefcase,      color: '#4F35C2' },
  { id: 'family-relationships', label: 'Family & Relationships',  icon: Users,          color: '#6B21A8' },
  { id: 'learning-growth',      label: 'Learning & Growth',       icon: GraduationCap,  color: '#0EA5E9' },
  { id: 'mental-wellness',      label: 'Mental Wellness',         icon: Smile,          color: '#84CC16' },
  { id: 'home-environment',     label: 'Home & Environment',      icon: Home,           color: '#F59E0B' },
  { id: 'travel-adventure',     label: 'Travel & Adventure',      icon: Plane,          color: '#EC4899' },
  { id: 'creative-projects',    label: 'Creative Projects',       icon: Palette,        color: '#8B5CF6' },
  { id: 'spirituality-purpose', label: 'Purpose & Meaning',       icon: Star,           color: '#F05A28' },
  { id: 'social-community',     label: 'Social & Community',      icon: Share2,         color: '#01696F' },
  { id: 'work-life-balance',    label: 'Work-Life Balance',       icon: Scale,          color: '#4F35C2' },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2"  y="2"  width="13" height="13" rx="3.5" fill="#4F35C2" />
      <rect x="17" y="2"  width="13" height="13" rx="3.5" fill="#F05A28" />
      <rect x="2"  y="17" width="13" height="13" rx="3.5" fill="#01696F" />
      <rect x="17" y="17" width="13" height="13" rx="3.5" fill="#6B21A8" />
    </svg>
  );
}

// ─── Step 1 — Persona ─────────────────────────────────────────────────────────

function StepPersona({ onSelect }: { onSelect: (p: Persona) => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-fade-in">
      <p className="text-center text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#4F35C2' }}>
        Step 1 of 4
      </p>
      <h1 className="text-center font-display font-extrabold text-3xl sm:text-4xl text-white mb-2">
        Who are you right now?
      </h1>
      <p className="text-center text-base mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Your Life OS will adapt to fit your world.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl border transition-all active:scale-95 hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderColor: 'rgba(255,255,255,0.10)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = p.color + '22';
              (e.currentTarget as HTMLElement).style.borderColor = p.color + '60';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.10)';
            }}
          >
            <span className="text-3xl">{p.emoji}</span>
            <div>
              <p className="font-bold text-white text-sm leading-tight">{p.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{p.tagline}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 — Goal ────────────────────────────────────────────────────────────

function StepGoal({
  onNext,
}: {
  persona?: Persona;
  onNext: (category: string, goal: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const [goalText, setGoalText] = useState('');

  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-fade-in">
      <p className="text-center text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#4F35C2' }}>
        Step 2 of 4
      </p>
      <h1 className="text-center font-display font-extrabold text-3xl sm:text-4xl text-white mb-2">
        What do you most want to change?
      </h1>
      <p className="text-center text-base mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Pick one area. You can always add more later.
      </p>

      {/* Category grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
        {GOAL_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl transition-all active:scale-95"
              style={{
                background: isSelected ? cat.color + '25' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${isSelected ? cat.color : 'transparent'}`,
              }}
            >
              <Icon size={22} color={isSelected ? cat.color : 'rgba(255,255,255,0.45)'} />
              <span
                className="text-[11px] font-medium text-center leading-tight"
                style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.55)' }}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Free text input */}
      {selected && (
        <div className="mb-6 animate-fade-in">
          <label className="block text-sm font-semibold text-white mb-2">
            Describe your goal in your own words <span style={{ color: 'rgba(255,255,255,0.4)' }}>(optional)</span>
          </label>
          <textarea
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              minHeight: 80,
            }}
            placeholder={`e.g. "I want to run a 5K by October and have more energy every day"`}
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            maxLength={200}
          />
        </div>
      )}

      <button
        onClick={() => selected && onNext(selected, goalText)}
        disabled={!selected}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all"
        style={{
          background: selected ? '#4F35C2' : 'rgba(255,255,255,0.10)',
          opacity: selected ? 1 : 0.5,
          cursor: selected ? 'pointer' : 'not-allowed',
        }}
      >
        Show me my game plan
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

// ─── Step 3 — Aha Moment ─────────────────────────────────────────────────────

function StepAha({
  persona, category, goal, onNext,
}: {
  persona: Persona;
  category: string;
  goal: string;
  onNext: () => void;
}) {
  const [aha, setAha] = useState<AhaMoment | null>(null);
  const [revealed, setRevealed] = useState(0); // 0=loading, 1=reframe, 2=habit, 3=task

  useEffect(() => {
    apiRequest<AhaMoment>('/api/onboarding/aha-moment', {
      method: 'POST',
      body: JSON.stringify({ category, goal, persona: persona.id }),
    })
      .then((data) => {
        setAha(data);
        // Staggered reveal for drama
        setTimeout(() => setRevealed(1), 200);
        setTimeout(() => setRevealed(2), 900);
        setTimeout(() => setRevealed(3), 1600);
      })
      .catch(() => setRevealed(-1));
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto px-4 animate-fade-in">
      <p className="text-center text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#4F35C2' }}>
        Step 3 of 4
      </p>
      <h1 className="text-center font-display font-extrabold text-3xl sm:text-4xl text-white mb-2">
        Here's your game plan.
      </h1>
      <p className="text-center text-base mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Your AI built this in under 90 seconds.
      </p>

      <div className="space-y-4">
        {/* Reframe */}
        <div
          className="rounded-2xl p-5 transition-all duration-500"
          style={{
            background: 'rgba(79,53,194,0.25)',
            border: '1px solid rgba(79,53,194,0.40)',
            opacity: revealed >= 1 ? 1 : 0,
            transform: revealed >= 1 ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} color="#4F35C2" />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4F35C2' }}>Your Reframe</span>
          </div>
          <p className="text-white text-base leading-relaxed font-medium">
            {aha?.reframe ?? '…'}
          </p>
        </div>

        {/* Daily Habit */}
        <div
          className="rounded-2xl p-5 transition-all duration-500"
          style={{
            background: 'rgba(1,105,111,0.25)',
            border: '1px solid rgba(1,105,111,0.40)',
            opacity: revealed >= 2 ? 1 : 0,
            transform: revealed >= 2 ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} color="#01696F" />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#01696F' }}>Your Daily Habit</span>
          </div>
          <p className="text-white text-base leading-relaxed font-medium">
            {aha?.habit ?? '…'}
          </p>
        </div>

        {/* First Task */}
        <div
          className="rounded-2xl p-5 transition-all duration-500"
          style={{
            background: 'rgba(240,90,40,0.20)',
            border: '1px solid rgba(240,90,40,0.35)',
            opacity: revealed >= 3 ? 1 : 0,
            transform: revealed >= 3 ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={16} color="#F05A28" />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F05A28' }}>Do This Today</span>
          </div>
          <p className="text-white text-base leading-relaxed font-medium">
            {aha?.firstTask ?? '…'}
          </p>
        </div>
      </div>

      {revealed >= 3 && (
        <button
          onClick={onNext}
          className="mt-8 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all animate-fade-in"
          style={{ background: '#4F35C2' }}
        >
          Continue setup
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

// ─── Step 4 — Import Connectors ───────────────────────────────────────────────

interface ConnectorState { status: 'idle' | 'loading' | 'connected' | 'error'; message?: string }

function StepConnect({ onFinish }: { onFinish: () => void }) {
  const [google, setGoogle] = useState<ConnectorState>({ status: 'idle' });
  const [apple, setApple] = useState<ConnectorState>({ status: 'idle' });
  const [todoistKey, setTodoistKey] = useState('');
  const [todoist, setTodoist] = useState<ConnectorState>({ status: 'idle' });

  async function connectGoogle() {
    setGoogle({ status: 'loading' });
    try {
      const res = await apiRequest<{ connected: boolean; stub: boolean; authUrl?: string; message?: string }>(
        '/api/onboarding/connect/google-calendar', { method: 'POST' },
      );
      if (res.authUrl) {
        window.open(res.authUrl, '_blank');
        setGoogle({ status: 'connected', message: 'Opened Google auth in a new tab.' });
      } else {
        setGoogle({ status: 'connected', message: res.message ?? 'Connected!' });
      }
    } catch {
      setGoogle({ status: 'error', message: 'Could not connect. Try again later.' });
    }
  }

  async function connectApple() {
    setApple({ status: 'loading' });
    try {
      const res = await apiRequest<{ status: string; message: string }>(
        '/api/onboarding/connect/apple-health', { method: 'POST' },
      );
      setApple({ status: 'connected', message: res.message });
    } catch {
      setApple({ status: 'error' });
    }
  }

  async function connectTodoist() {
    if (!todoistKey.trim()) return;
    setTodoist({ status: 'loading' });
    try {
      const res = await apiRequest<{ connected: boolean; message: string }>(
        '/api/onboarding/connect/todoist', { method: 'POST', body: JSON.stringify({ apiToken: todoistKey }) },
      );
      setTodoist({ status: 'connected', message: res.message });
    } catch {
      setTodoist({ status: 'error', message: 'Invalid token. Check your Todoist settings.' });
    }
  }

  const connectors = [
    {
      id: 'google',
      label: 'Google Calendar',
      icon: Calendar,
      color: '#4285F4',
      tagline: 'Sync your schedule so AI knows your time',
      state: google,
      action: connectGoogle,
      extra: null,
    },
    {
      id: 'apple',
      label: 'Apple Health',
      icon: Smartphone,
      color: '#000000',
      tagline: 'Steps, sleep & health data (iOS app required)',
      state: apple,
      action: connectApple,
      extra: null,
    },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 animate-fade-in">
      <p className="text-center text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#4F35C2' }}>
        Step 4 of 4
      </p>
      <h1 className="text-center font-display font-extrabold text-3xl sm:text-4xl text-white mb-2">
        Connect your world.
      </h1>
      <p className="text-center text-base mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Your AI arrives with context instead of starting cold. Skip any time.
      </p>

      <div className="space-y-3 mb-4">
        {connectors.map(({ id, label, icon: Icon, color, tagline, state, action }) => (
          <div
            key={id}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '22' }}>
              <Icon size={20} color={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{tagline}</p>
              {state.message && (
                <p className="text-xs mt-1" style={{ color: state.status === 'error' ? '#F05A28' : '#01696F' }}>
                  {state.message}
                </p>
              )}
            </div>
            <button
              onClick={action}
              disabled={state.status === 'loading' || state.status === 'connected'}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: state.status === 'connected' ? '#01696F22' : '#4F35C2',
                color: state.status === 'connected' ? '#01696F' : '#fff',
                opacity: state.status === 'loading' ? 0.6 : 1,
              }}
            >
              {state.status === 'loading' ? '…' : state.status === 'connected' ? <Check size={16} /> : 'Connect'}
            </button>
          </div>
        ))}

        {/* Todoist with API key input */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#DB4035' + '22' }}>
              <CheckSquare size={20} color="#DB4035" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Todoist</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Import existing tasks on day one</p>
            </div>
            {todoist.status === 'connected' && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#01696F22', color: '#01696F' }}>
                Connected
              </span>
            )}
          </div>
          {todoist.status !== 'connected' && (
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                placeholder="Your Todoist API token"
                value={todoistKey}
                onChange={(e) => setTodoistKey(e.target.value)}
                type="password"
              />
              <button
                onClick={connectTodoist}
                disabled={!todoistKey.trim() || todoist.status === 'loading'}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shrink-0"
                style={{ background: '#DB4035', opacity: !todoistKey.trim() ? 0.5 : 1 }}
              >
                {todoist.status === 'loading' ? '…' : 'Connect'}
              </button>
            </div>
          )}
          {todoist.message && (
            <p className="text-xs mt-2" style={{ color: todoist.status === 'error' ? '#F05A28' : '#01696F' }}>
              {todoist.message}
            </p>
          )}
        </div>
      </div>

      {/* Go to Dashboard */}
      <button
        onClick={onFinish}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all"
        style={{ background: '#4F35C2' }}
      >
        Enter my Life OS
        <ArrowRight size={18} />
      </button>
      <button
        onClick={onFinish}
        className="mt-3 w-full text-sm py-2 transition-colors"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        Skip for now
      </button>
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-10">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className="rounded-full transition-all duration-300"
          style={{
            width: s === step ? 24 : 8,
            height: 8,
            background: s === step ? '#4F35C2' : s < step ? 'rgba(79,53,194,0.45)' : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Onboarding component ────────────────────────────────────────────────

export function Onboarding() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [goalCategory, setGoalCategory] = useState('');
  const [goalText, setGoalText] = useState('');

  const completeOnboarding = useMutation({
    mutationFn: () =>
      apiRequest('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({
          persona: persona?.id,
          goalCategory,
          goal: goalText,
        }),
      }),
    onSuccess: () => {
      // Invalidate user cache so AppLayout re-reads onboarding_completed_at
      qc.invalidateQueries({ queryKey: ['me'] });
      navigate('/');
    },
  });

  function handlePersonaSelect(p: Persona) {
    setPersona(p);
    setStep(2);
  }

  function handleGoalNext(cat: string, text: string) {
    setGoalCategory(cat);
    setGoalText(text);
    setStep(3);
  }

  function handleAhaNext() {
    setStep(4);
  }

  function handleFinish() {
    completeOnboarding.mutate();
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-10 pb-16"
      style={{ background: '#0F0D1A' }}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <Logo />
        <div className="text-center">
          <p className="font-display font-extrabold text-white text-lg leading-none">Propel Stack AI</p>
          <p className="text-[11px] tracking-widest uppercase font-semibold" style={{ color: '#5B5651' }}>
            Life OS
          </p>
        </div>
      </div>

      {/* Progress */}
      <ProgressDots step={step} />

      {/* Step content */}
      {step === 1 && <StepPersona onSelect={handlePersonaSelect} />}
      {step === 2 && persona && <StepGoal persona={persona} onNext={handleGoalNext} />}
      {step === 3 && persona && (
        <StepAha persona={persona} category={goalCategory} goal={goalText} onNext={handleAhaNext} />
      )}
      {step === 4 && <StepConnect onFinish={handleFinish} />}

      {/* Skip entire onboarding (Step 1 only) */}
      {step === 1 && (
        <button
          onClick={() => completeOnboarding.mutate()}
          className="mt-8 text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Skip setup — go straight to dashboard
        </button>
      )}
    </div>
  );
}
