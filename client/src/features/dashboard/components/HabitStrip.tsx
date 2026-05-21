import { useState } from 'react';
import { useAddHabit, useDeleteHabit, useHabits, useToggleHabit } from '../api';

export function HabitStrip() {
  const { data } = useHabits();
  const add = useAddHabit();
  const toggle = useToggleHabit();
  const remove = useDeleteHabit();
  const [name, setName] = useState('');
  const habits = data ?? [];

  function addHabit() {
    if (!name.trim()) return;
    add.mutate(name.trim(), { onSuccess: () => setName('') });
  }

  return (
    <div className="card">
      <h2 className="font-display font-bold text-base text-surface-ink mb-3">Daily habits</h2>
      {habits.length === 0 ? (
        <p className="text-sm text-surface-muted mb-3">No habits yet. Add one to start a streak.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {habits.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => toggle.mutate(h.id)}
              onContextMenu={(e) => { e.preventDefault(); remove.mutate(h.id); }}
              title="Click to toggle today · right-click to delete"
              className={[
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border transition-colors',
                h.completedToday
                  ? 'bg-brand-teal/10 border-brand-teal/30 text-brand-teal font-semibold'
                  : 'border-surface-ink/10 text-surface-ink hover:bg-surface-sunk',
              ].join(' ')}
            >
              <span className={`w-3.5 h-3.5 rounded-full grid place-items-center text-[9px] ${h.completedToday ? 'bg-brand-teal text-white' : 'border border-surface-ink/20'}`}>
                {h.completedToday ? '✓' : ''}
              </span>
              {h.name}
              {h.streak > 0 && <span className="text-xs">🔥{h.streak}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addHabit(); }}
          placeholder="New habit…"
          className="flex-1 rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-1.5 text-sm focus:outline-none"
        />
        <button type="button" onClick={addHabit} className="btn-secondary !py-1.5 !text-xs">Add</button>
      </div>
    </div>
  );
}
