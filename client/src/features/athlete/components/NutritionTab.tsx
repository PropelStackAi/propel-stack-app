import { useState } from 'react';
import { useNutritionLogs, useLogNutrition, useDeleteNutritionLog } from '../api';
import { MEAL_TYPES, MACRO_TARGETS, getSportCategory } from '../types';
import type { AthleteProfile, NutritionLog, FoodEntry } from '../types';

interface Props { profile: AthleteProfile; }

interface NutritionForm {
  logDate: string;
  mealType: string;
  totalCalories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  waterMl: string;
  notes: string;
  foods: FoodEntry[];
}

const EMPTY_FORM: NutritionForm = {
  logDate: new Date().toISOString().slice(0, 10),
  mealType: '', totalCalories: '', proteinG: '', carbsG: '', fatG: '', waterMl: '', notes: '', foods: [],
};

function todayTotals(logs: NutritionLog[]): { cal: number; protein: number; carbs: number; fat: number; water: number } {
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter((l) => l.log_date === today);
  return todayLogs.reduce((acc, l) => ({
    cal: acc.cal + (l.total_calories ?? 0),
    protein: acc.protein + (l.protein_g ?? 0),
    carbs: acc.carbs + (l.carbs_g ?? 0),
    fat: acc.fat + (l.fat_g ?? 0),
    water: acc.water + (l.water_ml ?? 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0, water: 0 });
}

export function NutritionTab({ profile }: Props): JSX.Element {
  const { data: logs = [], isLoading } = useNutritionLogs();
  const logNutrition = useLogNutrition();
  const deleteLog = useDeleteNutritionLog();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NutritionForm>(EMPTY_FORM);
  const [foodEntry, setFoodEntry] = useState<FoodEntry>({ name: '' });

  const sports: string[] = (() => { try { return JSON.parse(profile.sports) as string[]; } catch { return []; } })();
  const primarySport = sports[0] ?? 'Other';
  const cat = getSportCategory(primarySport);
  const macros = MACRO_TARGETS[cat] ?? MACRO_TARGETS.other;

  const totals = todayTotals(logs);

  function addFood() {
    if (!foodEntry.name.trim()) return;
    setForm({ ...form, foods: [...form.foods, { ...foodEntry }] });
    setFoodEntry({ name: '' });
  }

  function removeFood(i: number) {
    setForm({ ...form, foods: form.foods.filter((_, idx) => idx !== i) });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.mealType) return;
    logNutrition.mutate({
      log_date: form.logDate,
      meal_type: form.mealType,
      foods: form.foods,
      total_calories: form.totalCalories ? Number(form.totalCalories) : null,
      protein_g: form.proteinG ? Number(form.proteinG) : null,
      carbs_g: form.carbsG ? Number(form.carbsG) : null,
      fat_g: form.fatG ? Number(form.fatG) : null,
      water_ml: form.waterMl ? Number(form.waterMl) : null,
      notes: form.notes,
    }, { onSuccess: () => { setForm(EMPTY_FORM); setShowForm(false); } });
  }

  const calGoal = profile.calorie_goal;
  const proteinGoal = profile.protein_target;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-surface-raised border border-surface-ink/[0.06] px-4 py-4 space-y-3">
        <h4 className="text-xs font-semibold text-surface-muted uppercase tracking-wider">Today's intake</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MacroCard label="Calories" value={Math.round(totals.cal)} unit="kcal" goal={calGoal ?? undefined} color="orange" />
          <MacroCard label="Protein" value={Math.round(totals.protein)} unit="g" goal={proteinGoal ?? undefined} color="indigo" />
          <MacroCard label="Carbs" value={Math.round(totals.carbs)} unit="g" color="amber" />
          <MacroCard label="Fats" value={Math.round(totals.fat)} unit="g" color="teal" />
        </div>
        {totals.water > 0 && (
          <p className="text-xs text-blue-600">💧 Water: {(totals.water / 1000).toFixed(1)} L today</p>
        )}
      </div>

      {/* Sport-specific macro targets */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3">
        <h4 className="text-xs font-semibold text-indigo-700 mb-1">Macro targets for {primarySport}</h4>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[
            { label: 'Protein', val: macros.protein },
            { label: 'Carbs', val: macros.carbs },
            { label: 'Fat', val: macros.fat },
          ].map(({ label, val }) => (
            <div key={label} className="text-center">
              <div className="text-xs font-black text-indigo-800">{val}</div>
              <div className="text-[9px] text-indigo-500">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-indigo-600 italic">{macros.note}</p>
        <p className="text-[10px] text-indigo-500 mt-1">General guidelines only — consult a Registered Dietitian for personalized plans.</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-surface-ink">Meal log</h3>
          <p className="text-xs text-surface-muted">Log meals and track daily macros.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn bg-brand-teal text-white hover:bg-brand-teal/90 text-sm">
          {showForm ? 'Cancel' : '+ Log meal'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-2xl border border-surface-ink/10 bg-surface-sunk/20 p-4 space-y-4">
          <h4 className="text-sm font-semibold">New meal entry</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.logDate} onChange={(e) => setForm({ ...form, logDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Meal type *</label>
              <select className="input" value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })} required>
                <option value="">Select…</option>
                {MEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Quick macro entry */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="label">Calories</label>
              <input className="input text-xs" type="number" min={0} placeholder="kcal" value={form.totalCalories} onChange={(e) => setForm({ ...form, totalCalories: e.target.value })} />
            </div>
            <div>
              <label className="label">Protein (g)</label>
              <input className="input text-xs" type="number" min={0} placeholder="g" value={form.proteinG} onChange={(e) => setForm({ ...form, proteinG: e.target.value })} />
            </div>
            <div>
              <label className="label">Carbs (g)</label>
              <input className="input text-xs" type="number" min={0} placeholder="g" value={form.carbsG} onChange={(e) => setForm({ ...form, carbsG: e.target.value })} />
            </div>
            <div>
              <label className="label">Fat (g)</label>
              <input className="input text-xs" type="number" min={0} placeholder="g" value={form.fatG} onChange={(e) => setForm({ ...form, fatG: e.target.value })} />
            </div>
          </div>

          {/* Water */}
          <div>
            <label className="label">Water (ml)</label>
            <input className="input" type="number" min={0} max={5000} placeholder="e.g. 500" value={form.waterMl} onChange={(e) => setForm({ ...form, waterMl: e.target.value })} />
          </div>

          {/* Food items */}
          <div>
            <label className="label">Food items (optional)</label>
            <div className="space-y-1 mb-2">
              {form.foods.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-surface-raised border border-surface-ink/[0.06] px-3 py-1.5">
                  <span className="flex-1 text-xs">{f.name}</span>
                  <button type="button" onClick={() => removeFood(i)} className="text-surface-muted hover:text-red-500 text-sm">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input flex-1 text-xs" placeholder="e.g. Grilled chicken breast, 150g" value={foodEntry.name}
                onChange={(e) => setFoodEntry({ ...foodEntry, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFood())} />
              <button type="button" onClick={addFood} disabled={!foodEntry.name.trim()} className="btn bg-surface-raised border border-surface-ink/10 text-xs text-surface-ink px-3 disabled:opacity-50">+ Add</button>
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} placeholder="Any notes about this meal…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outline text-sm">Cancel</button>
            <button type="submit" disabled={logNutrition.isPending || !form.mealType} className="flex-1 btn bg-brand-teal text-white text-sm disabled:opacity-50">
              {logNutrition.isPending ? 'Saving…' : 'Save meal'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="text-sm text-surface-muted">Loading…</div>}

      {!isLoading && logs.length === 0 && !showForm && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🥗</div>
          <p className="text-sm text-surface-muted">No meals logged yet. Start tracking to see daily macro trends.</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-surface-muted uppercase tracking-wider">Recent meals</h4>
          {logs.slice(0, 20).map((log) => (
            <MealRow key={log.id} log={log} onDelete={() => deleteLog.mutate(log.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MacroCard({ label, value, unit, goal, color }: {
  label: string; value: number; unit: string; goal?: number; color: string;
}): JSX.Element {
  const colors: Record<string, string> = {
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${colors[color] ?? colors.teal}`}>
      <div className="text-lg font-black">{value}<span className="text-[10px] font-normal ml-0.5">{unit}</span></div>
      <div className="text-[10px] font-semibold">{label}</div>
      {goal && <div className="text-[9px] opacity-70">goal: {goal}{unit}</div>}
    </div>
  );
}

function MealRow({ log, onDelete }: { log: NutritionLog; onDelete: () => void }): JSX.Element {
  const dateStr = new Date(log.log_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const foods: FoodEntry[] = (() => { try { return JSON.parse(log.foods) as FoodEntry[]; } catch { return []; } })();

  return (
    <div className="rounded-xl border border-surface-ink/[0.06] bg-surface-raised px-4 py-3 flex items-start gap-3">
      <div className="flex-shrink-0 text-center min-w-[44px]">
        <div className="text-[10px] font-bold text-surface-ink">{dateStr}</div>
        <div className="text-[9px] text-surface-muted">{log.meal_type}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 text-xs text-surface-muted flex-wrap">
          {log.total_calories !== null && <span className="text-orange-600 font-semibold">{log.total_calories} kcal</span>}
          {log.protein_g !== null && <span>P:{log.protein_g}g</span>}
          {log.carbs_g !== null && <span>C:{log.carbs_g}g</span>}
          {log.fat_g !== null && <span>F:{log.fat_g}g</span>}
        </div>
        {foods.length > 0 && <p className="text-[10px] text-surface-muted mt-0.5">{foods.map((f) => f.name).join(' · ')}</p>}
        {log.notes && <p className="text-[10px] text-surface-muted italic mt-0.5">{log.notes}</p>}
      </div>
      <button onClick={onDelete} className="text-surface-muted hover:text-red-500 text-sm shrink-0">×</button>
    </div>
  );
}
