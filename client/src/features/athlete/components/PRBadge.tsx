import { useEffect, useState } from 'react';
import type { AthletePR } from '../types';

interface Props {
  newPRs: AthletePR[];
  onDismiss: () => void;
}

export function PRBadge({ newPRs, onDismiss }: Props): JSX.Element | null {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!newPRs.length) return null;

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center p-6 transition-all duration-400',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }} />

      {/* Badge */}
      <div className="relative bg-white rounded-3xl shadow-2xl px-8 py-8 max-w-sm w-full text-center animate-bounce-in">
        <div className="text-6xl mb-3">🏆</div>
        <h2 className="text-2xl font-black text-surface-ink mb-1">
          {newPRs.length === 1 ? 'New PR!' : `${newPRs.length} New PRs!`}
        </h2>
        <p className="text-sm text-surface-muted mb-4">Personal record{newPRs.length > 1 ? 's' : ''} achieved!</p>

        <div className="space-y-2 mb-5">
          {newPRs.map((pr, i) => (
            <div key={i} className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-bold text-amber-800">{pr.exercise}</span>
              <span className="text-sm font-black text-amber-600">{pr.value} {pr.unit}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }}
          className="btn bg-brand-teal text-white w-full"
        >
          Keep crushing it! 💪
        </button>
      </div>
    </div>
  );
}
