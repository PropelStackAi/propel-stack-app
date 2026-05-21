import { useSummary } from '../api';
import { money } from '../../financial/format';

export function StatsRow() {
  const { data } = useSummary();
  const cards = [
    { label: 'Tasks done this week', value: String(data?.tasksCompletedThisWeek ?? 0) },
    { label: 'Net worth', value: money(data?.netWorth ?? 0) },
    { label: 'AI tokens this month', value: (data?.aiTokensUsed ?? 0).toLocaleString() },
    { label: 'Contacts this month', value: String(data?.contactsAddedThisMonth ?? 0) },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card">
          <div className="text-[11px] uppercase tracking-wider text-surface-muted font-semibold">{c.label}</div>
          <div className="mt-1 font-display font-bold text-2xl text-surface-ink">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
