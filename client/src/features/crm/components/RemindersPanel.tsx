import { useBirthdays, useFollowUps } from '../api';
import { displayName } from '../types';

export function RemindersPanel({ onSelect }: { onSelect: (id: string) => void }) {
  const followUps = useFollowUps();
  const birthdays = useBirthdays();

  const overdue = followUps.data ?? [];
  const upcoming = birthdays.data ?? [];

  if (overdue.length === 0 && upcoming.length === 0) return null;

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <section className="card border-red-500/20 bg-red-500/[0.03] p-4">
          <h3 className="font-display font-bold text-sm text-red-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" aria-hidden /> Overdue follow-ups ({overdue.length})
          </h3>
          <ul className="mt-2 space-y-1">
            {overdue.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="w-full text-left text-sm text-surface-ink hover:text-red-700 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{displayName(c)}</span>
                  <span className="shrink-0 text-xs text-red-600 font-medium">{c.nextFollowUp}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="card p-4">
          <h3 className="font-display font-bold text-sm text-surface-ink flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-coral" aria-hidden /> Upcoming birthdays
          </h3>
          <ul className="mt-2 space-y-1">
            {upcoming.map(({ contact, daysUntil }) => (
              <li key={contact.id}>
                <button
                  type="button"
                  onClick={() => onSelect(contact.id)}
                  className="w-full text-left text-sm text-surface-ink hover:text-brand-coral flex items-center justify-between gap-2"
                >
                  <span className="truncate">{displayName(contact)}</span>
                  <span className="shrink-0 text-xs text-surface-muted">
                    {daysUntil === 0 ? 'Today!' : `in ${daysUntil}d`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
