import {
  CATEGORY_ACCENT,
  displayName,
  initials,
  type Contact,
} from '../types';

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return date <= new Date().toISOString().slice(0, 10);
}

export function ContactCard({
  contact,
  active,
  onSelect,
}: {
  contact: Contact;
  active: boolean;
  onSelect: () => void;
}) {
  const accent = CATEGORY_ACCENT[contact.category];
  const subtitle = [contact.title, contact.company].filter(Boolean).join(' · ');
  const overdue = isOverdue(contact.nextFollowUp);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={[
        'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
        active ? 'bg-brand-indigo/10 ring-1 ring-brand-indigo/20' : 'hover:bg-surface-sunk',
      ].join(' ')}
    >
      <Avatar contact={contact} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-surface-ink truncate">{displayName(contact)}</span>
          {overdue && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-red-600" title="Follow-up overdue">
              ● due
            </span>
          )}
        </div>
        {subtitle && <div className="text-xs text-surface-muted truncate">{subtitle}</div>}
      </div>
      <span className={`shrink-0 inline-block w-2 h-2 rounded-full ${accent.dot}`} aria-hidden title={contact.category} />
    </button>
  );
}

function Avatar({ contact }: { contact: Contact }) {
  if (contact.photo) {
    return (
      <img
        src={contact.photo}
        alt=""
        className="w-9 h-9 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <span
      className="w-9 h-9 rounded-full bg-brand-indigo/10 text-brand-indigo grid place-items-center text-xs font-bold shrink-0"
      aria-hidden
    >
      {initials(contact)}
    </span>
  );
}
