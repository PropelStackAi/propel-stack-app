import { useEffect, useState } from 'react';
import { useQuickCapture } from '../api';
import { CAPTURE_LABELS, type CaptureKind } from '../types';

const KINDS: CaptureKind[] = ['task', 'note', 'contact', 'expense'];

/**
 * Global floating Quick Capture (Session 5). Mounted in AppLayout so it appears on
 * every page. Adds a task/note/contact/expense in a few taps.
 */
export function QuickCapture() {
  const capture = useQuickCapture();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CaptureKind>('task');
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function submit() {
    if (!text.trim()) return;
    capture.mutate(
      { kind, text: text.trim(), amount: kind === 'expense' ? Number(amount) || 0 : undefined },
      {
        onSuccess: () => {
          setText('');
          setAmount('');
          setOpen(false);
        },
      },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick capture"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-brand-indigo text-white text-2xl shadow-raised hover:brightness-110 transition"
      >
        +
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-surface-ink/40 backdrop-blur-sm p-4" onMouseDown={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Quick capture">
          <div className="card w-full max-w-md" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg text-surface-ink">Quick capture</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-surface-muted hover:text-surface-ink">✕</button>
            </div>
            <div className="flex gap-1.5 mb-3">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={[
                    'flex-1 rounded-lg px-2 py-1.5 text-sm border',
                    kind === k ? 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/30 font-semibold' : 'border-surface-ink/10 text-surface-ink',
                  ].join(' ')}
                >
                  {CAPTURE_LABELS[k]}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && kind !== 'expense') submit(); }}
              placeholder={kind === 'contact' ? 'Name' : kind === 'expense' ? 'What was it for?' : `New ${kind}…`}
              className="w-full rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none"
            />
            {kind === 'expense' && (
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                className="w-full mt-2 rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none"
              />
            )}
            <button type="button" onClick={submit} disabled={!text.trim() || capture.isPending} className="btn-primary w-full mt-3 disabled:opacity-60">
              {capture.isPending ? 'Saving…' : `Add ${CAPTURE_LABELS[kind].toLowerCase()}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
