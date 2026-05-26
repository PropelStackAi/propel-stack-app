/**
 * WorkspaceSetupWizard — Onboarding Step 3
 * Multi-step wizard for creating a workspace (family / class / team / institution).
 * Propel Stack AI, LLC
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { apiRequest } from '../../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceType = 'family' | 'class' | 'team' | 'institution';

interface WorkspaceSetupWizardProps {
  workspaceType: WorkspaceType;
  onComplete: (workspaceId: string) => void;
  onBack?: () => void;
}

interface WorkspacePayload {
  name: string;
  type: WorkspaceType;
  config: Record<string, unknown>;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={[
            'h-1.5 flex-1 rounded-full transition-all duration-300',
            i < step ? 'bg-brand-indigo' : 'bg-surface-ink/10 dark:bg-white/10',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ─── Configure panels ─────────────────────────────────────────────────────────

function FamilyConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">
          Household size
        </label>
        <input
          type="number"
          min={2}
          max={10}
          value={(config.household_size as number) ?? 2}
          onChange={(e) => onChange('household_size', Number(e.target.value))}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        />
      </div>
      {(
        [
          { key: 'has_children', label: "Kids Zone — children's accounts and content filtering" },
          { key: 'has_teens', label: 'Teen accounts — age-appropriate autonomy controls' },
          { key: 'shared_finances', label: 'Shared finances — household budgeting and spending' },
        ] as { key: string; label: string }[]
      ).map(({ key, label }) => (
        <label key={key} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(config[key])}
            onChange={(e) => onChange(key, e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-brand-indigo rounded"
          />
          <span className="text-sm text-surface-ink dark:text-white leading-snug">{label}</span>
        </label>
      ))}
    </div>
  );
}

function ClassConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Subject</label>
        <input
          type="text"
          placeholder="e.g. Algebra II, AP Biology"
          value={(config.subject as string) ?? ''}
          onChange={(e) => onChange('subject', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Grade level</label>
        <select
          value={(config.grade_level as string) ?? ''}
          onChange={(e) => onChange('grade_level', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        >
          <option value="">Select grade level</option>
          {['K-5', '6-8', '9-12', 'College', 'Graduate'].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Number of students</label>
        <input
          type="number"
          min={1}
          placeholder="e.g. 28"
          value={(config.student_count as number) ?? ''}
          onChange={(e) => onChange('student_count', Number(e.target.value))}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Semester end date</label>
        <input
          type="date"
          value={(config.semester_end as string) ?? ''}
          onChange={(e) => onChange('semester_end', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        />
      </div>
    </div>
  );
}

function TeamConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Company name</label>
        <input
          type="text"
          placeholder="e.g. Acme Corp"
          value={(config.company_name as string) ?? ''}
          onChange={(e) => onChange('company_name', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Industry</label>
        <select
          value={(config.industry as string) ?? ''}
          onChange={(e) => onChange('industry', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        >
          <option value="">Select industry</option>
          {['Technology', 'Healthcare', 'Education', 'Finance', 'Retail', 'Other'].map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Team size</label>
        <select
          value={(config.team_size as string) ?? ''}
          onChange={(e) => onChange('team_size', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        >
          <option value="">Select team size</option>
          {['3-10', '10-50', '50+'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function InstitutionConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Institution name</label>
        <input
          type="text"
          placeholder="e.g. Lincoln High School"
          value={(config.institution_name as string) ?? ''}
          onChange={(e) => onChange('institution_name', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Institution type</label>
        <select
          value={(config.type as string) ?? ''}
          onChange={(e) => onChange('type', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        >
          <option value="">Select type</option>
          {['K-12 School', 'College', 'University', 'Charter', 'District'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Student count</label>
        <input
          type="number"
          min={1}
          placeholder="e.g. 500"
          value={(config.student_count as number) ?? ''}
          onChange={(e) => onChange('student_count', Number(e.target.value))}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">Target go-live date</label>
        <input
          type="date"
          value={(config.go_live_date as string) ?? ''}
          onChange={(e) => onChange('go_live_date', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
        />
      </div>
    </div>
  );
}

// ─── Step headings ────────────────────────────────────────────────────────────

const CONFIGURE_HEADINGS: Record<WorkspaceType, string> = {
  family: "Who's in your household?",
  class: 'Tell us about your class',
  team: 'Tell us about your team',
  institution: 'Tell us about your institution',
};

// ─── Preview summary ──────────────────────────────────────────────────────────

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-surface-ink/10 last:border-0">
      <span className="text-sm text-surface-muted shrink-0">{label}</span>
      <span className="text-sm font-medium text-surface-ink dark:text-white text-right">{value || '—'}</span>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function WorkspaceSetupWizard({ workspaceType, onComplete, onBack }: WorkspaceSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  function updateConfig(key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: (payload: WorkspacePayload) =>
      apiRequest<{ id: string }>('/api/workspaces', { method: 'POST', body: payload }),
    onSuccess: (data) => {
      onComplete(data.id);
    },
    onError: () => setError('Failed to create workspace. Please try again.'),
  });

  function handleNext() {
    if (step === 1 && !name.trim()) {
      setError('Please enter a workspace name.');
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  }

  function handleSubmit() {
    mutation.mutate({ name: name.trim(), type: workspaceType, config });
  }

  return (
    <div className="space-y-2">
      <ProgressBar step={step} total={3} />

      {/* Step 1: Name */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-surface-ink dark:text-white">
              What should we call your workspace?
            </h2>
            <p className="mt-2 text-sm text-surface-muted">
              You can always rename it later.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-ink dark:text-white mb-1">
              Workspace name
            </label>
            <input
              type="text"
              autoFocus
              placeholder={
                workspaceType === 'family' ? 'e.g. The Johnson Family'
                  : workspaceType === 'class' ? 'e.g. Period 3 — AP Chem'
                  : workspaceType === 'team' ? 'e.g. Product Team'
                  : 'e.g. Lincoln Unified'
              }
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              className="w-full px-4 py-3 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
            />
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-surface-ink dark:text-white">
              {CONFIGURE_HEADINGS[workspaceType]}
            </h2>
            <p className="mt-2 text-sm text-surface-muted">
              These details help us build the right defaults for you.
            </p>
          </div>
          {workspaceType === 'family' && <FamilyConfig config={config} onChange={updateConfig} />}
          {workspaceType === 'class' && <ClassConfig config={config} onChange={updateConfig} />}
          {workspaceType === 'team' && <TeamConfig config={config} onChange={updateConfig} />}
          {workspaceType === 'institution' && <InstitutionConfig config={config} onChange={updateConfig} />}
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-surface-ink dark:text-white">
              Review your workspace
            </h2>
            <p className="mt-2 text-sm text-surface-muted">
              Everything looks right? Hit create to launch.
            </p>
          </div>
          <div className="rounded-2xl bg-surface-sunk border border-surface-ink/10 px-5 py-2">
            <PreviewRow label="Workspace name" value={name} />
            <PreviewRow label="Type" value={workspaceType} />
            {Object.entries(config).map(([k, v]) => (
              <PreviewRow
                key={k}
                label={k.replace(/_/g, ' ')}
                value={typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? '')}
              />
            ))}
          </div>
        </div>
      )}

      {(error || mutation.isError) && (
        <p className="text-sm text-red-500">{error ?? 'Something went wrong.'}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-4">
        {(step > 1 || onBack) && (
          <button
            type="button"
            onClick={step > 1 ? () => setStep((s) => s - 1) : onBack}
            className="flex items-center gap-1 text-sm text-surface-muted hover:text-surface-ink dark:hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        )}

        <div className="ml-auto">
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-8 py-3 rounded-full bg-brand-indigo text-white font-semibold text-sm hover:brightness-110 transition-all"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={handleSubmit}
              className="px-8 py-3 rounded-full bg-brand-indigo text-white font-semibold text-sm hover:brightness-110 disabled:opacity-40 transition-all"
            >
              {mutation.isPending ? 'Creating…' : 'Create Workspace'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
