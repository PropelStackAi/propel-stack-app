/**
 * RoleSelector — Onboarding Step 2
 * Role picker shown after track selection. Role cards vary by track.
 * Propel Stack AI, LLC
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Track = 'consumer' | 'education' | 'business';

interface RoleDefinition {
  id: string;
  label: string;
  description: string;
}

interface RoleSelectorProps {
  track: Track;
  onSelect: (role: string) => void;
}

// ─── Role definitions by track ────────────────────────────────────────────────

const ROLES: Record<Track, RoleDefinition[]> = {
  consumer: [
    {
      id: 'individual',
      label: 'Just Me',
      description: 'Solo user — personal planning and life management',
    },
    {
      id: 'family_admin',
      label: 'Family Manager',
      description: 'Running the household — shared tasks, schedules, and finances',
    },
    {
      id: 'network_admin',
      label: 'Network Lead',
      description: 'Managing an extended family or small informal team',
    },
  ],
  education: [
    {
      id: 'student',
      label: 'Student',
      description: 'Learning and academic goals — assignments, deadlines, study plans',
    },
    {
      id: 'teacher',
      label: 'Teacher / Faculty',
      description: 'Class management — lesson plans, rosters, and assignments',
    },
    {
      id: 'campus_admin',
      label: 'Campus Admin',
      description: 'School or program administration across multiple classes',
    },
    {
      id: 'district_admin',
      label: 'District / University Admin',
      description: 'Systemwide deployment and reporting at scale',
    },
    {
      id: 'it_admin',
      label: 'IT / Security Admin',
      description: 'Technical and security management for your institution',
    },
  ],
  business: [
    {
      id: 'founder',
      label: 'Owner / Founder',
      description: 'Running the business — strategy, ops, and big-picture decisions',
    },
    {
      id: 'operations_admin',
      label: 'Operations Admin',
      description: 'Configuring processes, workflows, and team systems',
    },
    {
      id: 'team_lead',
      label: 'Team Lead',
      description: 'Managing a team — standups, tasks, and accountability',
    },
    {
      id: 'contributor',
      label: 'Team Member',
      description: 'Day-to-day work — tasks, projects, and collaboration',
    },
    {
      id: 'it_admin',
      label: 'IT / Security Admin',
      description: 'Enterprise IT, SSO, and security configuration',
    },
  ],
};

const TRACK_HEADINGS: Record<Track, string> = {
  consumer: 'What best describes you?',
  education: 'What is your role in education?',
  business: 'What is your role on the team?',
};

// ─── RoleCard ─────────────────────────────────────────────────────────────────

function RoleCard({
  role,
  selected,
  disabled,
  onSelect,
}: {
  role: RoleDefinition;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={[
        'w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150',
        'flex items-center gap-4',
        selected
          ? 'border-brand-indigo ring-2 ring-brand-indigo/20 bg-brand-indigo/5 dark:bg-brand-indigo/10'
          : 'border-surface-ink/10 hover:border-surface-ink/30 hover:bg-surface-sunk',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <div
        className={[
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
          selected ? 'border-brand-indigo bg-brand-indigo' : 'border-surface-ink/30',
        ].join(' ')}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-surface-ink dark:text-white leading-tight">
          {role.label}
        </p>
        <p className="text-xs text-surface-muted mt-0.5 leading-snug">
          {role.description}
        </p>
      </div>
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function RoleSelector({ track, onSelect }: RoleSelectorProps) {
  const roles = ROLES[track];
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (role: string) =>
      apiRequest('/api/onboarding/segment', {
        method: 'POST',
        body: { track, role },
      }),
    onSuccess: (_data, role) => {
      onSelect(role);
    },
  });

  function handleContinue() {
    if (!selected) {
      setError('Please select a role to continue.');
      return;
    }
    mutation.mutate(selected, {
      onError: () => setError('Something went wrong. Please try again.'),
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-surface-ink dark:text-white">
          {TRACK_HEADINGS[track]}
        </h2>
        <p className="mt-2 text-sm text-surface-muted">
          This helps us tailor your experience and set the right defaults.
        </p>
      </div>

      <div className="space-y-3">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            selected={selected === role.id}
            disabled={mutation.isPending}
            onSelect={() => {
              setSelected(role.id);
              setError(null);
            }}
          />
        ))}
      </div>

      {(error || mutation.isError) && (
        <p className="text-sm text-red-500 text-center">
          {error ?? 'Something went wrong. Please try again.'}
        </p>
      )}

      <button
        type="button"
        disabled={!selected || mutation.isPending}
        onClick={handleContinue}
        className="w-full py-3 rounded-full bg-brand-indigo text-white font-semibold text-sm hover:brightness-110 disabled:opacity-40 transition-all"
      >
        {mutation.isPending ? 'Saving…' : 'Continue'}
      </button>
    </div>
  );
}
