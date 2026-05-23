import { useActivePlan, useGeneratePlan } from '../api';
import type { AthleteProfile } from '../types';

interface Props { profile: AthleteProfile; }

interface PlanDay {
  day: string;
  focus: string;
  type: string;
  exercises: PlanExercise[];
  notes?: string;
}

interface PlanExercise {
  name: string;
  sets?: number;
  reps?: string;
  rest?: string;
  notes?: string;
  duration?: string;
  intensity?: string;
}

interface ParsedPlan {
  title?: string;
  phase?: string;
  weeklyStructure?: PlanDay[];
  generalGuidelines?: string[];
  weeklyVolume?: string;
  progressionNotes?: string;
}

function parsePlanData(raw: string): ParsedPlan {
  try { return JSON.parse(raw) as ParsedPlan; } catch { return {}; }
}

const TYPE_COLORS: Record<string, string> = {
  Strength: 'bg-indigo-100 text-indigo-700',
  Cardio: 'bg-green-100 text-green-700',
  Recovery: 'bg-teal-100 text-teal-700',
  HIIT: 'bg-orange-100 text-orange-700',
  Rest: 'bg-surface-sunk text-surface-muted',
  Sport: 'bg-blue-100 text-blue-700',
  default: 'bg-surface-raised text-surface-ink',
};

function typeColor(type: string): string {
  for (const [k, v] of Object.entries(TYPE_COLORS)) {
    if (type.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return TYPE_COLORS.default;
}

export function MyPlan({ profile }: Props): JSX.Element {
  const { data: plan, isLoading } = useActivePlan();
  const generate = useGeneratePlan();

  if (isLoading) return <div className="text-sm text-surface-muted py-6">Loading plan…</div>;

  if (!plan) {
    return (
      <div className="space-y-4">
        <div className="text-center py-10">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="font-bold text-surface-ink mb-1">No training plan yet</h3>
          <p className="text-sm text-surface-muted mb-5">Generate an AI-powered plan based on your profile.</p>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="btn bg-brand-teal text-white disabled:opacity-50"
          >
            {generate.isPending ? 'Generating plan…' : '✨ Generate My Plan'}
          </button>
        </div>
      </div>
    );
  }

  const parsed = parsePlanData(plan.plan_data);
  const isYouthUnder14 = profile.is_youth_under_14;

  return (
    <div className="space-y-5">
      {isYouthUnder14 && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-xs text-amber-800">
          <strong>⚠️ Coach Review Required</strong> — This athlete is under 14. All plans must be reviewed and approved by a qualified coach or parent/guardian before use.
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-surface-ink">{plan.name}</h3>
          <p className="text-xs text-surface-muted">{plan.sport} · Phase: {plan.phase || 'Base'}</p>
          {plan.target_date && (
            <p className="text-xs text-brand-teal font-semibold mt-0.5">
              🎯 Target: {new Date(plan.target_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="btn-outline text-xs flex-shrink-0"
        >
          {generate.isPending ? 'Regenerating…' : '🔄 Regenerate'}
        </button>
      </div>

      {/* Weekly structure */}
      {parsed.weeklyStructure && parsed.weeklyStructure.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-surface-muted uppercase tracking-wider">Weekly Structure</h4>
          {parsed.weeklyStructure.map((dayPlan, i) => (
            <DayCard key={i} dayPlan={dayPlan} isYouthUnder14={isYouthUnder14} />
          ))}
        </div>
      )}

      {/* General guidelines */}
      {parsed.generalGuidelines && parsed.generalGuidelines.length > 0 && (
        <div className="rounded-xl bg-surface-sunk/30 border border-surface-ink/[0.06] px-4 py-3 space-y-2">
          <h4 className="text-xs font-semibold text-surface-ink">Training Guidelines</h4>
          <ul className="space-y-1">
            {parsed.generalGuidelines.map((g, i) => (
              <li key={i} className="text-xs text-surface-ink flex gap-2">
                <span className="text-brand-teal flex-shrink-0">•</span>{g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Progression notes */}
      {parsed.progressionNotes && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3">
          <h4 className="text-xs font-semibold text-indigo-700 mb-1">Progression Notes</h4>
          <p className="text-xs text-indigo-800">{parsed.progressionNotes}</p>
        </div>
      )}

      <p className="text-[10px] text-surface-muted">
        AI-generated plan — not a substitute for professional coaching. Adjust based on how you feel and consult a coach for periodization guidance.
      </p>
    </div>
  );
}

function DayCard({ dayPlan, isYouthUnder14 }: { dayPlan: PlanDay; isYouthUnder14: boolean }): JSX.Element {
  const isRest = dayPlan.type?.toLowerCase().includes('rest');
  return (
    <div className="rounded-xl border border-surface-ink/[0.06] bg-surface-raised overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-ink/[0.06]">
        <span className="font-bold text-sm text-surface-ink w-24 flex-shrink-0">{dayPlan.day}</span>
        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${typeColor(dayPlan.type || '')}`}>{dayPlan.type}</span>
        <span className="text-xs text-surface-muted flex-1">{dayPlan.focus}</span>
      </div>
      {!isRest && dayPlan.exercises && dayPlan.exercises.length > 0 && (
        <div className="px-4 py-2 space-y-1">
          {dayPlan.exercises.map((ex, i) => (
            <div key={i} className="text-xs flex items-start gap-2">
              <span className="text-surface-muted w-4 flex-shrink-0 font-semibold">{i + 1}.</span>
              <span className="flex-1 text-surface-ink font-medium">{ex.name}</span>
              {isYouthUnder14 && ex.sets ? (
                <span className="text-amber-600 text-[10px]">Coach sets load</span>
              ) : ex.sets ? (
                <span className="text-surface-muted text-[10px]">{ex.sets}×{ex.reps}{ex.rest ? ` · ${ex.rest}` : ''}</span>
              ) : ex.duration ? (
                <span className="text-surface-muted text-[10px]">{ex.duration}{ex.intensity ? ` @ ${ex.intensity}` : ''}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {dayPlan.notes && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-surface-muted italic">{dayPlan.notes}</p>
        </div>
      )}
    </div>
  );
}
