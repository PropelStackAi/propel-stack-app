// ─── AI Tutor — Socratic mode ─────────────────────────────────────────────────
// Session 14 (Bug Fix) — Propel Stack AI, LLC
// The tutor NEVER writes essays or does homework. It guides, questions, and scaffolds.

import { useState, useRef, useEffect } from 'react';
import { useTutorChat } from '../api';
import type { TutorMessage } from '../types';

const SUBJECTS = [
  'Mathematics', 'Science', 'History', 'Literature', 'Writing',
  'Programming', 'Economics', 'Philosophy', 'Language', 'Other',
];

export function AITutor(): JSX.Element {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [subject, setSubject] = useState('');
  const chat = useTutorChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || chat.isPending) return;
    const next: TutorMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    chat.mutate(
      { messages: next, subject: subject || undefined },
      {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: "I'm having trouble connecting right now. Please try again in a moment.",
            },
          ]);
        },
      },
    );
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[560px]">
      {/* Header / subject select */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 text-xs text-surface-muted">
          <span className="font-semibold text-brand-coral">Socratic mode</span> — I guide you,
          never write for you.
        </div>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="text-xs border border-surface-ink/10 rounded-lg px-2 py-1.5 bg-surface-raised text-surface-ink"
        >
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-xs text-surface-muted hover:text-surface-ink px-2 py-1 rounded-lg border border-surface-ink/10"
          >
            New session
          </button>
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
            <div className="text-4xl">🎓</div>
            <p className="text-sm font-semibold text-surface-ink">
              What are you working on today?
            </p>
            <p className="text-xs text-surface-muted max-w-xs">
              I'll ask questions and help you think through it — I won't give you the answers
              directly. That's how you actually learn.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {['I need help understanding a concept', 'I\'m stuck on a problem', 'Quiz me on what I know'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="text-xs bg-surface-raised border border-surface-ink/10 rounded-xl px-3 py-1.5 text-surface-muted hover:text-surface-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={[
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-brand-coral text-white rounded-tr-sm'
                  : 'bg-surface-raised text-surface-ink rounded-tl-sm border border-surface-ink/[0.06]',
              ].join(' ')}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {chat.isPending && (
          <div className="flex justify-start">
            <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-2xl rounded-tl-sm px-4 py-2.5">
              <span className="text-sm text-surface-muted animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question or describe what you're working on…"
          rows={2}
          className="flex-1 resize-none border border-surface-ink/10 rounded-xl px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-coral/30"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || chat.isPending}
          className="self-end px-4 py-2 rounded-xl bg-brand-coral text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand-coral/90"
        >
          Send
        </button>
      </div>
      <p className="text-[10px] text-surface-muted mt-1">
        Propel Stack AI · AI is for guidance only — never submit AI-generated work as your own.
      </p>
    </div>
  );
}
