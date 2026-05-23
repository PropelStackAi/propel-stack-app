import { useState } from 'react';
import { useSaveAthleteProfile } from '../api';
import {
  SPORTS, EXPERIENCE_LEVELS, PRIMARY_GOALS, EQUIPMENT_OPTIONS,
  SESSION_LENGTH_OPTIONS, BIOLOGICAL_SEX_OPTIONS,
} from '../types';

interface WizardState {
  sports: string[];
  experience: string;
  primary_goal: string;
  training_days: number;
  session_length: number;
  equipment: string[];
  competition_date: string;
  injury_history: string;
  age: string;
  weight: string;
  height: string;
  biological_sex: string;
  dietary_restrictions: string[];
  calorie_goal: string;
  protein_target: string;
}

const EMPTY: WizardState = {
  sports: [], experience: '', primary_goal: '', training_days: 3, session_length: 60,
  equipment: [], competition_date: '', injury_history: '', age: '', weight: '', height: '',
  biological_sex: '', dietary_restrictions: [], calorie_goal: '', protein_target: '',
};

const DIETARY_OPTIONS = ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Halal', 'Kosher', 'Nut-free'];
const TOTAL_STEPS = 5;

interface Props { onComplete: () => void; }

export function ProfileWizard({ onComplete }: Props): JSX.Element {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardState>(EMPTY);
  const save = useSaveAthleteProfile();

  function toggleArray<T extends keyof WizardState>(key: T, value: string) {
    const arr = form[key] as string[];
    setForm({ ...form, [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] });
  }

  function set<T extends keyof WizardState>(key: T, value: WizardState[T]) {
    setForm({ ...form, [key]: value });
  }

  function canAdvance(): boolean {
    if (step === 1) return form.sports.length > 0;
    if (step === 2) return !!form.experience && !!form.primary_goal;
    if (step === 3) return form.training_days >= 2;
    if (step === 4) return true;
    return true;
  }

  function handleSubmit() {
    const age = form.age ? Number(form.age) : null;
    const isYouth = !!age && age < 18;
    const isYouthUnder14 = !!age && age < 14;
    save.mutate({
      sports: form.sports,
      experience: form.experience,
      primary_goal: form.primary_goal,
      training_days: form.training_days,
      session_length: form.session_length,
      equipment: form.equipment,
      competition_date: form.competition_date || null,
      injury_history: form.injury_history,
      age: age,
      weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null,
      biological_sex: form.biological_sex,
      dietary_restrictions: form.dietary_restrictions,
      calorie_goal: form.calorie_goal ? Number(form.calorie_goal) : null,
      protein_target: form.protein_target ? Number(form.protein_target) : null,
      is_youth: isYouth,
      is_youth_under_14: isYouthUnder14,
    }, { onSuccess: onComplete });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-surface-muted font-semibold">Step {step} of {TOTAL_STEPS}</span>
          <span className="text-xs text-surface-muted">{Math.round((step / TOTAL_STEPS) * 100)}% complete</span>
        </div>
        <div className="h-2 bg-surface-sunk rounded-full overflow-hidden">
          <div className="h-full bg-brand-teal rounded-full transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-surface-ink/10 bg-surface-raised p-6 space-y-5">
        {step === 1 && <Step1 form={form} toggle={(v) => toggleArray('sports', v)} />}
        {step === 2 && <Step2 form={form} set={set} />}
        {step === 3 && <Step3 form={form} set={set} toggle={(v) => toggleArray('equipment', v)} />}
        {step === 4 && <Step4 form={form} set={set} />}
        {step === 5 && <Step5 form={form} set={set} toggle={(v) => toggleArray('dietary_restrictions', v)} />}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)} className="flex-1 btn-outline text-sm">← Back</button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex-1 btn bg-brand-teal text-white text-sm disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={save.isPending}
              className="flex-1 btn bg-brand-teal text-white text-sm disabled:opacity-50"
            >
              {save.isPending ? 'Saving profile…' : 'Complete Profile 🎉'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Sport Selection ─────────────────────────────────────────────────

function Step1({ form, toggle }: { form: WizardState; toggle: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-surface-ink">What sport(s) do you train for?</h3>
        <p className="text-xs text-surface-muted">Select all that apply.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SPORTS.map((sport) => {
          const sel = form.sports.includes(sport);
          return (
            <button
              key={sport}
              type="button"
              onClick={() => toggle(sport)}
              className={[
                'px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-left',
                sel ? 'bg-brand-teal text-white border-brand-teal' : 'bg-surface-sunk border-surface-ink/10 text-surface-ink hover:border-brand-teal/50',
              ].join(' ')}
            >
              {sport}
            </button>
          );
        })}
      </div>
      {form.sports.length === 0 && <p className="text-xs text-amber-600">Please select at least one sport.</p>}
    </div>
  );
}

// ─── Step 2: Experience & Goals ──────────────────────────────────────────────

function Step2({ form, set }: { form: WizardState; set: <T extends keyof WizardState>(k: T, v: WizardState[T]) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-surface-ink">Experience & primary goal</h3>
      </div>
      <div>
        <label className="label">Experience level</label>
        <div className="grid grid-cols-2 gap-2">
          {EXPERIENCE_LEVELS.map((lvl) => (
            <button
              key={lvl.value}
              type="button"
              onClick={() => set('experience', lvl.value)}
              className={[
                'rounded-xl border p-3 text-left transition-all',
                form.experience === lvl.value ? 'bg-brand-teal text-white border-brand-teal' : 'bg-surface-sunk border-surface-ink/10 hover:border-brand-teal/50',
              ].join(' ')}
            >
              <div className={`text-xs font-bold ${form.experience === lvl.value ? 'text-white' : 'text-surface-ink'}`}>{lvl.label}</div>
              <div className={`text-[10px] ${form.experience === lvl.value ? 'text-white/80' : 'text-surface-muted'}`}>{lvl.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Primary goal</label>
        <div className="grid grid-cols-2 gap-2">
          {PRIMARY_GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => set('primary_goal', g.value)}
              className={[
                'rounded-xl border px-3 py-2 text-left flex items-center gap-2 transition-all',
                form.primary_goal === g.value ? 'bg-brand-teal text-white border-brand-teal' : 'bg-surface-sunk border-surface-ink/10 hover:border-brand-teal/50',
              ].join(' ')}
            >
              <span>{g.emoji}</span>
              <span className={`text-xs font-semibold ${form.primary_goal === g.value ? 'text-white' : 'text-surface-ink'}`}>{g.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Schedule & Equipment ────────────────────────────────────────────

function Step3({ form, set, toggle }: {
  form: WizardState;
  set: <T extends keyof WizardState>(k: T, v: WizardState[T]) => void;
  toggle: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-surface-ink">Training schedule & equipment</h3>
      <div>
        <label className="label">Days per week you can train</label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => set('training_days', d)}
              className={[
                'flex-1 rounded-xl border py-2 text-sm font-bold transition-all',
                form.training_days === d ? 'bg-brand-teal text-white border-brand-teal' : 'bg-surface-sunk border-surface-ink/10',
              ].join(' ')}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Typical session length</label>
        <div className="grid grid-cols-3 gap-2">
          {SESSION_LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('session_length', opt.value)}
              className={[
                'rounded-xl border py-2 text-xs font-semibold transition-all',
                form.session_length === opt.value ? 'bg-brand-teal text-white border-brand-teal' : 'bg-surface-sunk border-surface-ink/10',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Equipment available (select all)</label>
        <div className="grid grid-cols-2 gap-1.5">
          {EQUIPMENT_OPTIONS.map((eq) => {
            const sel = form.equipment.includes(eq);
            return (
              <label key={eq} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sel} onChange={() => toggle(eq)} className="accent-brand-teal" />
                <span className="text-xs text-surface-ink">{eq}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Body & Health ───────────────────────────────────────────────────

function Step4({ form, set }: { form: WizardState; set: <T extends keyof WizardState>(k: T, v: WizardState[T]) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-surface-ink">Body stats & health</h3>
        <p className="text-xs text-surface-muted">Optional — used to personalize plans. Age is used to activate youth safety mode for athletes under 14.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Age</label>
          <input className="input" type="number" min={5} max={100} placeholder="e.g. 25" value={form.age} onChange={(e) => set('age', e.target.value)} />
        </div>
        <div>
          <label className="label">Biological sex</label>
          <select className="input" value={form.biological_sex} onChange={(e) => set('biological_sex', e.target.value)}>
            <option value="">Select…</option>
            {BIOLOGICAL_SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Weight (lbs)</label>
          <input className="input" type="number" min={50} max={500} placeholder="e.g. 170" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
        </div>
        <div>
          <label className="label">Height (inches)</label>
          <input className="input" type="number" min={36} max={96} placeholder="e.g. 70" value={form.height} onChange={(e) => set('height', e.target.value)} />
        </div>
      </div>
      {form.age && Number(form.age) < 14 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <strong>Youth Safety Mode (Under 14):</strong> 1RM calculations and certain intensity methods are disabled. A "Coach Review Required" watermark is applied to generated plans.
        </div>
      )}
      <div>
        <label className="label">Injury history / areas of concern (optional)</label>
        <textarea
          className="input"
          rows={2}
          placeholder="e.g. Left knee surgery 2022, lower back tightness"
          value={form.injury_history}
          onChange={(e) => set('injury_history', e.target.value)}
        />
      </div>
      <div>
        <label className="label">Competition / target event date (optional)</label>
        <input className="input" type="date" value={form.competition_date} onChange={(e) => set('competition_date', e.target.value)} />
      </div>
    </div>
  );
}

// ─── Step 5: Nutrition ───────────────────────────────────────────────────────

function Step5({ form, set, toggle }: {
  form: WizardState;
  set: <T extends keyof WizardState>(k: T, v: WizardState[T]) => void;
  toggle: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-surface-ink">Nutrition preferences</h3>
        <p className="text-xs text-surface-muted">Optional — used to tailor macro targets and meal suggestions.</p>
      </div>
      <div>
        <label className="label">Dietary preferences / restrictions</label>
        <div className="grid grid-cols-2 gap-1.5">
          {DIETARY_OPTIONS.map((d) => (
            <label key={d} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.dietary_restrictions.includes(d)} onChange={() => toggle(d)} className="accent-brand-teal" />
              <span className="text-xs text-surface-ink">{d}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Daily calorie goal (optional)</label>
          <input className="input" type="number" min={1000} max={10000} placeholder="e.g. 2500" value={form.calorie_goal} onChange={(e) => set('calorie_goal', e.target.value)} />
        </div>
        <div>
          <label className="label">Protein target g/day (optional)</label>
          <input className="input" type="number" min={50} max={500} placeholder="e.g. 180" value={form.protein_target} onChange={(e) => set('protein_target', e.target.value)} />
        </div>
      </div>
      <div className="rounded-xl bg-surface-sunk/40 px-4 py-3 text-xs text-surface-muted">
        <strong className="text-surface-ink">Note:</strong> Nutrition suggestions are general guidelines only. For personalized nutrition planning, consult a Registered Dietitian or sports nutritionist.
      </div>
    </div>
  );
}
