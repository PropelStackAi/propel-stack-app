// ─── Upcoming Birthdays & Anniversaries ──────────────────────────────────────
// Enhancement 19 — Propel Stack AI, LLC

import { useUpcomingEvents } from '../api';

function daysUntilLabel(days: number): string {
  if (days === 0) return 'Today! 🎉';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function urgencyColor(days: number): string {
  if (days <= 1)  return 'bg-red-50 border-red-100';
  if (days <= 7)  return 'bg-orange-50 border-orange-100';
  if (days <= 14) return 'bg-yellow-50 border-yellow-100';
  return 'bg-surface-raised border-surface-ink/10';
}

export function UpcomingTab(): JSX.Element {
  const { data, isLoading } = useUpcomingEvents();
  const upcoming = data?.upcoming ?? [];

  if (isLoading) return <p className="text-sm text-surface-muted text-center py-8">Loading…</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-surface-muted">Birthdays and anniversaries in the next 30 days.</p>

      {upcoming.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl">📅</p>
          <p className="text-sm text-surface-muted mt-2">No upcoming events in the next 30 days.</p>
          <p className="text-xs text-surface-muted">Add birthdays and anniversaries to contacts in the People tab.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((event) => (
            <div key={`${event.contact_id}-${event.event_type}`}
              className={`rounded-xl border p-3 flex items-center gap-3 ${urgencyColor(event.days_until)}`}>
              <span className="text-2xl flex-shrink-0">{event.event_type === 'Birthday' ? '🎂' : '💍'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-ink">
                  {event.name}'s {event.event_type}
                </p>
                <p className="text-xs text-surface-muted capitalize">
                  {event.relationship} · {event.date_this_year}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-xs font-bold ${event.days_until <= 1 ? 'text-red-600' : event.days_until <= 7 ? 'text-orange-600' : 'text-surface-muted'}`}>
                  {daysUntilLabel(event.days_until)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-surface-muted text-center pt-2">
        💡 AI gift ideas coming soon. All event data stays private — never shared or used in AI coaching.
      </p>
    </div>
  );
}
