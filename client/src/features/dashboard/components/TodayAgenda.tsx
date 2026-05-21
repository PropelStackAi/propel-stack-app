import { useAgenda, useToggleTask } from '../api';
import { money } from '../../financial/format';

function isOverdue(date: string | null): boolean {
  return Boolean(date) && (date as string) < new Date().toISOString().slice(0, 10);
}

export function TodayAgenda() {
  const { data } = useAgenda();
  const toggle = useToggleTask();
  const tasks = data?.tasks ?? [];
  const bills = data?.bills ?? [];
  const empty = tasks.length === 0 && bills.length === 0;

  return (
    <div className="card">
      <h2 className="font-display font-bold text-base text-surface-ink mb-3">Today&apos;s agenda</h2>
      {empty ? (
        <p className="text-sm text-surface-muted py-3 text-center">Nothing due. Enjoy the clear runway.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!t.completedAt} onChange={() => toggle.mutate(t.id)} className="w-4 h-4 accent-brand-indigo" aria-label={`Complete ${t.title}`} />
              <span className="flex-1 truncate text-surface-ink">{t.title}</span>
              {t.dueDate && <span className={`text-xs ${isOverdue(t.dueDate) ? 'text-red-600 font-semibold' : 'text-surface-muted'}`}>{isOverdue(t.dueDate) ? 'overdue' : 'today'}</span>}
            </li>
          ))}
          {bills.map((b) => (
            <li key={b.id} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-coral" aria-hidden />
              <span className="flex-1 truncate text-surface-ink">{b.name}</span>
              <span className="text-xs text-surface-muted">{money(b.amount, true)}</span>
              <span className={`text-xs ${isOverdue(b.dueDate) ? 'text-red-600 font-semibold' : 'text-surface-muted'}`}>bill</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
