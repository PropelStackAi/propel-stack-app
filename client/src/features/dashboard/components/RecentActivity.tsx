import { useActivity } from '../api';

const KIND_DOT: Record<string, string> = {
  task: 'bg-brand-indigo',
  note: 'bg-brand-purple',
  contact: 'bg-brand-teal',
  expense: 'bg-brand-coral',
  habit: 'bg-emerald-500',
};

export function RecentActivity() {
  const { data } = useActivity();
  const items = data ?? [];

  return (
    <div className="card">
      <h2 className="font-display font-bold text-base text-surface-ink mb-3">Recent activity</h2>
      {items.length === 0 ? (
        <p className="text-sm text-surface-muted py-2 text-center">No activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5 text-sm">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${KIND_DOT[a.kind] ?? 'bg-surface-ink/30'}`} aria-hidden />
              <span className="flex-1 text-surface-ink">{a.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
