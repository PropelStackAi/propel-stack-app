/**
 * Adoption Dashboard — Enterprise Onboarding
 * Propel Stack AI, LLC
 *
 * Admin-facing dashboard for tracking workspace rollout, seat adoption,
 * member activation milestones, and launch checklist status.
 *
 * Used by: Campus admins, District admins, Business Growth+, Business Enterprise.
 * Route: /workspaces/:id/adoption
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import {
  Users, CheckCircle, Clock, Mail, BarChart3, TrendingUp,
  UserCheck, AlertCircle, RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';
import { AdminLaunchChecklist } from '../components/onboarding/AdminLaunchChecklist';
import { InviteFlow } from '../components/onboarding/InviteFlow';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdoptionStats {
  workspace: { name: string; type: string; track: string; config: Record<string, unknown> };
  total_seats: number;
  active_members: number;
  joined_last_7d: number;
  joined_last_30d: number;
  pending_invites: number;
  adoption_rate: number;
}

interface WorkspaceMember {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  status: string;
  joined_at: string | null;
}

interface MembersData {
  members: WorkspaceMember[];
  pending_invites: { email: string; role: string; expires_at: string }[];
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: typeof Users; color: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-ink/10 bg-surface-raised p-4">
      <Icon size={16} className={`${color} mb-2`} />
      <div className="text-2xl font-bold text-surface-ink">{value}</div>
      <div className="text-xs text-surface-muted mt-0.5">{label}</div>
      {sub && <div className="text-xs text-brand-indigo font-medium mt-1">{sub}</div>}
    </div>
  );
}

// ─── Adoption ring ────────────────────────────────────────────────────────────

function AdoptionRing({ pct }: { pct: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle
          cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x={50} y={54} textAnchor="middle" fontSize={18} fontWeight={700} fill={color}>
          {pct}%
        </text>
      </svg>
      <span className="text-xs text-surface-muted font-medium">Adoption Rate</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdoptionDashboard() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'invite' | 'checklist'>('overview');

  const { data: stats, isLoading: loadingStats } = useQuery<AdoptionStats>({
    queryKey: ['workspace', workspaceId, 'adoption'],
    queryFn: () => apiRequest(`/api/workspaces/${workspaceId}/adoption`),
    refetchInterval: 60_000,
  });

  const { data: membersData, isLoading: loadingMembers } = useQuery<MembersData>({
    queryKey: ['workspace', workspaceId, 'members'],
    queryFn: () => apiRequest(`/api/workspaces/${workspaceId}/members`),
    enabled: activeTab === 'members',
  });

  const track = (stats?.workspace?.track ?? 'business') as 'consumer' | 'education' | 'business';

  const TABS = [
    { id: 'overview'  as const, label: 'Overview',  icon: BarChart3 },
    { id: 'members'   as const, label: 'Members',   icon: Users     },
    { id: 'invite'    as const, label: 'Invite',    icon: Mail      },
    { id: 'checklist' as const, label: 'Checklist', icon: CheckCircle },
  ];

  if (loadingStats) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {[1,2,3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-sunk" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-indigo/10 flex items-center justify-center">
            <TrendingUp size={20} className="text-brand-indigo" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-ink">
              {stats?.workspace?.name ?? 'Workspace'} — Adoption Dashboard
            </h1>
            <p className="text-sm text-surface-muted capitalize">
              {stats?.workspace?.type ?? 'team'} · {track}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { qc.invalidateQueries({ queryKey: ['workspace', workspaceId] }); }}
          className="p-2 rounded-lg hover:bg-surface-sunk transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={15} className="text-surface-muted" />
        </button>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Seats"      value={stats.total_seats}     icon={Users}     color="text-brand-indigo" />
          <StatCard label="Active Members"   value={stats.active_members}  icon={UserCheck} color="text-green-500"
            sub={`+${stats.joined_last_7d} this week`} />
          <StatCard label="Pending Invites"  value={stats.pending_invites} icon={Clock}     color="text-amber-500" />
          <StatCard label="Joined (30d)"     value={stats.joined_last_30d} icon={TrendingUp} color="text-brand-teal" />
        </div>
      )}

      {/* Adoption ring + milestone */}
      {stats && (
        <div className="rounded-xl border border-surface-ink/10 bg-surface-raised p-5 flex flex-col sm:flex-row items-center gap-6">
          <AdoptionRing pct={stats.adoption_rate} />
          <div className="flex-1 space-y-3">
            <h3 className="font-semibold text-surface-ink">Rollout Health</h3>
            {[
              { label: 'Members activated',       val: stats.active_members,   total: stats.total_seats },
              { label: 'Joined in last 30 days',  val: stats.joined_last_30d,  total: stats.total_seats },
              { label: 'Joined in last 7 days',   val: stats.joined_last_7d,   total: stats.total_seats },
            ].map(({ label, val, total }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-surface-muted mb-1">
                  <span>{label}</span>
                  <span>{val} / {total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-sunk">
                  <div
                    className="h-full rounded-full bg-brand-indigo/60 transition-all duration-700"
                    style={{ width: total > 0 ? `${Math.min(100, Math.round((val / total) * 100))}%` : '0%' }}
                  />
                </div>
              </div>
            ))}

            {stats.adoption_rate < 50 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                Adoption below 50% — consider sending reminder invites or scheduling a kickoff session.
              </div>
            )}
            {stats.adoption_rate >= 80 && (
              <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-2.5 text-xs text-green-700 dark:text-green-400">
                <CheckCircle size={13} className="shrink-0 mt-0.5" />
                Excellent adoption! Your workspace is fully activated.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-ink/10">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === id
                ? 'border-brand-indigo text-brand-indigo'
                : 'border-transparent text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && stats && (
        <div className="rounded-xl border border-surface-ink/10 bg-surface-raised p-5 space-y-3">
          <h3 className="font-semibold text-surface-ink text-sm">Workspace Configuration</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(stats.workspace.config ?? {}).map(([k, v]) => (
              <div key={k}>
                <span className="text-surface-muted capitalize">{k.replace(/_/g, ' ')}</span>
                <div className="font-medium text-surface-ink">{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="rounded-xl border border-surface-ink/10 overflow-hidden">
          {loadingMembers ? (
            <div className="h-40 animate-pulse bg-surface-sunk" />
          ) : (
            <>
              <div className="px-5 py-3 bg-surface-sunk border-b border-surface-ink/10 text-xs font-semibold text-surface-muted uppercase tracking-wide grid grid-cols-4 gap-2">
                <span className="col-span-2">Member</span>
                <span>Role</span>
                <span>Joined</span>
              </div>
              <div className="divide-y divide-surface-ink/5">
                {membersData?.members.map((m) => (
                  <div key={m.id} className="px-5 py-3 grid grid-cols-4 gap-2 text-sm items-center">
                    <div className="col-span-2">
                      <div className="font-medium text-surface-ink">{m.display_name ?? '—'}</div>
                      <div className="text-xs text-surface-muted">{m.email ?? '—'}</div>
                    </div>
                    <span className="capitalize text-surface-muted">{m.role}</span>
                    <span className="text-surface-muted text-xs">
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'Pending'}
                    </span>
                  </div>
                ))}
                {(membersData?.members.length ?? 0) === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-surface-muted">No members yet</div>
                )}
              </div>
              {(membersData?.pending_invites.length ?? 0) > 0 && (
                <div className="border-t border-surface-ink/10 px-5 py-3 bg-surface-sunk">
                  <p className="text-xs font-semibold text-surface-muted mb-2">
                    Pending Invitations ({membersData!.pending_invites.length})
                  </p>
                  {membersData!.pending_invites.map((inv) => (
                    <div key={inv.email} className="flex items-center justify-between text-xs text-surface-muted py-1">
                      <span>{inv.email}</span>
                      <span className="capitalize">{inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'invite' && workspaceId && (
        <InviteFlow workspaceId={workspaceId} track={track} />
      )}

      {activeTab === 'checklist' && workspaceId && (
        <AdminLaunchChecklist
          workspaceId={workspaceId}
          track={track === 'consumer' ? 'business' : track}
        />
      )}
    </div>
  );
}
