import { useState, useRef, useEffect } from 'react';
import { useAthleteAsk } from '../api';
import type { AthleteProfile } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  injuryAlert?: boolean;
}

interface Props { profile: AthleteProfile; }

const STARTER_QUESTIONS = [
  'How can I improve my running economy?',
  'What should I eat before a long training session?',
  'How do I know if I\'m overtraining?',
  'Explain progressive overload for my sport.',
  'How can I improve my sleep for better recovery?',
];

export function AthleteAI({ profile }: Props): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const ask = useAthleteAsk();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sports: string[] = (() => { try { return JSON.parse(profile.sports) as string[]; } catch { return []; } })();

  function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question) return;
    const userMsg: Message = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    ask.mutate({ question }, {
      onSuccess: (data) => {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.answer,
          injuryAlert: data.injuryDetected,
        }]);
      },
      onError: () => {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: 'Sorry — I couldn\'t reach the AI service. Check your connection and try again.',
        }]);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-xs text-teal-800">
        <strong>AI Coach:</strong> General training and nutrition guidance for {sports.join(', ') || 'your sport'}.
        {profile.is_youth_under_14 && ' Youth safety mode active — responses are age-appropriate and coach-review is recommended.'}
        {' '}Not a substitute for a qualified coach or sports medicine professional.
      </div>

      {/* Starter questions */}
      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-surface-muted font-semibold">Suggested questions:</p>
          <div className="flex flex-col gap-1.5">
            {STARTER_QUESTIONS.map((q) => (
              <button key={q} onClick={() => send(q)}
                className="text-left text-xs text-brand-teal bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 hover:bg-teal-100 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={[
                'max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-brand-teal text-white rounded-tr-sm'
                  : msg.injuryAlert
                    ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-sm'
                    : 'bg-surface-raised border border-surface-ink/[0.06] text-surface-ink rounded-tl-sm',
              ].join(' ')}>
                {msg.injuryAlert && (
                  <div className="font-bold text-red-700 mb-1">⚠️ Injury / Safety Alert</div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {ask.isPending && (
            <div className="flex justify-start">
              <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
        <input
          className="input flex-1 text-sm"
          placeholder="Ask your AI coach anything about training, nutrition, or recovery…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={ask.isPending}
        />
        <button type="submit" disabled={!input.trim() || ask.isPending}
          className="btn bg-brand-teal text-white text-sm px-4 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {messages.length > 0 && (
        <button onClick={() => setMessages([])} className="text-xs text-surface-muted hover:text-surface-ink">
          Clear conversation
        </button>
      )}
    </div>
  );
}
