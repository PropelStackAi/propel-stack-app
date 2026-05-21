import { useState } from 'react';
import { suggestCategory } from '../api';
import {
  CONTACT_CATEGORIES,
  type ContactCategory,
  type ContactInput,
  type LabeledValue,
} from '../types';

const inputCls =
  'w-full rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none';
const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-surface-muted mb-1';

export function ContactForm({
  initial,
  mode,
  busy,
  banner,
  onSubmit,
  onCancel,
}: {
  initial: ContactInput;
  mode: 'create' | 'edit';
  busy?: boolean;
  banner?: string;
  onSubmit: (input: ContactInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ContactInput>(initial);
  const [tagDraft, setTagDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ContactInput>(key: K, value: ContactInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setList(key: 'phones' | 'emails', items: LabeledValue[]) {
    setForm((f) => ({ ...f, [key]: items }));
  }

  function addTag() {
    const t = tagDraft.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagDraft('');
  }

  async function handleSuggest() {
    try {
      const res = await suggestCategory(form.title, form.company);
      set('category', res.category);
      set('contactType', res.contactType);
    } catch {
      /* non-fatal */
    }
  }

  function handlePhoto(file: File) {
    if (file.size > 3_000_000) {
      setError('Photo must be under 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('photo', String(reader.result));
    reader.readAsDataURL(file);
  }

  function submit() {
    const clean: ContactInput = {
      ...form,
      phones: form.phones.filter((p) => p.value.trim()),
      emails: form.emails.filter((e) => e.value.trim()),
    };
    if (!clean.firstName.trim() && !clean.lastName.trim() && !clean.company.trim()) {
      setError('Add a first name, last name, or company.');
      return;
    }
    setError(null);
    onSubmit(clean);
  }

  return (
    <div className="space-y-5">
      {banner && (
        <p className="rounded-lg bg-brand-coral/10 text-brand-coral text-xs px-3 py-2 ring-1 ring-brand-coral/20">
          {banner}
        </p>
      )}

      <PhotoField photo={form.photo} onPick={handlePhoto} onClear={() => set('photo', '')} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
        </Field>
        <Field label="Last name">
          <input className={inputCls} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </Field>
        <Field label="Company">
          <input className={inputCls} value={form.company} onChange={(e) => set('company', e.target.value)} />
        </Field>
        <Field label="Title">
          <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
      </div>

      <LabeledList
        title="Phone numbers"
        items={form.phones}
        defaultLabel="Mobile"
        onChange={(items) => setList('phones', items)}
      />
      <LabeledList
        title="Emails"
        items={form.emails}
        defaultLabel="Personal"
        onChange={(items) => setList('emails', items)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Website">
          <input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} />
        </Field>
        <Field label="How we met">
          <input className={inputCls} value={form.howMet} onChange={(e) => set('howMet', e.target.value)} />
        </Field>
      </div>

      <Field label="Address">
        <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <div className="flex gap-2">
            <select
              className={inputCls}
              value={form.category}
              onChange={(e) => set('category', e.target.value as ContactCategory)}
            >
              {CONTACT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleSuggest} className="btn-secondary !py-2 !px-3 !text-xs whitespace-nowrap">
              Suggest
            </button>
          </div>
        </Field>
        <Field label="Type">
          <div className="flex gap-2 pt-1">
            {(['personal', 'service'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('contactType', t)}
                className={[
                  'flex-1 rounded-lg px-3 py-2 text-sm capitalize border',
                  form.contactType === t
                    ? 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/30 font-semibold'
                    : 'border-surface-ink/10 text-surface-ink',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Birthday">
          <input type="date" className={inputCls} value={form.birthday ?? ''} onChange={(e) => set('birthday', e.target.value || null)} />
        </Field>
        <Field label="Last contact">
          <input type="date" className={inputCls} value={form.lastContact ?? ''} onChange={(e) => set('lastContact', e.target.value || null)} />
        </Field>
        <Field label="Next follow-up">
          <input type="date" className={inputCls} value={form.nextFollowUp ?? ''} onChange={(e) => set('nextFollowUp', e.target.value || null)} />
        </Field>
      </div>

      <Field label={`Relationship score: ${form.relationshipScore}/5`}>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Set score ${n}`}
              onClick={() => set('relationshipScore', n)}
              className={[
                'w-8 h-8 rounded-full text-sm font-semibold',
                n <= form.relationshipScore ? 'bg-brand-coral text-white' : 'bg-surface-sunk text-surface-muted',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Tags">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.tags.map((t) => (
            <span key={t} className="chip">
              {t}
              <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className={inputCls}
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Type a tag and press Enter"
        />
      </Field>

      <Field label="Notes">
        <textarea className={`${inputCls} min-h-[80px]`} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? 'Saving…' : mode === 'create' ? 'Save contact' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function PhotoField({ photo, onPick, onClear }: { photo: string; onPick: (f: File) => void; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3">
      {photo ? (
        <img src={photo} alt="" className="w-14 h-14 rounded-full object-cover" />
      ) : (
        <span className="w-14 h-14 rounded-full bg-surface-sunk grid place-items-center text-surface-muted text-xs">Photo</span>
      )}
      <label className="btn-secondary !py-1.5 !text-xs cursor-pointer">
        {photo ? 'Change' : 'Add photo'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
        />
      </label>
      {photo && (
        <button type="button" onClick={onClear} className="text-xs text-surface-muted hover:text-red-600">
          Remove
        </button>
      )}
    </div>
  );
}

function LabeledList({
  title,
  items,
  defaultLabel,
  onChange,
}: {
  title: string;
  items: LabeledValue[];
  defaultLabel: string;
  onChange: (items: LabeledValue[]) => void;
}) {
  function update(i: number, patch: Partial<LabeledValue>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  return (
    <div>
      <span className={labelCls}>{title}</span>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={`${inputCls} w-28`}
              value={it.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Label"
            />
            <input
              className={inputCls}
              value={it.value}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder={title.includes('Email') ? 'name@example.com' : '(555) 555-5555'}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              aria-label="Remove"
              className="shrink-0 w-9 rounded-lg text-surface-muted hover:bg-surface-sunk"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, { label: defaultLabel, value: '' }])}
        className="mt-2 text-xs font-semibold text-brand-indigo"
      >
        + Add {title.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  );
}
