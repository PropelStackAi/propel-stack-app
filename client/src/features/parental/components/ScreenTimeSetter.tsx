import { useState } from 'react';
import type { ChildProfile } from '../types';
import { useChildScreenTime, useUpdateChild } from '../api';

interface Props {
  child: ChildProfile;
}

function fmt(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function ScreenTimeSetter({ child }: Props): JSX.Element {
  const [limit, setLimit] = useState(child.screen_time_limit_minutes);
  const update = useUpdateChild();
  const { data: status } = useChildScreenTime(child.id);

  const pct = status ? Math.min(100, (status.usedMinutes / status.limitMinutes) * 100) : 0;
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-purple';

  function save() {
    update.mutate({ id: child.id, body: { screenTimeLimitMinutes: limit } });
  }

  return (
    <div className="space-y-5">
      {/* Today's usage */}
      {status && (
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold text-surface-ink">Today's usage</span>
            <span className="text-surface-muted">
              {fmt(status.usedMinutes)} of {fmt(status.limitMinutes)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-surface-sunk overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {!status.allowed && (
            <p className="text-xs text-red-600 mt-1 font-semibold">
              ⛔ Daily limit reached — Kids Zone is locked.
            </p>
          )}
        </div>
      )}

      {/* Limit slider */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-semibold text-surface-ink">Daily limit</label>
          <span className="text-brand-purple font-bold text-sm">{fmt(limit)}</span>
        </div>
        <input
          type="range"
          min={15}
          max={240}
          step={15}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="w-full accent-brand-purple"
        />
        <div className="flex justify-between text-xs text-surface-muted mt-0.5">
          <span>15 min</span><span>2 hr</span><span>4 hr</span>
        </div>
      </div>

      <button
        onClick={save}
        disabled={update.isPending || limit === child.screen_time_limit_minutes}
        className="w-full btn bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50 text-sm"
      >
        {update.isPending ? 'Saving…' : 'Save limit'}
      </button>

      <p className="text-xs text-surface-muted">
        Screen time resets daily at midnight. When the limit is reached, Kids Zone shows a lock
        screen that only a parent can dismiss with their override PIN.
      </p>
    </div>
  );
}
