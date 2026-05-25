/**
 * NPS / In-App Feedback Prompt — Phase 4 Enhancement 39
 * Propel Stack AI, LLC
 *
 * Shown after meaningful sessions (3+ AI interactions).
 * 1-5 scale + optional comment. Dismissable.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MessageSquare, X, Check } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

export function NpsPrompt() {
  const [dismissed, setDismissed] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: eligibility } = useQuery({
    queryKey: ['nps-eligible'],
    queryFn: () => apiRequest<{ eligible: boolean; reason?: string }>('/api/nps/eligible'),
    staleTime: 5 * 60 * 1000,
  });

  const submit = useMutation({
    mutationFn: () =>
      apiRequest('/api/nps', {
        method: 'POST',
        body: { score, comment, context: 'in_app_prompt' },
      }),
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => setDismissed(true), 2000);
    },
  });

  if (!eligibility?.eligible || dismissed) return null;

  const labels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];
  const colors = [
    'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
    'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
    'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700',
    'text-teal-500 bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700',
    'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700',
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 card shadow-xl border border-surface-ink/10 dark:border-white/10">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-brand-indigo" />
          <p className="font-semibold text-sm text-surface-ink dark:text-white">Quick check-in</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-surface-muted hover:text-surface-ink dark:hover:text-white transition-colors"
          aria-label="Dismiss feedback prompt"
        >
          <X size={16} />
        </button>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2 text-green-500 py-2">
          <Check size={18} />
          <span className="text-sm font-semibold">Thanks for your feedback!</span>
        </div>
      ) : (
        <>
          <p className="text-xs text-surface-muted mb-3">How did today's session feel?</p>

          <div className="flex gap-1.5 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                aria-label={`${n} — ${labels[n - 1]}`}
                className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${
                  score === n
                    ? colors[n - 1]
                    : 'border-surface-ink/10 dark:border-white/10 text-surface-muted hover:border-brand-indigo/30'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {score && (
            <p className="text-xs text-center text-surface-muted mb-2">{labels[score - 1]}</p>
          )}

          {score && score <= 3 && (
            <textarea
              className="input w-full text-xs resize-none mb-3"
              rows={2}
              placeholder="What could be better? (optional)"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          )}

          <button
            type="button"
            onClick={() => submit.mutate()}
            disabled={!score || submit.isPending}
            className="w-full py-2 rounded-full bg-brand-indigo text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {submit.isPending ? 'Sending…' : 'Submit'}
          </button>
        </>
      )}
    </div>
  );
}
