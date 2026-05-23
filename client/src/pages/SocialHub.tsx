// ─── Social & Media Hub ─────────────────────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import { useState } from 'react';
import { useSocialStats, useSocialConnections } from '../features/social/api';
import { DisclaimerBanner } from '../features/social/components/DisclaimerBanner';
import { SocialConnect } from '../features/social/components/SocialConnect';
import { UnifiedFeed } from '../features/social/components/UnifiedFeed';
import { NotificationInbox } from '../features/social/components/NotificationInbox';
import { SocialDigest } from '../features/social/components/SocialDigest';
import { Watchlist } from '../features/social/components/Watchlist';
import { NewsHub } from '../features/social/components/NewsHub';
import { StreamingHub } from '../features/social/components/StreamingHub';
import { ContentCalendar } from '../features/social/components/ContentCalendar';
import { ScreenTime } from '../features/social/components/ScreenTime';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { HubStats } from '../features/social/types';

type HubTab =
  | 'connect' | 'feed' | 'inbox' | 'digest'
  | 'watchlist' | 'news' | 'media' | 'calendar' | 'screen';

const HUB_TABS: { id: HubTab; label: string; emoji: string }[] = [
  { id: 'connect',   label: 'Accounts',   emoji: '🔗' },
  { id: 'feed',      label: 'Feed',        emoji: '📰' },
  { id: 'inbox',     label: 'Inbox',       emoji: '📬' },
  { id: 'digest',    label: 'AI Digest',   emoji: '🤖' },
  { id: 'watchlist', label: 'Watchlist',   emoji: '👁️' },
  { id: 'news',      label: 'News',        emoji: '🗞️' },
  { id: 'media',     label: 'Streaming',   emoji: '🎬' },
  { id: 'calendar',  label: 'Calendar',    emoji: '📅' },
  { id: 'screen',    label: 'Screen Time', emoji: '⏱️' },
];

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl px-4 py-3 text-center">
      <div className="text-lg font-bold text-surface-ink">{value}</div>
      <div className="text-xs text-surface-muted mt-0.5">{label}</div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function HubHome({ stats }: { stats: HubStats }) {
  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Connections" value={stats.total_connections} />
        <KpiCard label="Unread" value={stats.unread_notifications} />
        <KpiCard label="Upcoming Posts" value={stats.todays_posts} />
      </div>

      {/* 7-day sparkline */}
      <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4">
        <p className="text-xs font-semibold text-surface-muted mb-3">7-Day Activity</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={stats.sparkline} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={{ fontSize: 11 }}
              formatter={(v, name) => [v as number, (name as string) === 'posts' ? 'Posts' : 'Interactions']}
            />
            <Bar dataKey="posts" fill="#0d9488" radius={[2, 2, 0, 0]} />
            <Bar dataKey="interactions" fill="#6366f1" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1 text-[10px] text-surface-muted"><span className="w-2 h-2 rounded-sm bg-brand-teal inline-block" />Posts</span>
          <span className="flex items-center gap-1 text-[10px] text-surface-muted"><span className="w-2 h-2 rounded-sm bg-indigo-400 inline-block" />Interactions</span>
        </div>
      </div>

      {/* Screen time summary */}
      {stats.weekly_screen_time_seconds > 0 && (
        <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-surface-muted">Weekly screen time</span>
          <span className="text-sm font-semibold text-surface-ink">{formatTime(stats.weekly_screen_time_seconds)}</span>
        </div>
      )}
    </div>
  );
}

export function SocialHub(): JSX.Element {
  const [tab, setTab] = useState<HubTab>('connect');
  const [dismissed, setDismissed] = useState(false);
  const { data: stats, isLoading: statsLoading } = useSocialStats();
  const { data: connections } = useSocialConnections();

  const connectionCount = connections?.length ?? 0;

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
            📡 Social &amp; Media Hub
          </h2>
          <p className="text-xs text-surface-muted">
            {connectionCount > 0
              ? `${connectionCount} platform${connectionCount !== 1 ? 's' : ''} connected`
              : 'Connect your social accounts to get started'}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <DisclaimerBanner
        dismissedAt={dismissed ? 'dismissed' : null}
        onDismissed={() => setDismissed(true)}
      />

      {/* Hub stats (home overview) */}
      {!statsLoading && stats && connectionCount > 0 && (
        <HubHome stats={stats} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {HUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all',
              tab === t.id
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink hover:bg-surface-sunk',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'connect'   && <SocialConnect />}
        {tab === 'feed'      && <UnifiedFeed />}
        {tab === 'inbox'     && <NotificationInbox />}
        {tab === 'digest'    && <SocialDigest />}
        {tab === 'watchlist' && <Watchlist />}
        {tab === 'news'      && <NewsHub />}
        {tab === 'media'     && <StreamingHub />}
        {tab === 'calendar'  && <ContentCalendar />}
        {tab === 'screen'    && <ScreenTime />}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI, LLC · Social &amp; Media Hub · PSAI-SMH-DISC-v1.0 ·
        AI content is for informational purposes — always verify from primary sources.
      </p>
    </div>
  );
}
