import { useState } from 'react';
import { useCareTeam, useAddCareTeamMember, useDeleteCareTeamMember } from '../api';
import type { CareTeamMember } from '../types';

const ROLES = ['Physician / Pediatrician', 'Psychiatrist', 'Psychologist', 'Therapist / Counselor',
  'Speech-Language Pathologist (SLP)', 'Occupational Therapist (OT)', 'Physical Therapist (PT)',
  'Applied Behavior Analyst (BCBA)', 'Special Education Teacher', 'School Psychologist',
  'Case Manager / Care Coordinator', 'Social Worker', 'Nutritionist / Dietitian',
  'Neurologist', 'Developmental Pediatrician', 'Nurse / Nurse Practitioner', 'Other'];

const ROLE_EMOJIS: Record<string, string> = {
  'Physician': '👨‍⚕️', 'Psychiatrist': '🧠', 'Psychologist': '💜',
  'Therapist': '💬', 'Speech': '🗣️', 'Occupational': '🖐️', 'Physical': '🏃',
  'Applied Behavior': '📊', 'Special Education': '📚', 'School Psychologist': '🏫',
  'Case Manager': '📋', 'Social Worker': '🤝', 'Nutritionist': '🥗',
  'Neurologist': '🧬', 'Developmental': '🌱', 'Nurse': '💉', 'Other': '👤',
};

function getEmoji(role: string): string {
  for (const [key, emoji] of Object.entries(ROLE_EMOJIS)) {
    if (role.includes(key)) return emoji;
  }
  return '👤';
}

export function CareTeamManager(): JSX.Element {
  const { data: members = [], isLoading } = useCareTeam();
  const addMember = useAddCareTeamMember();
  const deleteMember = useDeleteCareTeamMember();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Physician / Pediatrician', organization: '', phone: '', email: '', notes: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addMember.mutate(form, {
      onSuccess: () => {
        setForm({ name: '', role: 'Physician / Pediatrician', organization: '', phone: '', email: '', notes: '' });
        setShowForm(false);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-surface-ink">Care Team</h3>
          <p className="text-xs text-surface-muted">Keep all providers, therapists, and specialists in one place.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn bg-brand-purple text-white hover:bg-brand-purple/90 text-sm">
          {showForm ? 'Cancel' : '+ Add member'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-2xl border border-surface-ink/10 bg-surface-sunk/20 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-surface-ink">New care team member</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" placeholder="Dr. Sarah Chen" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Organization / practice</label>
              <input className="input" placeholder="Children's Hospital" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" placeholder="555-123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="provider@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <input className="input" placeholder="Next appointment, specialty focus, patient portal link…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outline text-sm">Cancel</button>
            <button type="submit" disabled={addMember.isPending || !form.name} className="flex-1 btn bg-brand-purple text-white text-sm disabled:opacity-50">
              {addMember.isPending ? 'Saving…' : 'Add member'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="text-sm text-surface-muted">Loading…</div>}

      {!isLoading && members.length === 0 && !showForm && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm text-surface-muted">No care team members yet. Add your first provider.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} onDelete={() => deleteMember.mutate(member.id)} />
        ))}
      </div>
    </div>
  );
}

function MemberCard({ member, onDelete }: { member: CareTeamMember; onDelete: () => void }): JSX.Element {
  return (
    <div className="rounded-xl border border-surface-ink/[0.06] bg-surface-raised p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getEmoji(member.role)}</span>
          <div>
            <div className="font-semibold text-sm text-surface-ink">{member.name}</div>
            <div className="text-xs text-surface-muted">{member.role}</div>
          </div>
        </div>
        <button onClick={onDelete} className="text-surface-muted hover:text-red-500 text-sm ml-2">×</button>
      </div>
      {member.organization && (
        <div className="text-xs text-surface-muted">🏥 {member.organization}</div>
      )}
      {member.phone && (
        <a href={`tel:${member.phone}`} className="text-xs text-brand-indigo hover:underline block">
          📞 {member.phone}
        </a>
      )}
      {member.email && (
        <a href={`mailto:${member.email}`} className="text-xs text-brand-indigo hover:underline block truncate">
          ✉️ {member.email}
        </a>
      )}
      {member.notes && (
        <p className="text-xs text-surface-muted mt-1.5 italic">{member.notes}</p>
      )}
    </div>
  );
}
