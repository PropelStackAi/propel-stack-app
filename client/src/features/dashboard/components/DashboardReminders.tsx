import { useBirthdays, useFollowUps } from '../../crm/api';
import { displayName } from '../../crm/types';

export function DashboardReminders() {
  const birthdays = useBirthdays();
  const followUps = useFollowUps();

  const upcoming = (birthdays.data ?? []).filter((b) => b.daysUntil <= 7);
  const overdue = followUps.data ?? [];

  return (
    <div className="card">
      <h2 className="font-display font-bold text-base text-surface-ink mb-3">Reminders</h2>

      <div className="text-[11px] uppercase tracking-wider text-surface-muted font-semibold">Birthdays (next 7 days)</div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-surface-muted mt-1">None this week.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {upcoming.map(({ contact, daysUntil }) => (
            <li key={contact.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{displayName(contact)}</span>
              <span className="text-xs text-brand-coral">{daysUntil === 0 ? 'Today!' : `in ${daysUntil}d`}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="text-[11px] uppercase tracking-wider text-surface-muted font-semibold mt-4">Overdue follow-ups</div>
      {overdue.length === 0 ? (
        <p className="text-sm text-surface-muted mt-1">All caught up.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {overdue.map((c) => (
            <li key={c.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{displayName(c)}</span>
              <span className="text-xs text-red-600">{c.nextFollowUp}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
