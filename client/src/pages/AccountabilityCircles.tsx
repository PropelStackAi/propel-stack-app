/**
 * Enhancement 42 — Life Score Social & Accountability Circles
 * Propel Stack AI, LLC
 *
 * PRIVACY: Only composite Life Score trend direction shown (up/down/flat).
 * Never raw sub-scores.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Circle {
  id: string;
  name: string;
  invite_code: string;
  role: string;
  member_count: number;
}

interface Member {
  user_id: string;
  display_name: string;
  role: string;
  share_streaks: boolean;
  joined_at: string;
  is_self?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  top_streak_days: number | null;
  streak_type: string | null;
  is_self: boolean;
}

interface CircleFeed {
  encouragement_message: string;
  week_start: string;
  feed_data?: { highlights?: string[] };
}

export function AccountabilityCircles() {
  const qc = useQueryClient();
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [view, setView] = useState<'circles' | 'leaderboard' | 'feed' | 'members'>('circles');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [nudgeTo, setNudgeTo] = useState('');
  const [nudgeMsg, setNudgeMsg] = useState('Cheering you on! 🎉');

  const { data: circles = [] } = useQuery<Circle[]>({
    queryKey: ['circles'],
    queryFn: () => apiRequest<Circle[]>('/api/circles'),
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ['circle-leaderboard', selectedCircleId],
    queryFn: () => apiRequest<LeaderboardEntry[]>(`/api/circles/${selectedCircleId}/leaderboard`),
    enabled: !!selectedCircleId && view === 'leaderboard',
  });

  const { data: feed } = useQuery<CircleFeed>({
    queryKey: ['circle-feed', selectedCircleId],
    queryFn: () => apiRequest<CircleFeed>(`/api/circles/${selectedCircleId}/feed`),
    enabled: !!selectedCircleId && view === 'feed',
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['circle-members', selectedCircleId],
    queryFn: () => apiRequest<Member[]>(`/api/circles/${selectedCircleId}/members`),
    enabled: !!selectedCircleId && view === 'members',
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => apiRequest<{ id: string; invite_code: string; invite_link: string }>('/api/circles', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['circles'] });
      setShowCreate(false);
      setCircleName('');
      alert(`Circle created! Invite link: ${data.invite_link}`);
    },
  });

  const joinMutation = useMutation({
    mutationFn: (code: string) => apiRequest(`/api/circles/join/${code}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['circles'] });
      setShowJoin(false);
      setJoinCode('');
    },
  });

  const nudgeMutation = useMutation({
    mutationFn: ({ to, msg }: { to: string; msg: string }) =>
      apiRequest(`/api/circles/${selectedCircleId}/nudge`, { method: 'POST', body: JSON.stringify({ to_user_id: to, message: msg }) }),
    onSuccess: () => { setNudgeTo(''); },
  });

  const selectedCircle = circles.find(c => c.id === selectedCircleId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Accountability Circles</h1>
          <p className="text-surface-muted text-sm mt-1">Private groups of 2–8 people sharing Life Score trends, streaks, and weekly wins.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(s => !s)} className="btn-secondary text-sm">Join Circle</button>
          <button onClick={() => setShowCreate(s => !s)} className="btn-primary text-sm">+ Create Circle</button>
        </div>
      </div>

      {showCreate && (
        <div className="card border-brand-indigo/30">
          <h3 className="font-semibold text-surface-ink mb-3">New Accountability Circle</h3>
          <input className="input mb-3" placeholder="Circle name (e.g. The Grind Squad)" value={circleName} onChange={e => setCircleName(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(circleName)} disabled={!circleName.trim() || createMutation.isPending} className="btn-primary text-sm">
              {createMutation.isPending ? 'Creating…' : 'Create & Get Invite Link'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
          {createMutation.isError && <p className="text-red-500 text-sm mt-2">{(createMutation.error as any)?.message ?? 'Plan limit reached — upgrade to create more circles.'}</p>}
        </div>
      )}

      {showJoin && (
        <div className="card border-brand-teal/30">
          <h3 className="font-semibold text-surface-ink mb-3">Join a Circle</h3>
          <input className="input mb-3 uppercase" placeholder="Enter invite code (e.g. ABC123DEF456)" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={12} />
          <div className="flex gap-2">
            <button onClick={() => joinMutation.mutate(joinCode)} disabled={joinCode.length < 6 || joinMutation.isPending} className="btn-primary text-sm">
              {joinMutation.isPending ? 'Joining…' : 'Join Circle'}
            </button>
            <button onClick={() => setShowJoin(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {circles.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium text-surface-ink">No circles yet</p>
          <p className="text-sm text-surface-muted mt-1">Create a circle and invite your closest friends to share your Life Score journey.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {circles.map(c => (
            <div
              key={c.id}
              onClick={() => { setSelectedCircleId(c.id); setView('leaderboard'); }}
              className={`card cursor-pointer transition-all hover:shadow-raised ${selectedCircleId === c.id ? 'ring-2 ring-brand-indigo' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-semibold text-surface-ink">{c.name}</div>
                <span className="chip text-xs capitalize">{c.role}</span>
              </div>
              <div className="text-sm text-surface-muted">{c.member_count} member{c.member_count !== 1 ? 's' : ''}</div>
              <div className="text-xs text-surface-muted mt-1 font-mono">{c.invite_code}</div>
              {selectedCircleId === c.id && (
                <div className="flex gap-1 mt-3 flex-wrap">
                  {(['leaderboard', 'feed', 'members'] as const).map(v => (
                    <button key={v} onClick={e => { e.stopPropagation(); setView(v); }} className={`text-xs px-2 py-1 rounded-md ${view === v ? 'bg-brand-indigo text-white' : 'bg-surface-sunk text-surface-muted'}`}>
                      {v === 'leaderboard' ? '🏆 Board' : v === 'feed' ? '📰 Feed' : '👥 Members'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedCircleId && view === 'leaderboard' && (
        <div className="card">
          <h2 className="font-semibold text-surface-ink mb-4">🏆 Streak Leaderboard — {selectedCircle?.name}</h2>
          <div className="space-y-2">
            {leaderboard.map(entry => (
              <div key={entry.rank} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${entry.is_self ? 'bg-brand-indigo/5 border border-brand-indigo/20' : 'bg-surface-sunk'}`}>
                <div className="text-lg font-bold text-surface-muted w-6">#{entry.rank}</div>
                <div className="flex-1">
                  <span className="font-medium text-surface-ink">{entry.display_name}</span>
                  {entry.is_self && <span className="text-xs text-brand-indigo ml-2">(you)</span>}
                </div>
                {entry.top_streak_days !== null ? (
                  <div className="text-right">
                    <div className="font-semibold text-surface-ink">{entry.top_streak_days}d</div>
                    <div className="text-xs text-surface-muted capitalize">{entry.streak_type?.replace(/_/g, ' ')}</div>
                  </div>
                ) : (
                  <div className="text-xs text-surface-muted">Private</div>
                )}
              </div>
            ))}
            {leaderboard.length === 0 && <p className="text-sm text-surface-muted text-center py-4">No streak data yet. Start building streaks!</p>}
          </div>

          {/* Nudge panel */}
          {members.length > 0 && (
            <div className="mt-4 border-t border-surface-ink/[0.06] pt-4">
              <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">Send a Nudge</div>
              <div className="flex gap-2">
                <select className="input flex-1" value={nudgeTo} onChange={e => setNudgeTo(e.target.value)}>
                  <option value="">Select member…</option>
                  {members.filter(m => !m.is_self).map(m => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
                </select>
                <input className="input flex-1" value={nudgeMsg} onChange={e => setNudgeMsg(e.target.value)} placeholder="Message…" maxLength={100} />
                <button onClick={() => nudgeMutation.mutate({ to: nudgeTo, msg: nudgeMsg })} disabled={!nudgeTo || nudgeMutation.isPending} className="btn-primary text-sm whitespace-nowrap">
                  {nudgeMutation.isPending ? '…' : '👋 Nudge'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedCircleId && view === 'feed' && (
        <div className="card">
          <h2 className="font-semibold text-surface-ink mb-4">📰 Weekly Circle Feed — {selectedCircle?.name}</h2>
          {!feed ? (
            <p className="text-sm text-surface-muted">Loading feed…</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-brand-indigo/5 border border-brand-indigo/20 p-4">
                <div className="text-xs font-semibold text-brand-indigo mb-1">Week of {feed.week_start}</div>
                <p className="text-sm text-surface-ink leading-relaxed">✨ {feed.encouragement_message}</p>
              </div>
              {feed.feed_data?.highlights && feed.feed_data.highlights.length > 0 && (
                <div className="space-y-1">
                  {feed.feed_data.highlights.map((h, i) => (
                    <div key={i} className="text-sm text-surface-muted px-2">🔥 {h}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedCircleId && view === 'members' && (
        <div className="card">
          <h2 className="font-semibold text-surface-ink mb-4">👥 Members — {selectedCircle?.name}</h2>
          <div className="text-xs text-surface-muted mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            🔒 Privacy: Only composite Life Score trends are shared — never raw sub-scores.
          </div>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-sunk">
                <div className="w-8 h-8 rounded-full bg-brand-indigo/20 text-brand-indigo grid place-items-center text-sm font-semibold">
                  {m.display_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-surface-ink">{m.display_name}</span>
                  {m.role === 'admin' && <span className="ml-2 text-xs chip">admin</span>}
                </div>
                <div className="text-xs text-surface-muted">
                  {m.share_streaks ? '🔥 Streaks shared' : '🔒 Streaks private'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy note */}
      <div className="rounded-lg bg-surface-sunk border border-surface-ink/[0.06] px-4 py-3 text-xs text-surface-muted">
        🔒 <strong>Privacy by design:</strong> Circle members never see your raw Life Score sub-scores or personal data. Only your composite trend direction (↑↗↘↓) and what you explicitly choose to share.
      </div>
    </div>
  );
}
