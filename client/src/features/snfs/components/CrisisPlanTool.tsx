import { useState, useEffect } from 'react';
import { useCrisisPlan, useSaveCrisisPlan } from '../api';

/**
 * Crisis Planning Tool — Session 12.
 * Helps families create a written crisis safety plan for their care recipient.
 * This is an ORGANIZATIONAL TOOL only — not a clinical safety plan.
 * Always recommend working with a licensed clinician to develop a clinical crisis plan.
 */

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

interface PlanState {
  careRecipientName: string;
  triggers: string[];
  warningSigns: string[];
  calmingStrategies: string[];
  escalationSteps: string[];
  emergencyContacts: string[];
  safePerson: string;
  safePlace: string;
  notes: string;
}

const EMPTY_PLAN: PlanState = {
  careRecipientName: '', triggers: [], warningSigns: [],
  calmingStrategies: [], escalationSteps: [], emergencyContacts: [],
  safePerson: '', safePlace: '', notes: '',
};

export function CrisisPlanTool(): JSX.Element {
  const { data: saved, isLoading } = useCrisisPlan();
  const save = useSaveCrisisPlan();
  const [plan, setPlan] = useState<PlanState>(EMPTY_PLAN);
  const [saved_, setSaved_] = useState(false);

  useEffect(() => {
    if (saved) {
      setPlan({
        careRecipientName: saved.care_recipient_name,
        triggers: parseJsonArray(saved.triggers),
        warningSigns: parseJsonArray(saved.warning_signs),
        calmingStrategies: parseJsonArray(saved.calming_strategies),
        escalationSteps: parseJsonArray(saved.escalation_steps),
        emergencyContacts: parseJsonArray(saved.emergency_contacts),
        safePerson: saved.safe_person,
        safePlace: saved.safe_place,
        notes: saved.notes,
      });
    }
  }, [saved]);

  function setField<K extends keyof PlanState>(key: K, value: PlanState[K]) {
    setPlan((p) => ({ ...p, [key]: value }));
    setSaved_(false);
  }

  function handleSave() {
    save.mutate(
      {
        careRecipientName: plan.careRecipientName,
        triggers: plan.triggers,
        warningSigns: plan.warningSigns,
        calmingStrategies: plan.calmingStrategies,
        escalationSteps: plan.escalationSteps,
        emergencyContacts: plan.emergencyContacts,
        safePerson: plan.safePerson,
        safePlace: plan.safePlace,
        notes: plan.notes,
      },
      { onSuccess: () => setSaved_(true) },
    );
  }

  if (isLoading) return <div className="text-sm text-surface-muted py-4">Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-800">
        <strong>Crisis Planning Tool:</strong> This tool helps you organize crisis information. It is an ORGANIZATIONAL tool only —{' '}
        <strong>not a clinical safety plan.</strong> Work with a licensed therapist, psychiatrist, or crisis counselor to develop a clinical safety plan.
        In an emergency, always call 911 immediately.
      </div>

      <div>
        <label className="label">Person this plan is for</label>
        <input
          className="input"
          placeholder="e.g. My son Alex"
          value={plan.careRecipientName}
          onChange={(e) => setField('careRecipientName', e.target.value)}
        />
      </div>

      <ArraySection
        label="⚡ Known triggers (things that can lead to crisis)"
        placeholder="e.g. Loud unexpected noises"
        items={plan.triggers}
        onChange={(v) => setField('triggers', v)}
      />

      <ArraySection
        label="⚠️ Early warning signs (signs that a crisis may be coming)"
        placeholder="e.g. Pacing, refusing food, repeating phrases"
        items={plan.warningSigns}
        onChange={(v) => setField('warningSigns', v)}
      />

      <ArraySection
        label="🧘 Calming strategies that have helped"
        placeholder="e.g. Quiet time in bedroom, deep pressure, preferred music"
        items={plan.calmingStrategies}
        onChange={(v) => setField('calmingStrategies', v)}
      />

      <ArraySection
        label="📈 Escalation steps (what to do as crisis escalates)"
        placeholder="e.g. Step 1: Offer sensory break. Step 2: Call therapist."
        items={plan.escalationSteps}
        onChange={(v) => setField('escalationSteps', v)}
      />

      <ArraySection
        label="📞 Emergency contacts (in order to call)"
        placeholder="e.g. Dr. Smith (therapist): 555-1234"
        items={plan.emergencyContacts}
        onChange={(v) => setField('emergencyContacts', v)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Safe person (trusted calming presence)</label>
          <input
            className="input"
            placeholder="e.g. Grandma Karen"
            value={plan.safePerson}
            onChange={(e) => setField('safePerson', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Safe place (calming environment)</label>
          <input
            className="input"
            placeholder="e.g. Bedroom with dim lights and white noise"
            value={plan.safePlace}
            onChange={(e) => setField('safePlace', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Additional notes for caregivers / responders</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Any important information for first responders or relief caregivers…"
          value={plan.notes}
          onChange={(e) => setField('notes', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={save.isPending}
          className="btn bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save crisis plan'}
        </button>
        {saved_ && <span className="text-xs text-green-600 font-semibold">✓ Saved</span>}
      </div>

      <p className="text-[10px] text-surface-muted">
        Always call 911 in an immediate emergency. This organizational plan does not replace a clinical safety plan developed with a licensed professional.
      </p>
    </div>
  );
}

function ArraySection({ label, placeholder, items, onChange }: {
  label: string; placeholder: string; items: string[]; onChange: (v: string[]) => void;
}): JSX.Element {
  const [newItem, setNewItem] = useState('');

  function add() {
    if (!newItem.trim()) return;
    onChange([...items, newItem.trim()]);
    setNewItem('');
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="text-xs font-semibold text-surface-muted uppercase tracking-wider mb-2">{label}</div>
      <div className="space-y-1.5 mb-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-surface-sunk/40 px-3 py-1.5">
            <span className="flex-1 text-xs text-surface-ink">{item}</span>
            <button onClick={() => remove(i)} className="text-surface-muted hover:text-red-500 text-sm">×</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1 text-xs"
          placeholder={placeholder}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button onClick={add} className="btn bg-surface-raised border border-surface-ink/10 text-surface-ink hover:bg-surface-sunk text-xs px-3">
          + Add
        </button>
      </div>
    </div>
  );
}
