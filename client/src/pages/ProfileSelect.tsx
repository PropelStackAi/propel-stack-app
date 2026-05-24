/**
 * Profile & Settings Hub
 * Propel Stack AI, LLC
 *
 * Account, AI preferences, notifications, and security settings.
 */
import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface MeData {
  id: string;
  email: string;
  display_name: string;
  plan_tier: string;
  ai_tokens_used_this_month: number;
}

interface PrivacySettings {
  send_health_to_ai: boolean;
  send_finance_to_ai: boolean;
  send_mood_to_ai: boolean;
  send_relationships_to_ai: boolean;
  send_goals_to_ai: boolean;
}

interface NotificationPref {
  trigger_key: string;
  enabled: boolean;
}

const PLAN_TOKEN_LIMITS: Record<string, number> = {
  solo: 50000,
  family: 150000,
  network: 500000,
  elite: 2000000,
};

const NOTIFICATION_LABELS: Record<string, string> = {
  no_mood_log: 'Daily mood check-in reminder',
  streak_at_risk: 'Streak at-risk alert',
  recap_unread: 'Weekly recap notification',
  life_score_drop: 'Life Score drop alert',
  goal_deadline: 'Goal deadline reminder',
  finance_spike: 'Unusual spending alert',
  absence: 'Inactivity check-in',
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-brand-indigo' : 'bg-surface-ink/20'}`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'left-5.5 translate-x-0.5' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function ProfileSelect() {
  const qc = useQueryClient();
  const [view, setView] = useState<'profile' | 'ai' | 'notifications' | 'security'>('profile');

  // Security tab state
  const [exportMsg, setExportMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');

  const { data: me } = useQuery<MeData>({
    queryKey: ['me'],
    queryFn: () => apiRequest<MeData>('/api/me'),
  });

  const { data: privacy } = useQuery<PrivacySettings>({
    queryKey: ['privacy-settings'],
    queryFn: () => apiRequest<PrivacySettings>('/api/security/privacy-settings'),
    enabled: view === 'ai',
  });

  const { data: notifPrefs = [] } = useQuery<NotificationPref[]>({
    queryKey: ['notification-prefs'],
    queryFn: () => apiRequest<NotificationPref[]>('/api/notifications/preferences'),
    enabled: view === 'notifications',
  });

  const privacyMutation = useMutation({
    mutationFn: (data: PrivacySettings) =>
      apiRequest('/api/security/privacy-settings', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['privacy-settings'] }),
  });

  const notifMutation = useMutation({
    mutationFn: (data: { trigger_key: string; enabled: boolean }) =>
      apiRequest('/api/notifications/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('/api/security/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.clear();
      window.location.hash = '/';
    },
  });

  function handlePrivacyToggle(key: keyof PrivacySettings, value: boolean) {
    if (!privacy) return;
    privacyMutation.mutate({ ...privacy, [key]: value });
  }

  function handleNotifToggle(trigger_key: string, enabled: boolean) {
    notifMutation.mutate({ trigger_key, enabled });
  }

  async function handleExport() {
    await apiRequest('/api/security/export-my-data', { method: 'POST' });
    setExportMsg('Export requested. You\'ll receive a download link shortly.');
  }

  async function handleDeleteAccount() {
    await apiRequest('/api/security/delete-account', { method: 'POST' });
    setDeleteMsg('Account deletion initiated. You will be logged out shortly.');
    setShowDeleteModal(false);
  }

  const planLimit = me ? (PLAN_TOKEN_LIMITS[me.plan_tier] ?? 50000) : 50000;
  const tokenPct = me ? Math.min(100, Math.round((me.ai_tokens_used_this_month / planLimit) * 100)) : 0;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const PRIVACY_ROWS: Array<{ key: keyof PrivacySettings; label: string }> = [
    { key: 'send_health_to_ai', label: 'Health data' },
    { key: 'send_finance_to_ai', label: 'Financial data' },
    { key: 'send_mood_to_ai', label: 'Mood & mindfulness' },
    { key: 'send_relationships_to_ai', label: 'Relationships & contacts' },
    { key: 'send_goals_to_ai', label: 'Goals & coaching' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-surface-ink">Profile & Settings</h1>
        <p className="text-surface-muted text-sm mt-1">
          Manage your account, AI preferences, notifications, and security.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-sunk rounded-lg p-1 w-fit flex-wrap">
        {([
          { key: 'profile', label: '👤 Profile' },
          { key: 'ai', label: '🧠 AI Preferences' },
          { key: 'notifications', label: '🔔 Notifications' },
          { key: 'security', label: '🔐 Security & Data' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === t.key ? 'bg-white shadow-sm text-surface-ink' : 'text-surface-muted hover:text-surface-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {view === 'profile' && (
        <div className="space-y-5">
          {!me ? (
            <div className="card text-center py-10 text-surface-muted">Loading profile…</div>
          ) : (
            <>
              {/* Avatar + info */}
              <div className="card flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-brand-indigo flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-white">
                    {me.display_name?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                </div>
                <div>
                  <div className="text-xl font-display font-bold text-surface-ink">{me.display_name}</div>
                  <div className="text-sm text-surface-muted">{me.email}</div>
                  <span className="chip bg-brand-indigo/10 text-brand-indigo text-xs mt-1 inline-block capitalize">
                    {me.plan_tier} Plan
                  </span>
                </div>
              </div>

              {/* Plan & Billing */}
              <div className="card space-y-4">
                <h2 className="font-semibold text-surface-ink">Plan & Billing</h2>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-muted">Current plan</span>
                  <span className="chip bg-brand-indigo/10 text-brand-indigo text-xs capitalize">{me.plan_tier}</span>
                </div>

                {/* Token usage meter */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-surface-muted">AI token usage this month</span>
                    <span className="font-medium text-surface-ink">
                      {me.ai_tokens_used_this_month.toLocaleString()} / {planLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-sunk rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        tokenPct >= 90 ? 'bg-red-500' : tokenPct >= 70 ? 'bg-amber-500' : 'bg-brand-indigo'
                      }`}
                      style={{ width: `${tokenPct}%` }}
                    />
                  </div>
                  <div className="text-xs text-surface-muted mt-1">{tokenPct}% used</div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Link href="/pricing">
                    <a className="btn-primary text-sm">Upgrade Plan</a>
                  </Link>
                  <button disabled className="btn-secondary text-sm opacity-50 cursor-not-allowed">
                    Buy More Credits (coming soon)
                  </button>
                </div>
              </div>

              {/* Appearance */}
              <div className="card space-y-3">
                <h2 className="font-semibold text-surface-ink">Appearance</h2>
                <div className="rounded-lg bg-surface-sunk px-4 py-3 text-sm text-surface-muted">
                  Dark mode and theme customization coming in a future update.
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-muted">Timezone</span>
                  <span className="font-medium text-surface-ink">{timezone}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* AI Preferences Tab */}
      {view === 'ai' && (
        <div className="card space-y-5">
          <div>
            <h2 className="font-semibold text-surface-ink">What data does the AI have access to?</h2>
            <p className="text-sm text-surface-muted mt-1">
              Control exactly which areas of your life the AI can read and use for coaching.
            </p>
          </div>

          {!privacy ? (
            <div className="text-center py-6 text-surface-muted">Loading preferences…</div>
          ) : (
            <div className="space-y-4">
              {PRIVACY_ROWS.map(row => (
                <div key={row.key} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-ink">{row.label}</span>
                  <Toggle
                    checked={privacy[row.key]}
                    onChange={v => handlePrivacyToggle(row.key, v)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-surface-sunk px-4 py-3 text-xs text-surface-muted">
            🔒 Your data is never sold or shared. AI uses only what you enable above.
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {view === 'notifications' && (
        <div className="card space-y-5">
          <div>
            <h2 className="font-semibold text-surface-ink">Notification Preferences</h2>
            <p className="text-sm text-surface-muted mt-1">Choose which alerts and reminders to receive.</p>
          </div>

          {notifPrefs.length === 0 ? (
            <div className="text-center py-6 text-surface-muted">Loading preferences…</div>
          ) : (
            <div className="space-y-4">
              {notifPrefs.map(pref => {
                const label = NOTIFICATION_LABELS[pref.trigger_key] ?? pref.trigger_key.replace(/_/g, ' ');
                return (
                  <div key={pref.trigger_key} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-ink">{label}</span>
                    <Toggle
                      checked={pref.enabled}
                      onChange={v => handleNotifToggle(pref.trigger_key, v)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Security & Data Tab */}
      {view === 'security' && (
        <div className="space-y-5">
          {/* Security */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-surface-ink">Security</h2>

            <div className="rounded-lg bg-surface-sunk px-4 py-3 text-sm text-surface-muted">
              <strong className="text-surface-ink">Change Password</strong>
              <p className="mt-1">
                Password changes are managed through your authentication provider. Contact support at{' '}
                <a href="mailto:support@propelstackai.com" className="text-brand-indigo hover:underline">
                  support@propelstackai.com
                </a>
              </p>
            </div>

            <div>
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="btn-secondary text-sm"
              >
                {logoutMutation.isPending ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>

          {/* Data */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-surface-ink">Your Data</h2>

            <div>
              <div className="text-sm font-medium text-surface-ink mb-1">Download My Data</div>
              <p className="text-xs text-surface-muted mb-2">
                Request an export of all your Propel Stack AI data. You'll receive a download link via email.
              </p>
              {exportMsg ? (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                  {exportMsg}
                </div>
              ) : (
                <button onClick={handleExport} className="btn-secondary text-sm">
                  Download My Data
                </button>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card border-red-200 space-y-4">
            <h2 className="font-semibold text-red-700">⚠ Danger Zone</h2>
            <div>
              <div className="text-sm font-medium text-surface-ink mb-1">Delete Account</div>
              <p className="text-xs text-surface-muted mb-3">
                Permanently delete your account and all associated data. This action is irreversible.
              </p>
              {deleteMsg ? (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {deleteMsg}
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Delete Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="font-display font-bold text-red-700 text-lg">Delete Account</h2>
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <strong>This action is irreversible</strong> and will permanently delete all your data, including your Life Score history, goals, events, contacts, and all connected accounts.
            </div>
            <div>
              <label className="label text-surface-ink">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                className="input mt-1"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Permanently Delete
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
