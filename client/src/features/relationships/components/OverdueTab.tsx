// ─── Overdue Check-ins Tab ────────────────────────────────────────────────────
// Enhancement 19 — Propel Stack AI, LLC

import { useState } from 'react';
import { useOverdueCheckIns, useLogInteraction } from '../api';
import type { ContactMethod, RelationshipContact } from '../types';

const METHODS: { value: ContactMethod; emoji: string; label: string }[] = [
  { value: 'call',      emoji: '📞', label: 'Call'    },
  { value: 'text',      emoji: '💬', label: 'Text'    },
  { value: 'in_person', emoji: '🤝', label: 'Meet up' },
  { value: 'email',     emoji: '✉️', label: 'Email'   },
  { value: 'video',     emoji: '📹', label: 'Video'   },
];

function OverdueCard({ contact }: { contact: RelationshipContact }) {
  const log = useLogInteraction();
  const [method, setMethod] = useState<ContactMethod>('text');
  const [logging, setLogging] = useState(false);

  function quickLog() {
    log.mutate({ contactId: contact.id, method }, {
      onSuccess: () => setLogging(false),
    });
  }

  const urgency = contact.days_overdue > 30 ? 'high' : contact.days_overdue > 14 ? 'med' : 'low';
  const urgencyStyles = {
    high: 'border-red-200 bg-red-50',
    med:  'border-orange-200 bg-orange-50',
    low:  'border-surface-ink/10 bg-surface-raised',
  }[urgency];

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${urgencyStyles}`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{contact.photo_emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-ink">{contact.name}</p>
          <p className="text-xs text-surface-muted capitalize">
            {contact.relationship} · {contact.days_overdue}d overdue
            {contact.last_contact ? ` · Last: ${contact.last_contact}` : ' · Never logged'}
          </p>
        </div>
        <button type="button" onClick={() => setLogging(!logging)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold flex-shrink-0">
          {logging ? 'Cancel' : 'Log it'}
        </button>
      </div>
      {logging && (
        <div className="space-y-2">
          <div className="flex gap-1 flex-wrap">
            {METHODS.map((m) => (
              <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${method === m.value ? 'bg-brand-teal text-white' : 'bg-white border border-surface-ink/10 text-surface-muted'}`}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={quickLog} disabled={log.isPending}
            className="w-full text-xs bg-brand-teal text-white py-1.5 rounded-xl font-semibold disabled:opacity-40">
            {log.isPending ? 'Saving…' : '✓ Mark as connected'}
          </button>
        </div>
      )}
    </div>
  );
}

export function OverdueTab(): JSX.Element {
  const { data, isLoading } = useOverdueCheckIns();
  const overdue = data?.overdue ?? [];

  if (isLoading) return <p className="text-sm text-surface-muted text-center py-8">Loading…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-surface-muted">People past their check-in cadence, sorted by most overdue.</p>
        {overdue.length > 0 && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
            {overdue.length} overdue
          </span>
        )}
      </div>

      {overdue.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl">✅</p>
          <p className="text-sm font-semibold text-surface-ink mt-2">You're all caught up!</p>
          <p className="text-xs text-surface-muted">No overdue check-ins. Keep it up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {overdue.map((c) => <OverdueCard key={c.id} contact={c} />)}
        </div>
      )}
    </div>
  );
}
