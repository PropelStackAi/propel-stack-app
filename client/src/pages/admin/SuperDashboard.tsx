/**
 * Admin Super Dashboard — Phase 4 Step 12
 * Propel Stack AI, LLC
 *
 * Internal operator visibility: users, churn risk, safety events,
 * NPS, webhook health, partner health, system health.
 *
 * ACCESS: Super admin role only — never expose to partners or end users.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, AlertTriangle, Heart, Webhook, Building2,
  Activity, TrendingDown, MessageSquare, Shield, RefreshCw, ChevronDown, ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '../../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminOverview {
  userStats: {
    total_users: number;
    paying_users: number;
    new_this_month: number;
    active_7d: number;
    avg_churn_risk: number;
  };
  churnRiskUsers: Array<{
    id: string; email: string; display_name: string;
    plan_tier: string; churn_risk_score: number;
    last_active_at: string | null; churn_intervention_sent_at: string | null;
  }>;
  safetyEvents: Array<{ event_type: string; count: number }>;
  npsStats: { avg_score: number; total_responses: number; promoters: number; detractors: number };
  partners: Array<{ id: string; name: string; slug: string; plan: string; sso_enabled: boolean; dpa_signed: boolean }>;
  webhookStats: { total: number; active: number; disabled_by_failure: number };
  cronJobs: Array<{ job_name: string; last_run: string }>;
  planDist: Array<{ plan_tier: string; user_count: number }>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color = 'text-brand-indigo', alert = false,
}: {
  label: string; value: string | number; sub?: string;
  icon: LucideIcon;
  color?: string; alert?: boolean;
}) {
  return (
    <div className={`card flex items-start gap-3 ${alert ? 'border-red-400 dark:border-red-600 border' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-surface-sunk dark:bg-white/5`}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className="text-xs text-surface-muted uppercase tracking-wide font-semibold">{label}</p>
        <p className={`text-2xl font-bold ${alert ? 'text-red-500' : 'text-surface-ink dark:text-white'}`}>{value}</p>
        {sub && <p className="text-xs text-surface-muted">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Churn Risk Table ─────────────────────────────────────────────────────────

function ChurnRiskTable({ users, onIntervene }: {
  users: AdminOverview['churnRiskUsers'];
  onIntervene: (userId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <TrendingDown size={18} className="text-amber-500" />
          <h2 className="font-semibold text-surface-ink dark:text-white">Churn Risk Table</h2>
          <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
            {users.length} at risk
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-surface-muted" /> : <ChevronDown size={16} className="text-surface-muted" />}
      </button>

      {expanded && (
        <div className="mt-4 overflow-x-auto">
          {users.length === 0 ? (
            <p className="text-sm text-surface-muted text-center py-6">No high-risk users detected</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-ink/[0.08] dark:border-white/[0.08]">
                  <th className="text-left py-2 px-2 font-semibold text-surface-muted">User</th>
                  <th className="text-left py-2 px-2 font-semibold text-surface-muted">Plan</th>
                  <th className="text-left py-2 px-2 font-semibold text-surface-muted">Risk Score</th>
                  <th className="text-left py-2 px-2 font-semibold text-surface-muted">Last Active</th>
                  <th className="text-left py-2 px-2 font-semibold text-surface-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-surface-ink/[0.06] dark:border-white/[0.06] hover:bg-surface-sunk/50">
                    <td className="py-2 px-2">
                      <p className="font-medium text-surface-ink dark:text-white">{u.display_name}</p>
                      <p className="text-surface-muted">{u.email}</p>
                    </td>
                    <td className="py-2 px-2">
                      <span className="chip text-[10px]">{u.plan_tier}</span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-surface-sunk overflow-hidden">
                          <div
                            className={`h-full rounded-full ${u.churn_risk_score >= 70 ? 'bg-red-500' : u.churn_risk_score >= 50 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${u.churn_risk_score}%` }}
                          />
                        </div>
                        <span className={`font-bold ${u.churn_risk_score >= 70 ? 'text-red-500' : u.churn_risk_score >= 50 ? 'text-amber-500' : 'text-green-500'}`}>
                          {u.churn_risk_score}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-surface-muted">
                      {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-2 px-2">
                      <button
                        type="button"
                        onClick={() => onIntervene(u.id)}
                        disabled={!!u.churn_intervention_sent_at}
                        className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-brand-indigo text-white hover:brightness-110 disabled:opacity-40 transition-all"
                      >
                        {u.churn_intervention_sent_at ? 'Sent' : 'Intervene'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SuperDashboard() {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => apiRequest<AdminOverview>('/api/admin/overview'),
    refetchInterval: 5 * 60 * 1000, // 5 min auto-refresh
  });

  const intervene = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/api/admin/trigger-intervention/${userId}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-overview'] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-surface-sunk rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-surface-sunk rounded-xl2 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const s = data;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={22} className="text-brand-indigo" />
          <h1 className="font-display text-2xl font-bold text-surface-ink dark:text-white">Admin Super Dashboard</h1>
          <span className="chip bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold">INTERNAL ONLY</span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-surface-muted hover:bg-surface-sunk transition-all"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={s?.userStats.total_users ?? 0} icon={Users} />
        <KpiCard label="Paying Users" value={s?.userStats.paying_users ?? 0} icon={Activity} color="text-green-500" />
        <KpiCard label="Active (7d)" value={s?.userStats.active_7d ?? 0} icon={TrendingDown} color="text-teal-500" />
        <KpiCard
          label="Avg Churn Risk"
          value={`${s?.userStats.avg_churn_risk ?? 0}`}
          icon={AlertTriangle}
          color={Number(s?.userStats.avg_churn_risk ?? 0) > 50 ? 'text-red-500' : 'text-amber-500'}
          alert={Number(s?.userStats.avg_churn_risk ?? 0) > 60}
        />
      </div>

      {/* NPS + Webhooks + Safety row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* NPS */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-brand-indigo" />
            <h2 className="font-semibold text-sm text-surface-ink dark:text-white">NPS (30d)</h2>
          </div>
          <p className="text-3xl font-bold text-surface-ink dark:text-white">
            {s?.npsStats?.avg_score ? Number(s.npsStats.avg_score).toFixed(1) : '—'}
            <span className="text-base font-normal text-surface-muted">/5</span>
          </p>
          <p className="text-xs text-surface-muted">
            {s?.npsStats?.total_responses ?? 0} responses •{' '}
            {s?.npsStats?.promoters ?? 0} promoters •{' '}
            {s?.npsStats?.detractors ?? 0} detractors
          </p>
        </div>

        {/* Webhooks */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2">
            <Webhook size={16} className="text-brand-indigo" />
            <h2 className="font-semibold text-sm text-surface-ink dark:text-white">Webhooks</h2>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-muted">Total registered</span>
              <span className="font-semibold text-surface-ink dark:text-white">{s?.webhookStats?.total ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-muted">Active</span>
              <span className="font-semibold text-green-500">{s?.webhookStats?.active ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-muted">Disabled (failures)</span>
              <span className={`font-semibold ${(s?.webhookStats?.disabled_by_failure ?? 0) > 0 ? 'text-red-500' : 'text-surface-ink dark:text-white'}`}>
                {s?.webhookStats?.disabled_by_failure ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Events */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-red-500" />
            <h2 className="font-semibold text-sm text-surface-ink dark:text-white">Safety Events (30d)</h2>
          </div>
          {(!s?.safetyEvents || s.safetyEvents.length === 0) ? (
            <p className="text-xs text-surface-muted py-2">No safety events recorded</p>
          ) : (
            <div className="space-y-1">
              {s.safetyEvents.map(evt => (
                <div key={evt.event_type} className="flex justify-between text-xs">
                  <span className="text-surface-muted">{evt.event_type}</span>
                  <span className="font-semibold text-red-500">{evt.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-brand-indigo" />
          <h2 className="font-semibold text-sm text-surface-ink dark:text-white">Plan Distribution</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(s?.planDist ?? []).map(p => (
            <div key={p.plan_tier} className="bg-surface-sunk dark:bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xs text-surface-muted capitalize">{p.plan_tier}</p>
              <p className="text-xl font-bold text-surface-ink dark:text-white">{p.user_count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Churn Risk Table */}
      {s && (
        <ChurnRiskTable
          users={s.churnRiskUsers}
          onIntervene={(userId) => intervene.mutate(userId)}
        />
      )}

      {/* Partner Health */}
      {(s?.partners ?? []).length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-brand-indigo" />
            <h2 className="font-semibold text-sm text-surface-ink dark:text-white">White-Label Partners</h2>
          </div>
          <div className="space-y-2">
            {s!.partners.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-surface-ink/[0.06] dark:border-white/[0.06] last:border-0">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-surface-ink dark:text-white">{p.name}</p>
                  <p className="text-xs text-surface-muted">/{p.slug}</p>
                </div>
                <span className="chip text-[10px]">{p.plan}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.sso_enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-surface-sunk text-surface-muted'}`}>
                  SSO {p.sso_enabled ? '✓' : '—'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.dpa_signed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  DPA {p.dpa_signed ? '✓' : '⚠'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cron Job Health */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Heart size={16} className="text-brand-indigo" />
          <h2 className="font-semibold text-sm text-surface-ink dark:text-white">System Health — Cron Jobs</h2>
        </div>
        {(!s?.cronJobs || s.cronJobs.length === 0) ? (
          <p className="text-xs text-surface-muted">No cron job runs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {s!.cronJobs.map(j => {
              const hoursAgo = j.last_run
                ? Math.round((Date.now() - new Date(j.last_run).getTime()) / 3_600_000)
                : null;
              const stale = hoursAgo !== null && hoursAgo > 25;
              return (
                <div key={j.job_name} className="flex items-center justify-between py-1.5 border-b border-surface-ink/[0.06] dark:border-white/[0.06] last:border-0">
                  <span className="text-sm text-surface-ink dark:text-white">{j.job_name}</span>
                  <span className={`text-xs font-semibold ${stale ? 'text-red-500' : 'text-green-500'}`}>
                    {j.last_run ? `${hoursAgo}h ago` : 'Never run'}
                    {stale && ' ⚠'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-surface-muted text-center">
        Admin Super Dashboard — Propel Stack AI internal use only. Data refreshes every 5 minutes.
      </p>
    </div>
  );
}
