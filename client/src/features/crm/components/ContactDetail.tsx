import { useState } from 'react';
import { useContact, useDeleteContact } from '../api';
import {
  CATEGORY_ACCENT,
  displayName,
  initials,
  type ContactWithInteractions,
  type LabeledValue,
} from '../types';
import { InteractionLog } from './InteractionLog';

function overdue(date: string | null): boolean {
  return Boolean(date) && (date as string) <= new Date().toISOString().slice(0, 10);
}

export function ContactDetail({
  contactId,
  onEdit,
  onDeleted,
}: {
  contactId: string;
  onEdit: (contact: ContactWithInteractions) => void;
  onDeleted: () => void;
}) {
  const { data: contact, isLoading, isError } = useContact(contactId);
  const del = useDeleteContact();
  const [confirming, setConfirming] = useState(false);

  if (isLoading) return <div className="card text-sm text-surface-muted">Loading contact…</div>;
  if (isError || !contact) return <div className="card text-sm text-red-600">Could not load this contact.</div>;

  const accent = CATEGORY_ACCENT[contact.category];

  function handleDelete() {
    del.mutate(contactId, { onSuccess: onDeleted });
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex items-start gap-4">
          {contact.photo ? (
            <img src={contact.photo} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <span className="w-16 h-16 rounded-full bg-brand-indigo/10 text-brand-indigo grid place-items-center text-lg font-bold" aria-hidden>
              {initials(contact)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-extrabold text-2xl text-surface-ink truncate">{displayName(contact)}</h2>
            {(contact.title || contact.company) && (
              <p className="text-surface-muted">{[contact.title, contact.company].filter(Boolean).join(' · ')}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`chip ring-1 border-transparent ${accent.chip}`}>{contact.category}</span>
              <span className="chip text-surface-muted capitalize">{contact.contactType}</span>
              <ScoreDots score={contact.relationshipScore} />
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button type="button" onClick={() => onEdit(contact)} className="btn-secondary !py-1.5 !text-xs">
              Edit
            </button>
            {confirming ? (
              <div className="flex gap-1">
                <button type="button" onClick={handleDelete} disabled={del.isPending} className="btn-accent !py-1.5 !px-3 !text-xs bg-red-600">
                  Confirm
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="btn-secondary !py-1.5 !px-3 !text-xs">
                  No
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="text-xs text-surface-muted hover:text-red-600">
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ContactLinks label="Phone" items={contact.phones} hrefPrefix="tel:" />
          <ContactLinks label="Email" items={contact.emails} hrefPrefix="mailto:" />
          {contact.website && (
            <Detail label="Website">
              <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-brand-indigo break-all">
                {contact.website}
              </a>
            </Detail>
          )}
          {contact.address && <Detail label="Address">{contact.address}</Detail>}
          {contact.birthday && <Detail label="Birthday">{contact.birthday}</Detail>}
          {contact.lastContact && <Detail label="Last contact">{contact.lastContact}</Detail>}
          {contact.nextFollowUp && (
            <Detail label="Next follow-up">
              <span className={overdue(contact.nextFollowUp) ? 'text-red-600 font-semibold' : ''}>
                {contact.nextFollowUp}
                {overdue(contact.nextFollowUp) ? ' (overdue)' : ''}
              </span>
            </Detail>
          )}
          {contact.howMet && <Detail label="How we met">{contact.howMet}</Detail>}
        </div>

        {contact.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {contact.tags.map((t) => (
              <span key={t} className="chip text-surface-muted">
                #{t}
              </span>
            ))}
          </div>
        )}

        {contact.notes && (
          <div className="mt-4">
            <Detail label="Notes">
              <span className="whitespace-pre-wrap">{contact.notes}</span>
            </Detail>
          </div>
        )}
      </div>

      <div className="card">
        <InteractionLog contactId={contactId} interactions={contact.interactions} />
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-surface-muted font-semibold">{label}</div>
      <div className="text-sm text-surface-ink mt-0.5">{children}</div>
    </div>
  );
}

function ContactLinks({ label, items, hrefPrefix }: { label: string; items: LabeledValue[]; hrefPrefix: string }) {
  const valid = items.filter((i) => i.value.trim());
  if (valid.length === 0) return null;
  return (
    <Detail label={label}>
      <ul className="space-y-0.5">
        {valid.map((i, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <a href={`${hrefPrefix}${i.value}`} className="text-brand-indigo break-all">
              {i.value}
            </a>
            {i.label && <span className="text-xs text-surface-muted">({i.label})</span>}
          </li>
        ))}
      </ul>
    </Detail>
  );
}

function ScoreDots({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Relationship ${score}/5`} aria-label={`Relationship score ${score} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`w-1.5 h-1.5 rounded-full ${n <= score ? 'bg-brand-coral' : 'bg-surface-ink/15'}`} aria-hidden />
      ))}
    </span>
  );
}
