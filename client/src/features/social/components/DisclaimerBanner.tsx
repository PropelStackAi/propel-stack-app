// ─── Social & Media Hub — Disclaimer Banner ──────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import { DISCLAIMER_TEXT, DISCLAIMER_VERSION } from '../types';

interface Props {
  dismissedAt: string | null;
  onDismissed: () => void;
}

export function DisclaimerBanner({ dismissedAt, onDismissed }: Props): JSX.Element | null {
  if (dismissedAt !== null) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-amber-800 select-none list-none flex items-center gap-2">
          <span>⚠️</span>
          <span>Social &amp; Media Hub Disclaimer ({DISCLAIMER_VERSION})</span>
          <span className="ml-auto text-amber-500 text-xs">(click to expand)</span>
        </summary>
        <div className="mt-3 space-y-3">
          <pre className="whitespace-pre-wrap text-xs text-surface-muted font-sans leading-relaxed">
            {DISCLAIMER_TEXT}
          </pre>
          <button
            onClick={onDismissed}
            className="btn bg-amber-600 text-white text-xs hover:bg-amber-700"
          >
            I understand — Dismiss
          </button>
        </div>
      </details>
    </div>
  );
}
