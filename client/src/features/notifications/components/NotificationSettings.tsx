// ─── Notification Settings ────────────────────────────────────────────────────
// Enhancement 17 — Propel Stack AI, LLC

import { useNotificationPreferences, useUpdatePreference, useBestWindow } from '../api';

const GROUP_LABELS: Record<string, string> = {
  streak:   '⚡ Streak Alerts',
  recap:    '📋 Weekly Recap',
  nudge:    '👋 Check-in Nudges',
  coach:    '🎯 Coaching Alerts',
  reminder: '💡 Spending Reminders',
};

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return `${hour}:00 ${ampm}`;
}

export function NotificationSettings(): JSX.Element {
  const { data: prefData, isLoading } = useNotificationPreferences();
  const { data: windowData } = useBestWindow();
  const update = useUpdatePreference();

  const preferences = prefData?.preferences ?? [];

  // Group by notif_type
  const groups = preferences.reduce<Record<string, typeof preferences>>((acc, p) => {
    if (!acc[p.notif_type]) acc[p.notif_type] = [];
    acc[p.notif_type].push(p);
    return acc;
  }, {});

  if (isLoading) {
    return <p className="text-sm text-surface-muted text-center py-8">Loading settings…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Adaptive Timing Card */}
      {windowData && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-surface-ink">🧠 Adaptive Timing</p>
          {windowData.has_data ? (
            <p className="text-xs text-surface-muted">
              Based on your engagement history, your best notification window is around{' '}
              <strong className="text-surface-ink">{formatHour(windowData.best_hour)}</strong>.
              {windowData.open_rate !== null && (
                <> Open rate: <strong className="text-brand-teal">{Math.round(windowData.open_rate * 100)}%</strong>.</>
              )}
            </p>
          ) : (
            <p className="text-xs text-surface-muted">
              After 14 days of data, nudges will automatically shift to your most responsive time window. Default: 9:00 am.
            </p>
          )}
        </div>
      )}

      {/* Fatigue Rules Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
        <p className="text-xs font-semibold text-blue-800">Fatigue Protection — Always On</p>
        <ul className="text-[11px] text-blue-700 space-y-0.5">
          <li>• Max 3 notifications per day</li>
          <li>• Quiet hours: 10pm – 7am (your local time)</li>
          <li>• Same alert waits 72 hours before repeating</li>
          <li>• Low engagement? Auto-drops to 1/day</li>
        </ul>
      </div>

      {/* Per-type toggles, grouped */}
      {Object.entries(groups).map(([type, prefs]) => (
        <div key={type} className="space-y-2">
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">
            {GROUP_LABELS[type] ?? type}
          </p>
          {prefs.map((pref) => (
            <div
              key={pref.key}
              className="flex items-center justify-between gap-3 bg-surface-raised border border-surface-ink/10 rounded-xl px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-ink font-medium">{pref.label}</p>
                {pref.mental_health && (
                  <p className="text-[10px] text-surface-muted mt-0.5">
                    🔒 Privacy-sensitive · Opt-in only · Never shown to others
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => update.mutate({ trigger_key: pref.key, enabled: !pref.enabled })}
                disabled={update.isPending}
                className={[
                  'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
                  pref.enabled ? 'bg-brand-teal' : 'bg-gray-200',
                ].join(' ')}
                role="switch"
                aria-checked={pref.enabled}
              >
                <span
                  className={[
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200',
                    pref.enabled ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </div>
          ))}
        </div>
      ))}

      <p className="text-[10px] text-surface-muted text-center pb-4">
        Propel Stack AI · Notification settings apply only to in-app nudges. Mental health data is never shared or used outside this tool.
      </p>
    </div>
  );
}
