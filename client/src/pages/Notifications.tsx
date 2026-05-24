// ─── Smart Notification Intelligence — Page ───────────────────────────────────
// Enhancement 17 — Propel Stack AI, LLC

import { useState } from 'react';
import { NotificationFeed } from '../features/notifications/components/NotificationFeed';
import { NotificationSettings } from '../features/notifications/components/NotificationSettings';

type Tab = 'feed' | 'settings';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'feed',     label: 'Inbox',    emoji: '🔔' },
  { id: 'settings', label: 'Settings', emoji: '⚙️' },
];

export function Notifications(): JSX.Element {
  const [tab, setTab] = useState<Tab>('feed');

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          🔔 Smart Notifications
        </h2>
        <p className="text-xs text-surface-muted">
          Contextual nudges that adapt to when you're most responsive. Never spam — always relevant.
        </p>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              tab === t.id
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'feed'     && <NotificationFeed />}
        {tab === 'settings' && <NotificationSettings />}
      </div>
    </div>
  );
}
