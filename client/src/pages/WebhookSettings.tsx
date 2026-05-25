/**
 * Webhook Settings — Phase 4 Step 8
 * Propel Stack AI, LLC
 *
 * Users can create, test, and manage outbound webhook endpoints.
 * Signature-verified HMAC-SHA256 on every delivery.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Webhook, Plus, Trash2, Play, ToggleLeft, ToggleRight, Check, Copy, AlertCircle, Zap,
} from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserWebhook {
  id: string;
  url: string;
  events: string[];
  description: string;
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

const ALL_EVENTS = [
  { id: 'task.completed',            label: 'Task Completed' },
  { id: 'task.created',              label: 'Task Created' },
  { id: 'goal.achieved',             label: 'Goal Achieved' },
  { id: 'goal.created',              label: 'Goal Created' },
  { id: 'streak.milestone',          label: 'Streak Milestone' },
  { id: 'weekly_review.generated',   label: 'Weekly Review Generated' },
  { id: 'morning_briefing.sent',     label: 'Morning Briefing Sent' },
  { id: 'memory.created',            label: 'Memory Created' },
  { id: 'health.synced',             label: 'Health Data Synced' },
];

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateWebhookForm({ onCreated }: { onCreated: (secret: string) => void }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<string[]>(['task.completed', 'goal.achieved']);
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      apiRequest<{ id: string; secret: string; message: string }>('/api/webhooks', {
        method: 'POST',
        body: { url, description, events },
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setUrl('');
      setDescription('');
      setEvents(['task.completed', 'goal.achieved']);
      setOpen(false);
      onCreated(data.secret);
    },
  });

  const toggleEvent = (id: string) => {
    setEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-indigo text-white text-sm font-semibold hover:brightness-110 transition-all"
      >
        <Plus size={14} /> Add Webhook
      </button>
    );
  }

  return (
    <div className="card border-brand-indigo/30 space-y-4">
      <h3 className="font-semibold text-surface-ink dark:text-white">New Webhook Endpoint</h3>

      <div>
        <label className="block text-xs font-semibold text-surface-muted mb-1">ENDPOINT URL (HTTPS required)</label>
        <input
          type="url"
          className="input w-full"
          placeholder="https://your-server.com/webhook"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-surface-muted mb-1">DESCRIPTION (optional)</label>
        <input
          type="text"
          className="input w-full"
          placeholder="e.g. Notify Slack on goal achieved"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-surface-muted mb-2">EVENTS TO SUBSCRIBE</label>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_EVENTS.map(evt => (
            <label key={evt.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={events.includes(evt.id)}
                onChange={() => toggleEvent(evt.id)}
              />
              <span className="text-xs text-surface-ink dark:text-white">{evt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={!url.startsWith('https://') || events.length === 0 || create.isPending}
          className="px-4 py-2 rounded-full bg-brand-indigo text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {create.isPending ? 'Creating…' : 'Create Webhook'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-full text-sm font-semibold text-surface-muted hover:bg-surface-sunk transition-all"
        >
          Cancel
        </button>
      </div>

      {create.isError && (
        <p className="text-xs text-red-500">Failed to create webhook. Check URL and try again.</p>
      )}
    </div>
  );
}

// ─── Webhook row ──────────────────────────────────────────────────────────────

function WebhookRow({ hook }: { hook: UserWebhook }) {
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: () =>
      apiRequest(`/api/webhooks/${hook.id}`, {
        method: 'PATCH',
        body: { is_active: !hook.is_active },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const remove = useMutation({
    mutationFn: () =>
      apiRequest(`/api/webhooks/${hook.id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const test = useMutation({
    mutationFn: () =>
      apiRequest(`/api/webhooks/${hook.id}/test`, { method: 'POST' }),
  });

  const events = Array.isArray(hook.events) ? hook.events : JSON.parse(hook.events as unknown as string);

  return (
    <div className={`card space-y-3 ${!hook.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-surface-ink dark:text-white truncate">{hook.url}</p>
            {hook.failure_count >= 5 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                <AlertCircle size={10} /> Disabled
              </span>
            )}
          </div>
          {hook.description && (
            <p className="text-xs text-surface-muted">{hook.description}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {events.map((evt: string) => (
              <span key={evt} className="px-1.5 py-0.5 rounded bg-brand-indigo/10 text-brand-indigo text-[10px] font-medium">{evt}</span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => toggle.mutate()}
          className="shrink-0"
        >
          {hook.is_active
            ? <ToggleRight size={26} className="text-brand-indigo" />
            : <ToggleLeft  size={26} className="text-surface-muted" />
          }
        </button>
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-surface-ink/[0.06] dark:border-white/[0.06]">
        <span className="text-xs text-surface-muted flex-1">
          {hook.last_triggered_at
            ? `Last fired ${new Date(hook.last_triggered_at).toLocaleDateString()}`
            : 'Never triggered'}
          {hook.failure_count > 0 && ` • ${hook.failure_count} failure${hook.failure_count > 1 ? 's' : ''}`}
        </span>
        <button
          type="button"
          onClick={() => test.mutate()}
          disabled={test.isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-sunk text-xs font-semibold text-surface-muted hover:text-brand-indigo transition-colors"
        >
          {test.isSuccess ? <><Check size={11} /> Sent</> : <><Play size={11} /> Test</>}
        </button>
        <button
          type="button"
          onClick={() => remove.mutate()}
          className="text-surface-muted hover:text-red-500 transition-colors"
          aria-label="Delete webhook"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Secret reveal modal ──────────────────────────────────────────────────────

function SecretModal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-base rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-amber-500" />
          <h3 className="font-bold text-surface-ink dark:text-white">Webhook Secret — Save Now</h3>
        </div>
        <p className="text-sm text-surface-muted">This secret is shown only once. Use it to verify webhook signatures on your server.</p>
        <div className="bg-surface-sunk dark:bg-black/30 rounded-xl p-3 font-mono text-xs break-all text-surface-ink dark:text-white">
          {secret}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-brand-indigo text-white text-sm font-semibold"
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Secret</>}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-semibold text-surface-muted hover:bg-surface-sunk"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function WebhookSettingsPage() {
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => apiRequest<{ webhooks: UserWebhook[] }>('/api/webhooks'),
  });

  const hooks = data?.webhooks ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook size={22} className="text-brand-indigo" />
          <h1 className="font-display text-2xl font-bold text-surface-ink dark:text-white">Webhooks</h1>
        </div>
        <CreateWebhookForm onCreated={setNewSecret} />
      </div>

      <div className="card bg-brand-indigo/5 dark:bg-brand-indigo/10">
        <p className="text-sm font-semibold text-surface-ink dark:text-white mb-1">How webhooks work</p>
        <p className="text-xs text-surface-muted leading-relaxed">
          Propel Stack sends a signed HTTP POST to your endpoint when selected events occur.
          Every request includes an <code className="bg-surface-sunk px-1 rounded text-[10px]">X-Propel-Signature: sha256=…</code> header
          for verification. Endpoints must respond with 2xx within 10 seconds.
          After 5 consecutive failures, the webhook is automatically disabled.
        </p>
        <p className="text-xs text-surface-muted mt-2">
          Compatible with Zapier, Make, n8n, and any custom server.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 bg-surface-sunk rounded-xl2 animate-pulse" />)}
        </div>
      ) : hooks.length === 0 ? (
        <div className="card text-center py-10">
          <Webhook size={32} className="mx-auto text-surface-muted mb-3" />
          <p className="font-semibold text-surface-ink dark:text-white">No webhooks yet</p>
          <p className="text-sm text-surface-muted mt-1">Connect Propel Stack to your other tools via webhooks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map(hook => <WebhookRow key={hook.id} hook={hook} />)}
        </div>
      )}

      {newSecret && <SecretModal secret={newSecret} onClose={() => setNewSecret(null)} />}
    </div>
  );
}
