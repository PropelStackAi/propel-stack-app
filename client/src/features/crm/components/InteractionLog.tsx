import { useState } from 'react';
import { useAddInteraction, useDeleteInteraction } from '../api';
import { INTERACTION_LABELS, INTERACTION_TYPES, type ContactInteraction, type InteractionType } from '../types';

const inputCls = 'rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none';

export function InteractionLog({
  contactId,
  interactions,
}: {
  contactId: string;
  interactions: ContactInteraction[];
}) {
  const add = useAddInteraction(contactId);
  const remove = useDeleteInteraction(contactId);

  const [type, setType] = useState<InteractionType>('call');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');

  function submit() {
    if (!occurredAt) return;
    add.mutate(
      { type, occurredAt, notes: notes.trim(), outcome: outcome.trim() },
      {
        onSuccess: () => {
          setNotes('');
          setOutcome('');
        },
      },
    );
  }

  return (
    <div>
      <h3 className="font-display font-bold text-sm text-surface-ink mb-3">Interaction log</h3>

      <div className="rounded-xl bg-surface-sunk/60 p-3 space-y-2">
        <div className="flex gap-2">
          <select value={type} onChange={(e) => setType(e.target.value as InteractionType)} className={`${inputCls} w-32`} aria-label="Interaction type">
            {INTERACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {INTERACTION_LABELS[t]}
              </option>
            ))}
          </select>
          <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className={`${inputCls} flex-1`} aria-label="Interaction date" />
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened?" className={`${inputCls} w-full`} />
        <input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Outcome (optional)" className={`${inputCls} w-full`} />
        <div className="flex justify-end">
          <button type="button" onClick={submit} disabled={add.isPending} className="btn-primary !py-1.5 !text-xs disabled:opacity-60">
            {add.isPending ? 'Logging…' : 'Log interaction'}
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {interactions.length === 0 && <li className="text-sm text-surface-muted">No interactions logged yet.</li>}
        {interactions.map((it) => (
          <li key={it.id} className="flex gap-3">
            <span className="mt-0.5 shrink-0 chip text-surface-muted">{INTERACTION_LABELS[it.type]}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-surface-muted">{it.occurredAt}</span>
                <button
                  type="button"
                  onClick={() => remove.mutate(it.id)}
                  className="text-xs text-surface-muted hover:text-red-600"
                  aria-label="Delete interaction"
                >
                  Delete
                </button>
              </div>
              {it.notes && <p className="text-sm text-surface-ink">{it.notes}</p>}
              {it.outcome && <p className="text-xs text-surface-muted mt-0.5">Outcome: {it.outcome}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
