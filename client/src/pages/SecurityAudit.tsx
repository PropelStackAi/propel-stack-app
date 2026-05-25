/**
 * Security Audit / Penetration Test Status — Enhancement 43
 * Propel Stack AI, LLC
 *
 * Admin-only page showing:
 *  - OWASP Top 10 compliance checklist
 *  - Security header configuration status
 *  - Rate limiting status
 *  - DPA compliance stats
 *  - Pen test scheduling & history
 */

import { useQuery } from '@tanstack/react-query';
import {
  Shield, CheckCircle, AlertCircle, Clock, FileText,
  Lock, Server, Activity, Users,
} from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OwaspItem {
  id: string;
  name: string;
  status: 'pass' | 'review' | 'fail';
  notes: string;
}

interface SecurityHeader {
  header: string;
  configured: boolean;
}

interface SecurityAuditData {
  generated_at: string;
  overall_status: 'pass' | 'review' | 'fail';
  owasp_checklist: OwaspItem[];
  security_headers: SecurityHeader[];
  rate_limiting: { global_rps_limit: number; ai_stream_rpm_limit: number; auth_attempts_per_15min: number; configured: boolean };
  dpa_compliance: { users_signed: number; orgs_signed: number };
  pen_test: { conducted_by: string; date: string | null; scope: string; next_scheduled: string; status: string };
  recommendations: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: 'pass' | 'review' | 'fail') {
  const map = {
    pass:   { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   icon: CheckCircle,   label: 'Pass'   },
    review: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  icon: AlertCircle,   label: 'Review' },
    fail:   { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',          icon: AlertCircle,   label: 'Fail'   },
  };
  const { cls, icon: Icon, label } = map[status] ?? map.review;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SecurityAudit() {
  const { data, isLoading, isError } = useQuery<SecurityAuditData>({
    queryKey: ['admin', 'security-audit'],
    queryFn: () => apiRequest('/api/admin/security-audit'),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-sunk" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-500 text-sm">Failed to load security audit data.</p>
      </div>
    );
  }

  const passCount = data.owasp_checklist.filter((i) => i.status === 'pass').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-indigo/10 flex items-center justify-center">
          <Shield size={20} className="text-brand-indigo" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-surface-ink">Security Audit</h1>
          <p className="text-sm text-surface-muted">
            OWASP Top 10 · Pen Test Status · Compliance — as of{' '}
            {new Date(data.generated_at).toLocaleString()}
          </p>
        </div>
        <div className="ml-auto">{statusBadge(data.overall_status)}</div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'OWASP Pass Rate', value: `${passCount}/10`, icon: Shield, color: 'text-green-600' },
          { label: 'Security Headers', value: `${data.security_headers.filter((h) => h.configured).length}/${data.security_headers.length}`, icon: Lock, color: 'text-brand-indigo' },
          { label: 'DPA Users Signed', value: data.dpa_compliance.users_signed, icon: Users, color: 'text-brand-teal' },
          { label: 'Pen Test Status', value: data.pen_test.status === 'scheduled' ? 'Scheduled' : 'Complete', icon: Activity, color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-surface-ink/10 bg-surface-raised p-4">
            <Icon size={16} className={`${color} mb-2`} />
            <div className="text-xl font-bold text-surface-ink">{value}</div>
            <div className="text-xs text-surface-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* OWASP Top 10 */}
      <section className="rounded-xl border border-surface-ink/10 overflow-hidden">
        <div className="px-5 py-3 bg-surface-sunk border-b border-surface-ink/10">
          <h2 className="font-semibold text-surface-ink text-sm flex items-center gap-2">
            <Shield size={14} className="text-brand-indigo" />
            OWASP Top 10 Checklist
          </h2>
        </div>
        <div className="divide-y divide-surface-ink/5">
          {data.owasp_checklist.map((item) => (
            <div key={item.id} className="px-5 py-3 flex items-start gap-3">
              <span className="text-xs font-mono text-surface-muted w-8 mt-0.5 shrink-0">{item.id}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-surface-ink">{item.name}</span>
                  {statusBadge(item.status)}
                </div>
                <p className="text-xs text-surface-muted mt-0.5">{item.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Headers */}
      <section className="rounded-xl border border-surface-ink/10 overflow-hidden">
        <div className="px-5 py-3 bg-surface-sunk border-b border-surface-ink/10">
          <h2 className="font-semibold text-surface-ink text-sm flex items-center gap-2">
            <Lock size={14} className="text-brand-indigo" />
            Security Headers (via Helmet.js)
          </h2>
        </div>
        <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.security_headers.map((h) => (
            <div key={h.header} className="flex items-center gap-2 text-sm">
              {h.configured
                ? <CheckCircle size={13} className="text-green-500 shrink-0" />
                : <AlertCircle size={13} className="text-red-500 shrink-0" />}
              <span className="font-mono text-xs text-surface-ink">{h.header}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pen Test Info */}
      <section className="rounded-xl border border-surface-ink/10 overflow-hidden">
        <div className="px-5 py-3 bg-surface-sunk border-b border-surface-ink/10">
          <h2 className="font-semibold text-surface-ink text-sm flex items-center gap-2">
            <Server size={14} className="text-brand-indigo" />
            Penetration Test
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-surface-muted text-xs uppercase tracking-wide">Status</span>
              <div className="font-semibold text-surface-ink mt-0.5 capitalize">{data.pen_test.status}</div>
            </div>
            <div>
              <span className="text-surface-muted text-xs uppercase tracking-wide">Next Scheduled</span>
              <div className="font-semibold text-surface-ink mt-0.5">{data.pen_test.next_scheduled}</div>
            </div>
            <div className="col-span-2">
              <span className="text-surface-muted text-xs uppercase tracking-wide">Scope</span>
              <div className="text-surface-ink mt-0.5">{data.pen_test.scope}</div>
            </div>
            <div className="col-span-2">
              <span className="text-surface-muted text-xs uppercase tracking-wide">Vendor</span>
              <div className="text-surface-ink mt-0.5">{data.pen_test.conducted_by}</div>
            </div>
          </div>

          {data.pen_test.status === 'scheduled' && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 flex items-start gap-2">
              <Clock size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                External penetration test is required before the first enterprise customer contract.
                Engage a CREST or OSCP-certified firm for a full-scope test.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Recommendations */}
      <section className="rounded-xl border border-surface-ink/10 overflow-hidden">
        <div className="px-5 py-3 bg-surface-sunk border-b border-surface-ink/10">
          <h2 className="font-semibold text-surface-ink text-sm flex items-center gap-2">
            <FileText size={14} className="text-brand-indigo" />
            Remediation Recommendations
          </h2>
        </div>
        <ul className="divide-y divide-surface-ink/5">
          {data.recommendations.map((rec, i) => (
            <li key={i} className="px-5 py-3 flex items-start gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-brand-indigo/10 text-brand-indigo text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-surface-ink">{rec}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
