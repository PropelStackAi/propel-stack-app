/**
 * SegmentSelector — Onboarding Step 1
 * Full-page track picker: Consumer / Education / Business.
 * Propel Stack AI, LLC
 */

import { useState } from 'react';
import { User, GraduationCap, Briefcase, type LucideIcon } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Track = 'consumer' | 'education' | 'business';

interface SegmentDefinition {
  track: Track;
  label: string;
  heading: string;
  description: string;
  icon: LucideIcon;
  accent: string;  // Tailwind ring/border highlight class
  iconBg: string;
  iconColor: string;
}

interface SegmentSelectorProps {
  onSelect: (track: Track) => void;
}

// ─── Segment definitions ──────────────────────────────────────────────────────

const SEGMENTS: SegmentDefinition[] = [
  {
    track: 'consumer',
    label: 'Consumer',
    heading: 'My Life',
    description: 'Personal planning, health, finance, family, goals',
    icon: User,
    accent: 'ring-brand-indigo border-brand-indigo',
    iconBg: 'bg-brand-indigo/10 dark:bg-brand-indigo/20',
    iconColor: 'text-brand-indigo',
  },
  {
    track: 'education',
    label: 'Education',
    heading: 'Students & Schools',
    description: 'Academic planning for students, teachers, and institutions',
    icon: GraduationCap,
    accent: 'ring-brand-teal border-brand-teal',
    iconBg: 'bg-brand-teal/10 dark:bg-brand-teal/20',
    iconColor: 'text-brand-teal',
  },
  {
    track: 'business',
    label: 'Business',
    heading: 'Teams & Business',
    description: 'Operations, workflows, and team collaboration',
    icon: Briefcase,
    accent: 'ring-violet-500 border-violet-500',
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-500',
  },
];

// ─── SegmentCard ──────────────────────────────────────────────────────────────

function SegmentCard({
  segment,
  selected,
  disabled,
  onSelect,
}: {
  segment: SegmentDefinition;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = segment.icon;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={[
        'w-full text-left p-6 rounded-2xl border-2 transition-all duration-150',
        'flex flex-col gap-4 group',
        selected
          ? `${segment.accent} ring-2 bg-surface-sunk`
          : 'border-surface-ink/10 hover:border-surface-ink/30 hover:bg-surface-sunk',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <div className={`w-14 h-14 rounded-2xl ${segment.iconBg} flex items-center justify-center`}>
        <Icon size={28} className={segment.iconColor} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-surface-muted mb-1">
          {segment.label}
        </p>
        <h3 className="text-xl font-bold text-surface-ink dark:text-white leading-tight">
          {segment.heading}
        </h3>
        <p className="mt-2 text-sm text-surface-muted leading-relaxed">
          {segment.description}
        </p>
      </div>

      {selected && (
        <div className="mt-auto flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-brand-indigo flex items-center justify-center shrink-0">
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xs font-medium text-brand-indigo">Selected</span>
        </div>
      )}
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SegmentSelector({ onSelect }: SegmentSelectorProps) {
  const [selected, setSelected] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (track: Track) =>
      apiRequest('/api/onboarding/segment', { method: 'POST', body: { track } }),
    onSuccess: (_data, track) => {
      onSelect(track);
    },
  });

  function handleSelect(track: Track) {
    setSelected(track);
    setError(null);
  }

  function handleContinue() {
    if (!selected) {
      setError('Please choose a track to continue.');
      return;
    }
    mutation.mutate(selected, {
      onError: () => setError('Something went wrong. Please try again.'),
    });
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-surface-ink dark:text-white">
          How will you use Life OS?
        </h2>
        <p className="mt-3 text-surface-muted text-sm max-w-md mx-auto">
          Choose the track that best matches your primary use case. You can always
          add more workspaces later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SEGMENTS.map((seg) => (
          <SegmentCard
            key={seg.track}
            segment={seg}
            selected={selected === seg.track}
            disabled={mutation.isPending}
            onSelect={() => handleSelect(seg.track)}
          />
        ))}
      </div>

      {(error || mutation.isError) && (
        <p className="text-sm text-red-500 text-center">
          {error ?? 'Something went wrong. Please try again.'}
        </p>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          disabled={!selected || mutation.isPending}
          onClick={handleContinue}
          className="px-10 py-3 rounded-full bg-brand-indigo text-white font-semibold text-sm hover:brightness-110 disabled:opacity-40 transition-all"
        >
          {mutation.isPending ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
