import { useState } from 'react';
import { useAsk } from '../api';
import { SectionTitle, inputCls } from './ui';

interface Turn {
  question: string;
  answer: string;
  disclaimer: string;
}

const SUGGESTIONS = [
  'How does an emergency fund work?',
  'What is the difference between a Roth and traditional IRA?',
  'How is APR different from APY?',
];

export function FinanceAssistant() {
  const ask = useAsk();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);

  function send(q: string) {
    const text = q.trim();
    if (!text || ask.isPending) return;
    setQuestion('');
    ask.mutate(text, {
      onSuccess: (res) => setTurns((t) => [...t, { question: text, answer: res.answer, disclaimer: res.disclaimer }]),
    });
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="AI financial Q&A" hint="General financial education only. A disclaimer accompanies every answer." />

      <div className="card space-y-4">
        {turns.length === 0 && (
          <div>
            <p className="text-sm text-surface-muted mb-2">Try a question:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="chip hover:bg-surface-sunk text-surface-ink">{s}</button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="text-sm font-semibold text-surface-ink">{t.question}</div>
            <div className="rounded-xl bg-surface-sunk/60 p-3 text-sm text-surface-ink whitespace-pre-wrap">{t.answer}</div>
            <div className="text-[11px] text-surface-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-coral" aria-hidden /> {t.disclaimer}
            </div>
          </div>
        ))}

        {ask.isPending && <p className="text-sm text-surface-muted">Thinking…</p>}
        {ask.isError && <p className="text-sm text-red-600">{ask.error instanceof Error ? ask.error.message : 'Something went wrong.'}</p>}
      </div>

      <div className="flex gap-2">
        <input
          className={inputCls}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(question); }}
          placeholder="Ask a general finance question…"
        />
        <button type="button" onClick={() => send(question)} disabled={ask.isPending || !question.trim()} className="btn-primary disabled:opacity-60">
          Ask
        </button>
      </div>
    </div>
  );
}
