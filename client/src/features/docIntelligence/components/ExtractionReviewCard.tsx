// ─── Extraction Review Card ───────────────────────────────────────────────────
// Enhancement 23 — Propel Stack AI, LLC
// Shows extracted fields for user review before confirming hub population.

import { useState } from 'react';
import { useConfirmExtraction, useDismissExtraction } from '../api';
import { DOC_TYPE_META, confidenceLabel, formatFieldKey, formatFieldValue, type DocExtraction } from '../types';

interface Props {
  extraction: DocExtraction;
  onDone: () => void;
}

export function ExtractionReviewCard({ extraction, onDone }: Props) {
  const confirm = useConfirmExtraction();
  const dismiss = useDismissExtraction();

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);

  const meta = DOC_TYPE_META[extraction.docType];
  const { label: confLabel, colorClass: confColor } = confidenceLabel(extraction.confidence);

  // Merge original fields with any user edits for display
  const displayFields = { ...extraction.fields, ...edits };

  function handleConfirm() {
    // Merge edits back into original fields for submission
    const finalFields: Record<string, unknown> = { ...extraction.fields };
    for (const [k, v] of Object.entries(edits)) {
      finalFields[k] = v;
    }
    confirm.mutate(
      { id: extraction.id, fields: finalFields },
      {
        onSuccess: (res) => {
          setActionsTaken(res.actions_taken);
          setDone(true);
          setTimeout(onDone, 3000);
        },
      },
    );
  }

  function handleDismiss() {
    dismiss.mutate(extraction.id, { onSuccess: onDone });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <p className="text-sm font-semibold text-green-700">Extraction confirmed</p>
        </div>
        {actionsTaken.map((action) => (
          <p key={action} className="text-xs text-green-600 ml-5">• {action}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-ink/10 bg-surface-raised p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-surface-ink">{meta.label}</p>
            <p className="text-xs text-surface-muted">→ {meta.hub}</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold ${confColor}`}>{confLabel}</span>
      </div>

      {/* Doc source */}
      {extraction.docTitle && (
        <p className="text-xs text-surface-muted">
          Source: <span className="text-surface-ink">{extraction.docTitle}</span>
          {extraction.docCategory ? ` · ${extraction.docCategory}` : ''}
        </p>
      )}

      {/* Extracted fields — editable */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">
          Extracted Fields — Review before saving
        </p>
        {Object.entries(displayFields).map(([key, value]) => (
          <div key={key} className="grid grid-cols-[140px_1fr] gap-2 items-start">
            <span className="text-xs text-surface-muted pt-1.5">{formatFieldKey(key)}</span>
            {typeof value === 'boolean' || typeof value === 'number' || Array.isArray(value) ? (
              <span className="text-xs text-surface-ink bg-surface-sunk rounded px-2 py-1.5">
                {formatFieldValue(value)}
              </span>
            ) : (
              <input
                className="text-xs bg-surface-sunk border border-surface-ink/10 rounded px-2 py-1.5 text-surface-ink focus:outline-none focus:ring-1 focus:ring-brand-indigo/40 w-full"
                value={edits[key] !== undefined ? edits[key] : formatFieldValue(value)}
                onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="—"
              />
            )}
          </div>
        ))}
      </div>

      {/* Privacy notices */}
      <div className="rounded-lg bg-surface-sunk/60 p-3 space-y-1">
        <p className="text-[10px] text-surface-muted font-semibold">🔒 Privacy & Safety</p>
        <p className="text-[10px] text-surface-muted">Account numbers and SSNs were automatically masked before any AI analysis.</p>
        {(extraction.docType === 'medical_lab' || extraction.docType === 'prescription') && (
          <p className="text-[10px] text-surface-muted">Medical data stays in your private record — never shared with other hubs.</p>
        )}
        <p className="text-[10px] text-surface-muted">Source document remains in your Vault. Nothing is saved until you confirm.</p>
      </div>

      {/* Low confidence warning */}
      {extraction.confidence < 0.45 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-xs text-yellow-700">⚠ AI confidence is low for this document. Please review all fields carefully before confirming.</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirm.isPending}
          className="flex-1 bg-brand-indigo text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-brand-indigo/90 disabled:opacity-40 transition-colors"
        >
          {confirm.isPending ? 'Saving…' : `Confirm → Add to ${meta.hub}`}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismiss.isPending}
          className="text-xs text-surface-muted hover:text-surface-ink px-3 py-2 rounded-xl hover:bg-surface-sunk transition-colors"
        >
          Dismiss
        </button>
      </div>

      {confirm.isError && (
        <p className="text-xs text-red-500">Failed to save. Please try again.</p>
      )}
    </div>
  );
}
