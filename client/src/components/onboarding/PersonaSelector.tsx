/**
 * PersonaSelector — Phase 3 Step 6
 * Propel Stack AI, LLC
 *
 * 6-persona card grid for onboarding persona selection.
 * Selecting a persona loads correct module presets, creates default goals,
 * and fires the persona_selected event for analytics.
 */

import { useState } from 'react';
import {
  Heart, DollarSign, Briefcase, Users, BookOpen, Brain,
  type LucideIcon,
} from 'lucide-react';
import { apiRequest } from '../../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Persona {
  id: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  color: string;        // Tailwind bg color class for icon bg
  iconColor: string;    // Tailwind text color class
  examples: string[];   // Pre-filled example prompts shown after selection
  defaultGoals: string[];
}

// ─── Persona definitions ──────────────────────────────────────────────────────

export const PERSONAS: Persona[] = [
  {
    id: 'health-fitness',
    label: 'Health & Fitness',
    tagline: 'Build the body and energy that power everything else',
    icon: Heart,
    color: 'bg-rose-100 dark:bg-rose-900/30',
    iconColor: 'text-rose-500',
    examples: [
      'Help me build a morning workout habit',
      'Track my nutrition and sleep',
      'Create a 12-week fitness plan',
    ],
    defaultGoals: ['Move 30 minutes every day', 'Sleep 7+ hours', 'Drink 8 glasses of water daily'],
  },
  {
    id: 'financial-freedom',
    label: 'Financial Freedom',
    tagline: 'Build wealth and take control of your money story',
    icon: DollarSign,
    color: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-500',
    examples: [
      'Build an emergency fund in 6 months',
      'Optimize my budget and cut waste',
      'Start investing for retirement',
    ],
    defaultGoals: ['Save $500/month', 'Pay off one debt account', 'Track all spending weekly'],
  },
  {
    id: 'career-business',
    label: 'Career & Business',
    tagline: 'Accelerate your career or grow your company faster',
    icon: Briefcase,
    color: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-500',
    examples: [
      'Land a promotion in 90 days',
      'Build my freelance client pipeline',
      'Launch my side business',
    ],
    defaultGoals: ['Complete one high-impact project', 'Network with 3 new people/month', 'Learn one new skill this quarter'],
  },
  {
    id: 'family-relationships',
    label: 'Family & Relationships',
    tagline: 'Strengthen the people and connections that matter most',
    icon: Users,
    color: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-500',
    examples: [
      'Create more quality time with my kids',
      'Improve communication with my partner',
      'Reconnect with old friends',
    ],
    defaultGoals: ['One family dinner per week', 'Weekly check-in with a close friend', 'Plan one family experience/month'],
  },
  {
    id: 'learning-growth',
    label: 'Learning & Growth',
    tagline: 'Expand your mind and build skills that compound',
    icon: BookOpen,
    color: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-500',
    examples: [
      'Read 12 books this year',
      'Learn a new language in 6 months',
      'Master a technical skill',
    ],
    defaultGoals: ['Read 20 minutes daily', 'Complete one online course/quarter', 'Practice new skill 30 min/day'],
  },
  {
    id: 'mental-wellness',
    label: 'Mental Wellness',
    tagline: 'Build resilience, clarity, and inner peace as a daily practice',
    icon: Brain,
    color: 'bg-teal-100 dark:bg-teal-900/30',
    iconColor: 'text-teal-500',
    examples: [
      'Build a daily meditation habit',
      'Manage stress and anxiety better',
      'Process emotions through journaling',
    ],
    defaultGoals: ['Meditate 10 minutes daily', 'Journal 3x per week', 'Weekly mental health check-in'],
  },
];

// ─── PersonaCard ──────────────────────────────────────────────────────────────

function PersonaCard({
  persona,
  selected,
  onSelect,
}: {
  persona: Persona;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = persona.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full text-left p-4 rounded-2xl border-2 transition-all duration-150',
        selected
          ? 'border-brand-indigo bg-brand-indigo/5 dark:bg-brand-indigo/10 ring-2 ring-brand-indigo/20'
          : 'border-surface-ink/[0.08] dark:border-white/[0.08] hover:border-brand-indigo/40 hover:bg-surface-sunk',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${persona.color} shrink-0`}>
          <Icon size={20} className={persona.iconColor} />
        </div>
        <div>
          <p className="font-semibold text-sm text-surface-ink dark:text-white leading-tight">
            {persona.label}
          </p>
          <p className="text-xs text-surface-muted mt-0.5 leading-snug">
            {persona.tagline}
          </p>
        </div>
        {selected && (
          <div className="ml-auto shrink-0 w-4 h-4 rounded-full bg-brand-indigo flex items-center justify-center">
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      {selected && persona.examples.length > 0 && (
        <div className="mt-3 space-y-1">
          {persona.examples.map((ex) => (
            <p key={ex} className="text-xs text-brand-indigo/70 dark:text-brand-indigo/60 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-brand-indigo/40 shrink-0" />
              {ex}
            </p>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface PersonaSelectorProps {
  /** Called after the server confirms persona selection. */
  onComplete: (personaId: string) => void;
  /** If true, renders as a compact re-selection UI (settings page). */
  compact?: boolean;
}

export function PersonaSelector({ onComplete, compact = false }: PersonaSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest('/api/onboarding/persona', {
        method: 'POST',
        body: { persona: selected },
      });
      onComplete(selected);
    } catch {
      setError('Failed to save persona. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {!compact && (
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-surface-ink dark:text-white">
            What brings you to Life OS?
          </h2>
          <p className="text-surface-muted mt-2 text-sm">
            Choose your primary focus. You can always change this later.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PERSONAS.map((p) => (
          <PersonaCard
            key={p.id}
            persona={p}
            selected={selected === p.id}
            onSelect={() => setSelected(p.id)}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!selected || saving}
          onClick={handleConfirm}
          className="w-full py-3 rounded-full bg-brand-indigo text-white font-semibold text-sm hover:brightness-110 disabled:opacity-40 transition-all"
        >
          {saving ? 'Saving…' : selected ? `Start with ${PERSONAS.find(p => p.id === selected)?.label}` : 'Select a focus to continue'}
        </button>
        {!compact && (
          <button
            type="button"
            onClick={() => onComplete('general')}
            className="text-xs text-surface-muted hover:text-surface-ink dark:hover:text-white transition-colors"
          >
            Skip — I'll set this later
          </button>
        )}
      </div>
    </div>
  );
}
