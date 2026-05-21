import { useCallback, useEffect, useRef, useState } from 'react';
import { useAcknowledgeDisclaimer } from '../api';
import {
  DISCLAIMER_BUTTON_TEXT,
  DISCLAIMER_PARAGRAPHS,
  FINHUB_DISCLAIMER_VERSION,
} from '../constants';

/**
 * Legal disclaimer gate (PSAI-FINHUB-DISC-v1.0), implemented exactly per the Build Guide:
 *  - full-screen, scroll-locked (the page behind cannot scroll)
 *  - the Agree button is disabled until the user scrolls the disclaimer to the bottom
 *  - a typed full-name signature is required
 *  - the acknowledgment is persisted server-side (no browser storage)
 */
export function DisclaimerGate() {
  const acknowledge = useAcknowledgeDisclaimer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [signature, setSignature] = useState('');

  // Scroll-lock the page behind the gate.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // If the text isn't tall enough to scroll, treat it as already read.
    if (el.scrollHeight - el.clientHeight <= 2) {
      setScrolledToBottom(true);
      return;
    }
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledToBottom(true);
    }
  }, []);

  useEffect(() => {
    checkAtBottom();
    window.addEventListener('resize', checkAtBottom);
    return () => window.removeEventListener('resize', checkAtBottom);
  }, [checkAtBottom]);

  const canSubmit = scrolledToBottom && signature.trim().length > 0 && !acknowledge.isPending;

  function submit() {
    if (!canSubmit) return;
    acknowledge.mutate(signature.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-ink/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Financial Hub legal disclaimer"
    >
      <div className="card w-full max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-surface-ink/[0.06]">
          <div className="chip bg-brand-indigo/10 text-brand-indigo border-transparent ring-1 ring-brand-indigo/20">
            {FINHUB_DISCLAIMER_VERSION}
          </div>
          <h2 className="mt-2 font-display font-extrabold text-xl text-surface-ink">
            Before you enter the Financial Hub
          </h2>
          <p className="text-sm text-surface-muted mt-1">
            Please read this disclaimer in full. Scroll to the bottom, then sign to continue.
          </p>
        </div>

        <div
          ref={scrollRef}
          onScroll={checkAtBottom}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-3 text-sm text-surface-ink leading-relaxed bg-surface-sunk/40"
        >
          {DISCLAIMER_PARAGRAPHS.map((p, i) => (
            <p key={i} className={i === 0 ? 'font-semibold' : ''}>
              {p}
            </p>
          ))}
          <div aria-hidden className="pt-1 text-center text-xs text-surface-muted">
            — end of disclaimer —
          </div>
        </div>

        <div className="px-6 py-4 border-t border-surface-ink/[0.06] space-y-3">
          {!scrolledToBottom && (
            <p className="text-xs text-brand-coral font-medium">
              Scroll to the bottom of the disclaimer to enable the button.
            </p>
          )}
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-surface-muted mb-1">
              Type your full name as an electronic signature
            </span>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none"
            />
          </label>
          {acknowledge.isError && (
            <p className="text-sm text-red-600">Could not record acknowledgment. Please try again.</p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {acknowledge.isPending ? 'Recording…' : DISCLAIMER_BUTTON_TEXT}
          </button>
        </div>
      </div>
    </div>
  );
}
