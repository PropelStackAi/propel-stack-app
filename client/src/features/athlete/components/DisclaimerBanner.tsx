import { useState } from 'react';
import { useDismissDisclaimer } from '../api';
import { DISCLAIMER_TEXT, DISCLAIMER_VERSION } from '../types';

interface Props {
  dismissedAt: string | null;
  onDismissed: () => void;
}

function needsRedisplay(dismissedAt: string | null): boolean {
  if (!dismissedAt) return true;
  const dismissed = new Date(dismissedAt);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return dismissed < weekAgo;
}

export function DisclaimerBanner({ dismissedAt, onDismissed }: Props): JSX.Element | null {
  const [showFull, setShowFull] = useState(false);
  const dismiss = useDismissDisclaimer();

  if (!needsRedisplay(dismissedAt)) return null;

  function handleDismiss() {
    dismiss.mutate(undefined, { onSuccess: onDismissed });
  }

  return (
    <>
      {/* Compact banner */}
      <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 flex items-start gap-3">
        <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-800">
            <strong>Disclaimer ({DISCLAIMER_VERSION}):</strong> This Hub is an informational and organizational tool only —
            not a substitute for professional coaching or medical advice.
            {' '}<button onClick={() => setShowFull(true)} className="underline font-semibold">Read full disclaimer</button>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismiss.isPending}
          className="flex-shrink-0 text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg px-2 py-1 hover:bg-amber-100 disabled:opacity-50"
        >
          {dismiss.isPending ? '…' : 'Acknowledge'}
        </button>
      </div>

      {/* Full disclaimer modal */}
      {showFull && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-ink/10">
              <h3 className="font-bold text-surface-ink text-sm">Athlete Performance Hub Disclaimer</h3>
              <button onClick={() => setShowFull(false)} className="text-surface-muted hover:text-surface-ink text-lg">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="whitespace-pre-wrap text-xs text-surface-ink font-sans leading-relaxed">{DISCLAIMER_TEXT}</pre>
            </div>
            <div className="px-5 py-4 border-t border-surface-ink/10 flex gap-3">
              <button onClick={() => setShowFull(false)} className="flex-1 btn-outline text-sm">Close</button>
              <button
                onClick={() => { setShowFull(false); handleDismiss(); }}
                disabled={dismiss.isPending}
                className="flex-1 btn bg-brand-teal text-white text-sm disabled:opacity-50"
              >
                {dismiss.isPending ? 'Saving…' : 'Acknowledge & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
