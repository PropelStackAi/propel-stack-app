/**
 * InviteFlow — Workspace member invitation
 * Three tabs: shareable join code, email invites, CSV bulk upload.
 * Propel Stack AI, LLC
 */

import { useState } from 'react';
import { Copy, Check, Mail, Upload, Link } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Track = 'consumer' | 'education' | 'business';

type TabId = 'link' | 'email' | 'csv';

interface InviteFlowProps {
  workspaceId: string;
  track: Track;
}

interface InviteCodeResponse {
  code: string;
}

interface InviteResponse {
  invited: number;
}

// ─── Role options by track ────────────────────────────────────────────────────

const ROLE_OPTIONS: Record<Track, { value: string; label: string }[]> = {
  consumer: [
    { value: 'family_admin', label: 'Family Manager' },
    { value: 'member', label: 'Member' },
  ],
  education: [
    { value: 'teacher', label: 'Teacher / Faculty' },
    { value: 'student', label: 'Student' },
    { value: 'campus_admin', label: 'Campus Admin' },
  ],
  business: [
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'contributor', label: 'Team Member' },
    { value: 'operations_admin', label: 'Operations Admin' },
  ],
};

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; Icon: typeof Link }[] = [
  { id: 'link', label: 'Invite Link', Icon: Link },
  { id: 'email', label: 'Email Invite', Icon: Mail },
  { id: 'csv', label: 'CSV Upload', Icon: Upload },
];

// ─── Invite Link tab ──────────────────────────────────────────────────────────

function InviteLinkTab({ workspaceId, track }: { workspaceId: string; track: Track }) {
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invite-code', workspaceId],
    queryFn: () =>
      apiRequest<InviteCodeResponse>(`/api/workspaces/${workspaceId}/invite-code`),
  });

  function handleCopy() {
    if (!data?.code) return;
    navigator.clipboard.writeText(data.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const audience =
    track === 'consumer' ? 'family' : track === 'education' ? 'class' : 'team';

  return (
    <div className="space-y-5">
      <p className="text-sm text-surface-muted">
        Share this code with your {audience}. Anyone with the code can join your workspace.
      </p>

      {isLoading && (
        <div className="h-20 rounded-2xl bg-surface-sunk animate-pulse" />
      )}

      {isError && (
        <p className="text-sm text-red-500">Failed to load invite code. Please refresh.</p>
      )}

      {data?.code && (
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-surface-sunk border border-surface-ink/10">
          <p className="font-mono text-4xl font-bold tracking-[0.25em] text-surface-ink dark:text-white select-all">
            {data.code}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className={[
              'flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all',
              copied
                ? 'bg-green-500 text-white'
                : 'bg-brand-indigo text-white hover:brightness-110',
            ].join(' ')}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Email invite tab ─────────────────────────────────────────────────────────

function EmailInviteTab({ workspaceId, track }: { workspaceId: string; track: Track }) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState(ROLE_OPTIONS[track][0]?.value ?? '');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: { emails: string[]; role: string }) =>
      apiRequest<InviteResponse>(`/api/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      setSent(true);
      setEmails('');
      setTimeout(() => setSent(false), 3000);
    },
  });

  function handleSend() {
    const list = emails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    mutation.mutate({ emails: list, role });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-muted">
        Enter one or more email addresses separated by commas.
      </p>
      <textarea
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="alice@example.com, bob@example.com"
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-indigo placeholder:text-surface-muted"
      />
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-surface-muted mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
          >
            {ROLE_OPTIONS[track].map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="pt-5">
          <button
            type="button"
            disabled={!emails.trim() || mutation.isPending}
            onClick={handleSend}
            className="px-6 py-2.5 rounded-full bg-brand-indigo text-white font-semibold text-sm hover:brightness-110 disabled:opacity-40 transition-all whitespace-nowrap"
          >
            {mutation.isPending ? 'Sending…' : sent ? 'Sent!' : 'Send Invites'}
          </button>
        </div>
      </div>
      {mutation.isError && (
        <p className="text-sm text-red-500">Failed to send invites. Please try again.</p>
      )}
    </div>
  );
}

// ─── CSV upload tab ───────────────────────────────────────────────────────────

interface ParsedMember {
  name: string;
  email: string;
}

function parseCsv(raw: string): ParsedMember[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', email = ''] = line.split(',').map((p) => p.trim());
      return { name, email };
    })
    .filter((m) => m.email.includes('@'));
}

function CsvUploadTab({ workspaceId, track }: { workspaceId: string; track: Track }) {
  const [raw, setRaw] = useState('');
  const [role, setRole] = useState(ROLE_OPTIONS[track][track === 'education' ? 1 : 0]?.value ?? '');
  const [sent, setSent] = useState(false);

  const parsed = parseCsv(raw);

  const mutation = useMutation({
    mutationFn: (payload: { emails: string[]; role: string }) =>
      apiRequest<InviteResponse>(`/api/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      setSent(true);
      setRaw('');
      setTimeout(() => setSent(false), 3000);
    },
  });

  function handleImport() {
    if (parsed.length === 0) return;
    mutation.mutate({ emails: parsed.map((m) => m.email), role });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-muted">
        Paste your roster in{' '}
        <span className="font-mono text-xs bg-surface-sunk px-1.5 py-0.5 rounded">
          name, email
        </span>{' '}
        format — one row per person.
      </p>
      <textarea
        value={raw}
        onChange={(e) => { setRaw(e.target.value); setSent(false); }}
        placeholder={'Alice Smith, alice@school.edu\nBob Jones, bob@school.edu'}
        rows={6}
        className="w-full px-4 py-3 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-indigo placeholder:text-surface-muted"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-surface-muted">
          {parsed.length > 0 ? `${parsed.length} valid ${parsed.length === 1 ? 'member' : 'members'} detected` : 'No valid rows yet'}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 rounded-xl border border-surface-ink/10 bg-surface-sunk text-surface-ink dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo"
          >
            {ROLE_OPTIONS[track].map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={parsed.length === 0 || mutation.isPending}
            onClick={handleImport}
            className="px-5 py-2 rounded-full bg-brand-indigo text-white font-semibold text-sm hover:brightness-110 disabled:opacity-40 transition-all whitespace-nowrap"
          >
            {mutation.isPending ? 'Importing…' : sent ? 'Imported!' : 'Import'}
          </button>
        </div>
      </div>
      {mutation.isError && (
        <p className="text-sm text-red-500">Failed to import. Please try again.</p>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function InviteFlow({ workspaceId, track }: InviteFlowProps) {
  const [activeTab, setActiveTab] = useState<TabId>('link');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-surface-ink dark:text-white">
          Invite people to your workspace
        </h2>
        <p className="mt-2 text-sm text-surface-muted">
          Choose how you'd like to bring your{' '}
          {track === 'consumer' ? 'family' : track === 'education' ? 'class or school' : 'team'} on board.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-sunk border border-surface-ink/10">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={[
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-white dark:bg-surface-raised text-surface-ink dark:text-white shadow-sm'
                : 'text-surface-muted hover:text-surface-ink dark:hover:text-white',
            ].join(' ')}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'link' && <InviteLinkTab workspaceId={workspaceId} track={track} />}
        {activeTab === 'email' && <EmailInviteTab workspaceId={workspaceId} track={track} />}
        {activeTab === 'csv' && <CsvUploadTab workspaceId={workspaceId} track={track} />}
      </div>
    </div>
  );
}
