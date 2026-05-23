import { useState } from 'react';
import { useHealthProfile, useUpdateHealthProfile } from '../api';
import { BLOOD_TYPES } from '../types';

export function HealthProfileTab(): JSX.Element {
  const { data: profile, isLoading } = useHealthProfile();
  const update = useUpdateHealthProfile();
  const [editing, setEditing] = useState(false);

  const allergies: string[] = profile?.allergies ? JSON.parse(profile.allergies) : [];
  const conditions: string[] = profile?.conditions ? JSON.parse(profile.conditions) : [];

  const [form, setForm] = useState({
    fullName: '', bloodType: '', allergyInput: '', conditionInput: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '', notes: '',
  });

  function startEditing() {
    if (!profile) return;
    setForm({
      fullName: profile.full_name,
      bloodType: profile.blood_type,
      allergyInput: '',
      conditionInput: '',
      emergencyContactName: profile.emergency_contact_name,
      emergencyContactPhone: profile.emergency_contact_phone,
      emergencyContactRelation: profile.emergency_contact_relation,
      notes: profile.notes,
    });
    setEditing(true);
  }

  function save() {
    update.mutate({
      fullName: form.fullName,
      bloodType: form.bloodType,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      emergencyContactRelation: form.emergencyContactRelation,
      notes: form.notes,
      allergies,
      conditions,
    }, { onSuccess: () => setEditing(false) });
  }

  function addTag(list: string[], item: string, setter: (v: string[]) => void, key: 'allergies' | 'conditions') {
    const trimmed = item.trim();
    if (!trimmed || list.includes(trimmed)) return;
    const next = [...list, trimmed];
    update.mutate({ [key]: next });
    setter(next);
  }

  function removeTag(list: string[], item: string, key: 'allergies' | 'conditions') {
    const next = list.filter((i) => i !== item);
    update.mutate({ [key]: next });
  }

  if (isLoading) return <div className="py-8 text-center text-surface-muted text-sm">Loading profile…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg text-surface-ink">Health Profile</h3>
        {!editing && (
          <button onClick={startEditing} className="btn-outline text-sm">Edit</button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4 bg-surface-sunk/40 rounded-2xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <label className="label">Blood type</label>
              <select className="input" value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })}>
                <option value="">— select —</option>
                {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Emergency contact name</label>
              <input className="input" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
            </div>
            <div>
              <label className="label">Relation</label>
              <input className="input" value={form.emergencyContactRelation} onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditing(false)} className="flex-1 btn-outline text-sm">Cancel</button>
            <button onClick={save} disabled={update.isPending} className="flex-1 btn bg-brand-coral text-white hover:bg-brand-coral/90 text-sm disabled:opacity-50">
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoCard label="Full name" value={profile?.full_name || '—'} />
          <InfoCard label="Blood type" value={profile?.blood_type || '—'} highlight />
          {profile?.notes && <InfoCard label="Notes" value={profile.notes} className="sm:col-span-2" />}
        </div>
      )}

      {/* Allergies */}
      <TagSection
        title="Allergies" emoji="🚨" tags={allergies} colorClass="bg-red-100 text-red-700 border-red-200"
        onAdd={(v) => addTag(allergies, v, () => {}, 'allergies')}
        onRemove={(v) => removeTag(allergies, v, 'allergies')}
        placeholder="e.g. Penicillin"
      />

      {/* Conditions */}
      <TagSection
        title="Chronic conditions" emoji="📋" tags={conditions} colorClass="bg-blue-100 text-blue-700 border-blue-200"
        onAdd={(v) => addTag(conditions, v, () => {}, 'conditions')}
        onRemove={(v) => removeTag(conditions, v, 'conditions')}
        placeholder="e.g. Hypertension"
      />

      {/* Emergency contact read-only */}
      {(profile?.emergency_contact_name || profile?.emergency_contact_phone) && !editing && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <h4 className="text-sm font-semibold text-red-700 mb-2">📞 Emergency contact</h4>
          <p className="font-semibold text-red-800">{profile?.emergency_contact_name}</p>
          {profile?.emergency_contact_relation && <p className="text-xs text-red-600">{profile.emergency_contact_relation}</p>}
          {profile?.emergency_contact_phone && (
            <a href={`tel:${profile.emergency_contact_phone}`} className="text-sm text-red-700 font-bold underline">
              {profile.emergency_contact_phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, highlight, className = '' }: { label: string; value: string; highlight?: boolean; className?: string }): JSX.Element {
  return (
    <div className={`rounded-xl bg-surface-sunk/40 p-4 ${className}`}>
      <div className="text-xs text-surface-muted uppercase tracking-wider font-semibold mb-1">{label}</div>
      <div className={`font-semibold ${highlight ? 'text-lg text-brand-coral' : 'text-surface-ink'}`}>{value}</div>
    </div>
  );
}

function TagSection({ title, emoji, tags, colorClass, onAdd, onRemove, placeholder }: {
  title: string; emoji: string; tags: string[]; colorClass: string;
  onAdd: (v: string) => void; onRemove: (v: string) => void; placeholder: string;
}): JSX.Element {
  const [input, setInput] = useState('');
  return (
    <div>
      <h4 className="text-sm font-semibold text-surface-ink mb-2">{emoji} {title}</h4>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
            {t}
            <button onClick={() => onRemove(t)} className="ml-1 opacity-60 hover:opacity-100">×</button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-surface-muted">None recorded</span>}
      </div>
      <div className="flex gap-2">
        <input
          className="input text-sm flex-1"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(input); setInput(''); } }}
        />
        <button
          onClick={() => { onAdd(input); setInput(''); }}
          disabled={!input.trim()}
          className="btn bg-surface-sunk text-surface-ink text-sm disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
