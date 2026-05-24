// ─── ManualWinForm.tsx ────────────────────────────────────────────────────────
// Session 16 — Propel Stack AI, LLC

import { useState } from 'react';
import { useAddLifeWin } from '../api';

interface ManualWinFormProps {
  onSaved?: () => void;
}

export function ManualWinForm({ onSaved }: ManualWinFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const add = useAddLifeWin();

  function handleSubmit() {
    if (!title.trim()) return;
    add.mutate(
      { title: title.trim(), detail: detail.trim(), occurred_on: occurredOn },
      {
        onSuccess: () => {
          setTitle('');
          setDetail('');
          setOccurredOn(new Date().toISOString().slice(0, 10));
          setOpen(false);
          onSaved?.();
        },
      },
    );
  }

  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">✍️</span>
          <p className="text-sm font-semibold text-surface-ink">Add a Life Win</p>
        </div>
        <span className={`text-surface-muted text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-surface-ink/[0.06]">
          <div className="pt-3">
            <label className="label">What happened? *</label>
            <input
              className="input"
              placeholder="e.g. Finished my first 5K without stopping"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              autoFocus
            />
          </div>
          <div>
            <label className="label">A little more detail (optional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="How did it feel? Any context?"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={500}
            />
          </div>
          <div>
            <label className="label">When did it happen?</label>
            <input
              type="date"
              className="input"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim() || add.isPending}
              className="btn flex-1"
            >
              {add.isPending ? 'Saving…' : '🏆 Save Win'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-outline px-4">
              Cancel
            </button>
          </div>
          {add.isError && <p className="text-xs text-red-500">Failed to save — please try again.</p>}
        </div>
      )}
    </div>
  );
}
