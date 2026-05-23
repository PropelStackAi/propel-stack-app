import { useState } from 'react';
import { useCareTeam, useCrisisPlan } from '../api';

/**
 * Emergency Info Card — Session 12.
 * A printable / shareable summary of critical care information for first responders
 * and relief caregivers. User fills in fields; print-ready layout.
 */

interface CardData {
  recipientName: string;
  dateOfBirth: string;
  primaryDiagnoses: string;
  criticalMedications: string;
  allergies: string;
  communicationNotes: string;
  doNot: string;
  helpfulApproaches: string;
  emergencyContact1Name: string;
  emergencyContact1Phone: string;
  emergencyContact1Relation: string;
  emergencyContact2Name: string;
  emergencyContact2Phone: string;
  emergencyContact2Relation: string;
  physicianName: string;
  physicianPhone: string;
  insuranceInfo: string;
  additionalNotes: string;
}

const EMPTY: CardData = {
  recipientName: '', dateOfBirth: '', primaryDiagnoses: '', criticalMedications: '',
  allergies: '', communicationNotes: '', doNot: '', helpfulApproaches: '',
  emergencyContact1Name: '', emergencyContact1Phone: '', emergencyContact1Relation: '',
  emergencyContact2Name: '', emergencyContact2Phone: '', emergencyContact2Relation: '',
  physicianName: '', physicianPhone: '', insuranceInfo: '', additionalNotes: '',
};

export function EmergencyInfoCard(): JSX.Element {
  const [card, setCard] = useState<CardData>(EMPTY);
  const [showPrint, setShowPrint] = useState(false);

  const { data: careTeam = [] } = useCareTeam();
  const { data: crisisPlan } = useCrisisPlan();

  function set(key: keyof CardData, value: string) {
    setCard((c) => ({ ...c, [key]: value }));
  }

  // Auto-populate from care team and crisis plan
  function autofill() {
    const physician = careTeam.find((m) => m.role.includes('Physician') || m.role.includes('Pediatrician'));
    if (physician) {
      setCard((c) => ({
        ...c,
        physicianName: physician.name,
        physicianPhone: physician.phone,
        emergencyContact1Name: crisisPlan ? '' : c.emergencyContact1Name,
      }));
    }
    if (crisisPlan) {
      const contacts: string[] = JSON.parse(crisisPlan.emergency_contacts || '[]');
      if (contacts.length > 0) setCard((c) => ({ ...c, emergencyContact1Name: contacts[0] ?? c.emergencyContact1Name }));
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-800">
        <strong>Emergency Information Card:</strong> Fill in key information for first responders and relief caregivers.
        Print and post where care is provided (home, school, daycare). Update whenever information changes.
        <strong> This does not replace a clinical emergency or medical action plan.</strong>
      </div>

      {careTeam.length > 0 && (
        <button onClick={autofill} className="btn bg-surface-raised border border-surface-ink/10 text-surface-ink hover:bg-surface-sunk text-xs">
          ✨ Auto-fill from Care Team & Crisis Plan
        </button>
      )}

      <div className="space-y-4">
        {/* Basic info */}
        <Section label="Person">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name" value={card.recipientName} onChange={(v) => set('recipientName', v)} placeholder="Full name" />
            <Field label="Date of birth" value={card.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} placeholder="MM/DD/YYYY" />
          </div>
          <Field label="Primary diagnoses / conditions" value={card.primaryDiagnoses} onChange={(v) => set('primaryDiagnoses', v)} placeholder="e.g. Autism Spectrum Disorder, ADHD" area />
        </Section>

        {/* Medical */}
        <Section label="🏥 Medical">
          <Field label="Critical medications (name & dose)" value={card.criticalMedications} onChange={(v) => set('criticalMedications', v)} placeholder="e.g. Keppra 500mg twice daily (seizures)" area />
          <Field label="Allergies (food, medication, environmental)" value={card.allergies} onChange={(v) => set('allergies', v)} placeholder="e.g. Penicillin — severe; Latex — anaphylaxis" area />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Physician name" value={card.physicianName} onChange={(v) => set('physicianName', v)} placeholder="Dr. Name" />
            <Field label="Physician phone" value={card.physicianPhone} onChange={(v) => set('physicianPhone', v)} placeholder="555-123-4567" />
          </div>
          <Field label="Insurance / Medicaid info" value={card.insuranceInfo} onChange={(v) => set('insuranceInfo', v)} placeholder="Insurance company, member ID" />
        </Section>

        {/* Communication & behavior */}
        <Section label="💬 Communication & Behavior">
          <Field label="Communication notes (how this person communicates)" value={card.communicationNotes} onChange={(v) => set('communicationNotes', v)} placeholder="e.g. Uses AAC device, understand simple sentences, nonverbal when overwhelmed" area />
          <Field label="⚠️ Do NOT do / avoid" value={card.doNot} onChange={(v) => set('doNot', v)} placeholder="e.g. Do not touch without warning. Do not raise voice. Do not separate from favorite toy." area />
          <Field label="✅ Helpful approaches" value={card.helpfulApproaches} onChange={(v) => set('helpfulApproaches', v)} placeholder="e.g. Speak calmly, allow time to respond, offer choices, use name first" area />
        </Section>

        {/* Emergency contacts */}
        <Section label="📞 Emergency Contacts">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Contact 1 — Name" value={card.emergencyContact1Name} onChange={(v) => set('emergencyContact1Name', v)} placeholder="Mom / guardian" />
            <Field label="Phone" value={card.emergencyContact1Phone} onChange={(v) => set('emergencyContact1Phone', v)} placeholder="555-234-5678" />
            <Field label="Relationship" value={card.emergencyContact1Relation} onChange={(v) => set('emergencyContact1Relation', v)} placeholder="Mother" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Contact 2 — Name" value={card.emergencyContact2Name} onChange={(v) => set('emergencyContact2Name', v)} placeholder="Dad / second contact" />
            <Field label="Phone" value={card.emergencyContact2Phone} onChange={(v) => set('emergencyContact2Phone', v)} placeholder="555-345-6789" />
            <Field label="Relationship" value={card.emergencyContact2Relation} onChange={(v) => set('emergencyContact2Relation', v)} placeholder="Father" />
          </div>
        </Section>

        <Section label="📝 Additional notes for responders">
          <Field label="" value={card.additionalNotes} onChange={(v) => set('additionalNotes', v)} placeholder="Anything else a first responder or relief caregiver should know…" area />
        </Section>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowPrint(true)}
          className="btn bg-brand-purple text-white hover:bg-brand-purple/90"
        >
          🖨️ Preview & Print
        </button>
      </div>

      {/* Print preview */}
      {showPrint && (
        <PrintPreview card={card} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="rounded-xl border border-surface-ink/[0.06] bg-surface-raised p-4 space-y-3">
      <div className="text-xs font-semibold text-surface-muted uppercase tracking-wider">{label}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, area }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean;
}): JSX.Element {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {area ? (
        <textarea className="input" rows={2} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function PrintPreview({ card, onClose }: { card: CardData; onClose: () => void }): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-4">
        {/* Print header */}
        <div className="bg-red-700 text-white px-6 py-4 rounded-t-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-red-200 mb-1">🚨 Emergency Information Card</div>
          <div className="font-display font-extrabold text-2xl">{card.recipientName || 'NAME NOT ENTERED'}</div>
          {card.dateOfBirth && <div className="text-sm text-red-200 mt-0.5">DOB: {card.dateOfBirth}</div>}
        </div>

        <div className="px-6 py-5 space-y-4 text-sm">
          {/* Quick crisis line */}
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex flex-wrap gap-4 text-xs font-bold text-red-700">
            <span>EMERGENCY: 911</span>
            <span>CRISIS: 988</span>
            <span>NAMI: 1-800-950-6264</span>
          </div>

          {card.primaryDiagnoses && <PrintField label="Diagnoses / Conditions" value={card.primaryDiagnoses} highlight />}
          {card.allergies && <PrintField label="⚠️ ALLERGIES" value={card.allergies} highlight />}
          {card.criticalMedications && <PrintField label="💊 Critical Medications" value={card.criticalMedications} />}
          {card.communicationNotes && <PrintField label="💬 Communication" value={card.communicationNotes} />}
          {card.doNot && <PrintField label="❌ DO NOT / AVOID" value={card.doNot} highlight />}
          {card.helpfulApproaches && <PrintField label="✅ Helpful Approaches" value={card.helpfulApproaches} />}

          {(card.emergencyContact1Name || card.emergencyContact2Name) && (
            <div>
              <div className="text-xs font-bold uppercase text-gray-500 mb-1">Emergency Contacts</div>
              {card.emergencyContact1Name && <div className="text-sm">{card.emergencyContact1Name} ({card.emergencyContact1Relation}) — {card.emergencyContact1Phone}</div>}
              {card.emergencyContact2Name && <div className="text-sm">{card.emergencyContact2Name} ({card.emergencyContact2Relation}) — {card.emergencyContact2Phone}</div>}
            </div>
          )}

          {(card.physicianName || card.physicianPhone) && (
            <PrintField label="👨‍⚕️ Physician" value={`${card.physicianName} — ${card.physicianPhone}`} />
          )}
          {card.additionalNotes && <PrintField label="📝 Additional Notes" value={card.additionalNotes} />}

          <p className="text-[10px] text-gray-400 border-t pt-3">
            Generated by Propel Stack AI Life OS · {new Date().toLocaleDateString()} · For informational use only. Not a clinical document.
          </p>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={() => window.print()} className="flex-1 btn bg-brand-purple text-white hover:bg-brand-purple/90">🖨️ Print</button>
          <button onClick={onClose} className="flex-1 btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
}

function PrintField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }): JSX.Element {
  return (
    <div className={highlight ? 'rounded-lg bg-red-50 border border-red-200 px-3 py-2' : ''}>
      <div className="text-[10px] font-bold uppercase text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-800 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
