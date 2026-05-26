/**
 * AdminLaunchChecklist — Admin onboarding launch checklist
 * Numbered checklist with progress bar. Persists state via API.
 * Propel Stack AI, LLC
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChecklistTrack = 'education' | 'business';

interface AdminLaunchChecklistProps {
  workspaceId: string;
  track: ChecklistTrack;
}

interface ChecklistItem {
  id: string;
  label: string;
}

interface ChecklistState {
  completed: Record<string, boolean>;
}

// ─── Checklist definitions ────────────────────────────────────────────────────

const CHECKLIST_ITEMS: Record<ChecklistTrack, ChecklistItem[]> = {
  education: [
    { id: 'create_workspace', label: 'Create class or program workspace' },
    { id: 'import_roster', label: 'Import or invite your roster' },
    { id: 'configure_calendar', label: 'Configure calendar and academic dates' },
    { id: 'review_privacy', label: 'Review student privacy settings' },
    { id: 'send_invites', label: 'Send student invite links' },
    { id: 'first_assignment', label: 'Complete first assignment or planner setup' },
    { id: 'verify_joined', label: 'Verify all students have joined' },
  ],
  business: [
    { id: 'create_workspace', label: 'Create your workspace' },
    { id: 'setup_roles', label: 'Set up team roles and permissions' },
    { id: 'connect_calendar', label: 'Connect calendar and email' },
    { id: 'invite_team', label: 'Invite team members' },
    { id: 'first_workflow', label: 'Configure your first workflow template' },
    { id: 'first_task', label: 'Complete one team task together' },
    { id: 'review_automations', label: 'Review automation and reminder settings' },
  ],
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ChecklistProgress({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-surface-muted">
        <span>{done} of {total} complete</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-ink/10 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-indigo transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Checklist item row ───────────────────────────────────────────────────────

function ChecklistRow({
  item,
  index,
  checked,
  disabled,
  onToggle,
}: {
  item: ChecklistItem;
  index: number;
  checked: boolean;
  disabled: boolean;
  onToggle: (item: string, completed: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(item.id, !checked)}
      className={[
        'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-150 group',
        'hover:bg-surface-sunk',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* Step number / check */}
      <div
        className={[
          'w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 text-sm font-bold transition-all duration-200',
          checked
            ? 'border-brand-indigo bg-brand-indigo text-white'
            : 'border-surface-ink/20 text-surface-muted group-hover:border-brand-indigo/40',
        ].join(' ')}
      >
        {checked ? (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          index + 1
        )}
      </div>

      <span
        className={[
          'text-sm text-left leading-snug transition-colors',
          checked
            ? 'line-through text-surface-muted'
            : 'text-surface-ink dark:text-white',
        ].join(' ')}
      >
        {item.label}
      </span>
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AdminLaunchChecklist({ workspaceId, track }: AdminLaunchChecklistProps) {
  const queryClient = useQueryClient();
  const items = CHECKLIST_ITEMS[track];
  const queryKey = ['checklist', workspaceId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<ChecklistState>(`/api/workspaces/${workspaceId}/checklist`),
  });

  const mutation = useMutation({
    mutationFn: ({ item, completed }: { item: string; completed: boolean }) =>
      apiRequest(`/api/workspaces/${workspaceId}/checklist`, {
        method: 'POST',
        body: { item, completed },
      }),
    onMutate: async ({ item, completed }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ChecklistState>(queryKey);
      queryClient.setQueryData<ChecklistState>(queryKey, (old) => ({
        completed: { ...(old?.completed ?? {}), [item]: completed },
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const completed = data?.completed ?? {};
  const doneCount = items.filter((item) => completed[item.id]).length;

  const HEADING = {
    education: 'Education Admin Checklist',
    business: 'Team Launch Checklist',
  }[track];

  const SUBHEADING = {
    education: 'Follow these steps to get your class or program fully set up.',
    business: 'Complete these steps to get your team up and running.',
  }[track];

  return (
    <div className="rounded-2xl bg-surface-raised border border-surface-ink/10 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-surface-ink/10 space-y-1">
        <h3 className="font-display text-lg font-bold text-surface-ink dark:text-white">
          {HEADING}
        </h3>
        <p className="text-sm text-surface-muted">{SUBHEADING}</p>
      </div>

      {/* Progress */}
      <div className="px-6 py-4 border-b border-surface-ink/10">
        <ChecklistProgress done={doneCount} total={items.length} />
      </div>

      {/* Items */}
      <div className="px-2 py-2">
        {isLoading && (
          <div className="space-y-2 p-4">
            {items.map((item) => (
              <div key={item.id} className="h-10 rounded-xl bg-surface-sunk animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-500 px-4 py-3">
            Failed to load checklist. Please refresh.
          </p>
        )}

        {!isLoading && !isError && items.map((item, i) => (
          <ChecklistRow
            key={item.id}
            item={item}
            index={i}
            checked={Boolean(completed[item.id])}
            disabled={mutation.isPending}
            onToggle={(id, val) => mutation.mutate({ item: id, completed: val })}
          />
        ))}
      </div>

      {/* Completion banner */}
      {doneCount === items.length && items.length > 0 && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-brand-indigo/10 border border-brand-indigo/20 text-center">
          <p className="text-sm font-semibold text-brand-indigo">
            You're all set! Your workspace is ready to go.
          </p>
        </div>
      )}
    </div>
  );
}
