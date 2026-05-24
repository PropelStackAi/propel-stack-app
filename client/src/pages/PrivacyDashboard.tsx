/**
 * Privacy & Security Dashboard — Enhancement 41
 * Propel Stack AI, LLC
 *
 * Lets the user control which data categories are sent to AI models
 * and view the last 50 audit log entries for their account.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

// ── Types ────────────────────────────────────────────────────────────────────

interface PrivacySettings {
  send_health_to_ai: boolean;
  send_finance_to_ai: boolean;
  send_mood_to_ai: boolean;
  send_relationships_to_ai: boolean;
  send_goals_to_ai: boolean;
  updated_at?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | string;
  created_at: string;
}

// ── API helpers ──────────────────────────────────────────────────────────────

function fetchPrivacySettings(): Promise<PrivacySettings> {
  return apiRequest<PrivacySettings>('/api/security/privacy-settings');
}

function updatePrivacySettings(settings: PrivacySettings): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/api/security/privacy-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
    headers: { 'Content-Type': 'application/json' },
  });
}

function fetchAuditLog(): Promise<AuditEntry[]> {
  return apiRequest<AuditEntry[]>('/api/security/audit-log');
}

// ── Toggle component ─────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-surface-ink/[0.06] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-surface-ink">{label}</p>
        <p className="text-xs text-surface-muted mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo',
          checked ? 'bg-brand-indigo' : 'bg-surface-ink/20',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 translate-y-0.5',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function PrivacyDashboard() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['privacy-settings'],
    queryFn: fetchPrivacySettings,
  });

  const { data: auditLog, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: fetchAuditLog,
  });

  const [local, setLocal] = useState<PrivacySettings | null>(null);
  const current: PrivacySettings = local ?? settings ?? {
    send_health_to_ai: true,
    send_finance_to_ai: true,
    send_mood_to_ai: true,
    send_relationships_to_ai: true,
    send_goals_to_ai: true,
  };

  const mutation = useMutation({
    mutationFn: updatePrivacySettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['privacy-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setLocal(null);
    },
  });

  function toggle(key: keyof PrivacySettings) {
    if (typeof current[key] !== 'boolean') return;
    setLocal({ ...current, [key]: !current[key] });
  }

  function handleSave() {
    mutation.mutate(current);
  }

  const toggles: Array<{
    key: keyof PrivacySettings;
    label: string;
    description: string;
  }> = [
    {
      key: 'send_health_to_ai',
      label: 'Health & Fitness Data',
      description: 'Allow AI features to reference your health metrics, workouts, and sleep data.',
    },
    {
      key: 'send_finance_to_ai',
      label: 'Financial Data',
      description: 'Allow AI features to reference your budgets, transactions, and account summaries.',
    },
    {
      key: 'send_mood_to_ai',
      label: 'Mood & Mental Wellness',
      description: 'Allow AI features to reference mood check-ins and mental wellness entries.',
    },
    {
      key: 'send_relationships_to_ai',
      label: 'Relationships & People',
      description: 'Allow AI features to reference contact notes and relationship insights.',
    },
    {
      key: 'send_goals_to_ai',
      label: 'Goals & Streaks',
      description: 'Allow AI features to reference your active goals, streaks, and life wins.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-surface-ink">Privacy &amp; Security</h1>
        <p className="text-sm text-surface-muted mt-1">
          Control what data is shared with AI features and review your account activity.
        </p>
      </div>

      {/* AI Data Sharing */}
      <section className="card">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">🔒</span>
          <h2 className="text-lg font-semibold text-surface-ink">AI Data Sharing</h2>
        </div>
        <p className="text-xs text-surface-muted mb-4">
          Toggle which categories of your data are included when AI generates insights, recaps,
          or coaching advice. Turning a category off means that data is excluded from all AI
          prompts — it is still stored securely in your account.
        </p>

        {settingsLoading ? (
          <div className="py-8 text-center text-surface-muted text-sm animate-pulse">
            Loading settings…
          </div>
        ) : (
          <div>
            {toggles.map((t) => (
              <ToggleRow
                key={t.key}
                label={t.label}
                description={t.description}
                checked={current[t.key] as boolean}
                onChange={() => toggle(t.key)}
                disabled={mutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Save / feedback */}
        <div className="mt-5 flex items-center gap-3">
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={mutation.isPending || !local}
          >
            {mutation.isPending ? 'Saving…' : 'Save Preferences'}
          </button>
          {saved && (
            <span className="text-sm text-brand-teal font-semibold">
              ✓ Preferences saved
            </span>
          )}
          {mutation.isError && (
            <span className="text-sm text-brand-coral">
              Error saving — please try again.
            </span>
          )}
        </div>
      </section>

      {/* Security Info */}
      <section className="card">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">🛡️</span>
          <h2 className="text-lg font-semibold text-surface-ink">Security Standards</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-surface-sunk p-4">
            <div className="text-2xl mb-1">🔐</div>
            <div className="text-sm font-semibold text-surface-ink">AES-256-GCM</div>
            <div className="text-xs text-surface-muted mt-0.5">Field-level encryption for sensitive data</div>
          </div>
          <div className="rounded-xl bg-surface-sunk p-4">
            <div className="text-2xl mb-1">🧹</div>
            <div className="text-sm font-semibold text-surface-ink">PII Scrubbing</div>
            <div className="text-xs text-surface-muted mt-0.5">SSN, CC, phone, email stripped before AI</div>
          </div>
          <div className="rounded-xl bg-surface-sunk p-4">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-sm font-semibold text-surface-ink">Audit Logging</div>
            <div className="text-xs text-surface-muted mt-0.5">All sensitive actions recorded below</div>
          </div>
        </div>
      </section>

      {/* Audit Log */}
      <section className="card">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">📋</span>
          <h2 className="text-lg font-semibold text-surface-ink">Recent Account Activity</h2>
        </div>
        <p className="text-xs text-surface-muted mb-4">
          The last 50 security-relevant events on your account. This log cannot be altered.
        </p>

        {auditLoading ? (
          <div className="py-8 text-center text-surface-muted text-sm animate-pulse">
            Loading audit log…
          </div>
        ) : !auditLog || auditLog.length === 0 ? (
          <div className="py-8 text-center text-surface-muted text-sm">
            No audit events yet — actions like vault access and privacy changes will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-surface-muted uppercase tracking-wide border-b border-surface-ink/[0.06]">
                  <th className="pb-2 pr-4 font-semibold">Action</th>
                  <th className="pb-2 pr-4 font-semibold">Resource</th>
                  <th className="pb-2 pr-4 font-semibold">IP</th>
                  <th className="pb-2 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-surface-ink/[0.04] hover:bg-surface-sunk/50 transition-colors"
                  >
                    <td className="py-2 pr-4">
                      <span className="chip text-xs font-mono">{entry.action}</span>
                    </td>
                    <td className="py-2 pr-4 text-surface-muted text-xs">
                      {entry.resource ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-surface-muted text-xs font-mono">
                      {entry.ip_address ?? '—'}
                    </td>
                    <td className="py-2 text-surface-muted text-xs whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
