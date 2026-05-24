// ─── People Tab — Contact List ────────────────────────────────────────────────
// Enhancement 19 — Propel Stack AI, LLC

import { useState } from 'react';
import {
  useRelationshipContacts, useCreateContact,
  useDeleteContact, useLogInteraction, useContactInteractions,
} from '../api';
import type { RelationshipContact, CheckinCadence, ContactMethod, StrengthLabel } from '../types';

const RELATIONSHIP_TYPES = ['family', 'friend', 'colleague', 'mentor', 'partner', 'neighbour', 'other'];
const CADENCES: { value: CheckinCadence; label: string; days: number }[] = [
  { value: 'weekly',    label: 'Weekly',    days: 7  },
  { value: 'monthly',   label: 'Monthly',   days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'custom',    label: 'Custom…',   days: 0  },
];
const METHODS: { value: ContactMethod; label: string; emoji: string }[] = [
  { value: 'call',       label: 'Called',     emoji: '📞' },
  { value: 'text',       label: 'Texted',     emoji: '💬' },
  { value: 'in_person',  label: 'Met up',     emoji: '🤝' },
  { value: 'email',      label: 'Emailed',    emoji: '✉️' },
  { value: 'video',      label: 'Video call', emoji: '📹' },
];
const EMOJIS = ['👤','👨','👩','👴','👵','🧑','👦','👧','🧔','👨‍💼','👩‍💼','🧑‍🎓','👨‍🏫','👩‍🏫'];

const STRENGTH_META: Record<StrengthLabel, { color: string; dot: string }> = {
  Warm:     { color: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  Active:   { color: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-400'   },
  Cooling:  { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  Distant:  { color: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400'   },
};

function QuickLog({ contact, onDone }: { contact: RelationshipContact; onDone: () => void }) {
  const log = useLogInteraction();
  const [method, setMethod] = useState<ContactMethod>('text');
  const [note, setNote] = useState('');

  function submit() {
    log.mutate({ contactId: contact.id, method, note }, { onSuccess: onDone });
  }

  return (
    <div className="mt-2 bg-surface-sunk rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-surface-muted">Quick log — how did you connect?</p>
      <div className="flex gap-1 flex-wrap">
        {METHODS.map((m) => (
          <button key={m.value} type="button" onClick={() => setMethod(m.value)}
            className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${method === m.value ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'}`}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (private)"
        className="w-full border border-surface-ink/10 rounded-lg px-2 py-1.5 text-xs" />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="text-xs text-surface-muted">Cancel</button>
        <button type="button" onClick={submit} disabled={log.isPending}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40">
          {log.isPending ? 'Saving…' : 'Log it ✓'}
        </button>
      </div>
    </div>
  );
}

function InteractionHistory({ contactId }: { contactId: string }) {
  const { data } = useContactInteractions(contactId);
  const interactions = data?.interactions ?? [];
  if (interactions.length === 0) return <p className="text-xs text-surface-muted italic">No interactions logged yet.</p>;
  const methodMeta = (m: string) => METHODS.find((x) => x.value === m) ?? { emoji: '💬', label: m };
  return (
    <div className="space-y-1">
      {interactions.slice(0, 5).map((i) => {
        const m = methodMeta(i.method);
        return (
          <div key={i.id} className="flex items-start gap-2 text-xs text-surface-muted">
            <span>{m.emoji}</span>
            <span className="flex-1">{m.label} · {i.occurred_on}</span>
          </div>
        );
      })}
    </div>
  );
}

function ContactCard({ contact }: { contact: RelationshipContact }) {
  const del = useDeleteContact();
  const [expanded, setExpanded] = useState(false);
  const [logging, setLogging] = useState(false);
  const meta = STRENGTH_META[contact.strength];

  function friendlyOverdue() {
    if (contact.days_overdue === 0) {
      if (contact.days_since_contact === Infinity || !contact.last_contact) return 'Never contacted';
      return `Last: ${contact.last_contact}`;
    }
    return `${contact.days_overdue}d overdue`;
  }

  return (
    <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-sunk flex items-center justify-center text-xl flex-shrink-0">
          {contact.photo_emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-surface-ink">{contact.name}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>{contact.strength}</span>
          </div>
          <p className="text-[10px] text-surface-muted capitalize">
            {contact.relationship} · {CADENCES.find((c) => c.value === contact.checkin_cadence)?.label ?? contact.checkin_cadence} check-in · {friendlyOverdue()}
          </p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => { setLogging(!logging); setExpanded(false); }}
            className="text-xs bg-brand-teal/10 text-brand-teal px-2 py-1 rounded-lg font-semibold hover:bg-brand-teal/20">
            Log
          </button>
          <button type="button" onClick={() => { setExpanded(!expanded); setLogging(false); }}
            className="text-xs text-surface-muted hover:text-surface-ink px-1">
            {expanded ? '▲' : '▼'}
          </button>
          <button type="button" onClick={() => del.mutate(contact.id)}
            className="text-xs text-surface-muted hover:text-red-500 px-1">✕</button>
        </div>
      </div>

      {logging && <QuickLog contact={contact} onDone={() => setLogging(false)} />}

      {expanded && (
        <div className="border-t border-surface-ink/10 pt-2 space-y-2">
          {contact.notes && <p className="text-xs text-surface-muted italic">"{contact.notes}"</p>}
          {(contact.birthday || contact.anniversary) && (
            <div className="flex gap-3 text-xs text-surface-muted">
              {contact.birthday    && <span>🎂 {contact.birthday}</span>}
              {contact.anniversary && <span>💍 {contact.anniversary}</span>}
            </div>
          )}
          <InteractionHistory contactId={contact.id} />
        </div>
      )}
    </div>
  );
}

export function PeopleTab(): JSX.Element {
  const { data } = useRelationshipContacts();
  const create = useCreateContact();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [rel, setRel] = useState('friend');
  const [cadence, setCadence] = useState<CheckinCadence>('monthly');
  const [customDays, setCustomDays] = useState('14');
  const [birthday, setBirthday] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [emoji, setEmoji] = useState('👤');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const contacts = data?.contacts ?? [];
  const filtered = filter === 'all' ? contacts : contacts.filter((c) => c.relationship === filter);

  function submit() {
    if (!name) return;
    create.mutate({
      name, relationship: rel as RelationshipContact['relationship'],
      checkin_cadence: cadence,
      cadence_days: cadence === 'custom' ? Number(customDays) : CADENCES.find((c) => c.value === cadence)!.days,
      birthday: birthday || undefined,
      anniversary: anniversary || undefined,
      photo_emoji: emoji,
      notes,
    }, {
      onSuccess: () => { setShowForm(false); setName(''); setNotes(''); setBirthday(''); setAnniversary(''); },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Relationship filter */}
        <div className="flex gap-1 overflow-x-auto">
          {(['all', ...RELATIONSHIP_TYPES.slice(0, 4)] as const).map((r) => (
            <button key={r} type="button" onClick={() => setFilter(r)}
              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-xl font-semibold capitalize ${filter === r ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'}`}>
              {r} {r === 'all' ? `(${contacts.length})` : `(${contacts.filter(c=>c.relationship===r).length})`}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold flex-shrink-0">
          + Add person
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add to your close circle</p>
          {/* Emoji picker */}
          <div className="flex gap-1 flex-wrap">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setEmoji(e)}
                className={`text-lg w-9 h-9 rounded-lg ${emoji === e ? 'bg-brand-teal/10 ring-2 ring-brand-teal' : 'bg-surface-sunk'}`}>{e}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm col-span-2" />
            <select value={rel} onChange={(e) => setRel(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              {RELATIONSHIP_TYPES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
            <select value={cadence} onChange={(e) => setCadence(e.target.value as CheckinCadence)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              {CADENCES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {cadence === 'custom' && (
              <input value={customDays} onChange={(e) => setCustomDays(e.target.value)} type="number" min="1" placeholder="Days between check-ins"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm col-span-2" />
            )}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Birthday (optional)</label>
              <input value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Anniversary (optional)</label>
              <input value={anniversary} onChange={(e) => setAnniversary(e.target.value)} type="date"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes (optional)" rows={2}
              className="w-full resize-none border border-surface-ink/10 rounded-lg px-3 py-2 text-sm col-span-2" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Adding…' : 'Add to circle'}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-2xl">👥</p>
          <p className="text-sm text-surface-muted mt-2">{contacts.length === 0 ? 'Your close circle is empty.' : 'No contacts in this category.'}</p>
          <p className="text-xs text-surface-muted">Add the people who matter most — up to 50 in your close circle.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => <ContactCard key={c.id} contact={c} />)}
        </div>
      )}
    </div>
  );
}
