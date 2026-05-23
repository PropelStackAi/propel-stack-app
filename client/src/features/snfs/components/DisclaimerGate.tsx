import { useRef, useState, useEffect } from 'react';
import { DISCLAIMER_TEXT, DISCLAIMER_VERSION } from '../types';
import { useAcknowledgeDisclaimer } from '../api';

/**
 * PSAI-SNFS-DISC-v1.0 Disclaimer Gate.
 *
 * Full-screen scroll-lock modal. The "I Understand & Agree" button is
 * DISABLED until the user scrolls to the very bottom of the disclaimer text.
 * Acknowledgment is stored in snfs_disclaimer_acknowledgments via the API.
 */
export function DisclaimerGate({ onAgreed }: { onAgreed: () => void }): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const acknowledge = useAcknowledgeDisclaimer();

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    // Allow 16px tolerance for sub-pixel rendering
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      setScrolledToBottom(true);
    }
  }

  // In case the disclaimer is shorter than the viewport (e.g., large screen)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) {
      setScrolledToBottom(true);
    }
  }, []);

  function handleAgree() {
    acknowledge.mutate(undefined, {
      onSuccess: () => onAgreed(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="bg-purple-700 px-6 py-5 flex-shrink-0">
          <div className="text-xs font-bold text-purple-200 uppercase tracking-widest mb-1">{DISCLAIMER_VERSION}</div>
          <h2 className="font-display font-extrabold text-white text-xl leading-tight">
            Special Needs Family Support Hub
          </h2>
          <p className="text-purple-200 text-sm mt-1">
            Please read this notice in full before continuing.
          </p>
        </div>

        {/* Scrollable disclaimer */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5 text-sm text-gray-800 leading-relaxed"
          style={{ minHeight: 0 }}
        >
          {DISCLAIMER_TEXT.split('\n').map((line, i) =>
            line.trim() === '' ? (
              <div key={i} className="h-3" />
            ) : line.startsWith('•') ? (
              <div key={i} className="flex gap-2 my-1">
                <span className="text-red-600 flex-shrink-0">{line[0]}</span>
                <span>{line.slice(1).trim()}</span>
              </div>
            ) : line.startsWith('IMPORTANT NOTICE') ? (
              <h3 key={i} className="font-extrabold text-base text-gray-900 mb-2">{line}</h3>
            ) : line.startsWith('IMMEDIATE CRISIS') || line.startsWith('For IMMEDIATE') || line.startsWith('This tool does not') || line.startsWith('By tapping') ? (
              <p key={i} className="font-semibold text-gray-900 my-2">{line}</p>
            ) : (
              <p key={i} className="my-1">{line}</p>
            )
          )}

          {/* Scroll-to-bottom indicator */}
          {!scrolledToBottom && (
            <div className="flex items-center gap-2 mt-4 text-xs text-purple-600 font-semibold">
              <span className="animate-bounce">↓</span>
              Scroll down to read the full notice and enable the agreement button.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50">
          {!scrolledToBottom && (
            <p className="text-xs text-gray-500 mb-3 text-center">
              Read the full notice above to enable the button.
            </p>
          )}
          <button
            onClick={handleAgree}
            disabled={!scrolledToBottom || acknowledge.isPending}
            className={[
              'w-full py-3 rounded-xl font-bold text-sm transition-all',
              scrolledToBottom
                ? 'bg-purple-700 text-white hover:bg-purple-800 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            {acknowledge.isPending ? 'Saving…' : 'I Understand & Agree'}
          </button>
          {acknowledge.isError && (
            <p className="text-xs text-red-600 mt-2 text-center">Could not save acknowledgment. Please try again.</p>
          )}
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            {DISCLAIMER_VERSION} · Propel Stack AI, LLC
          </p>
        </div>
      </div>
    </div>
  );
}
