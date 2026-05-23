import { useState, useRef, useEffect } from 'react';
import { useHomeworkAI, useAwardStars } from '../api';

interface Props {
  childId: string;
}

interface Message {
  role: 'kid' | 'ai';
  text: string;
}

const STARTER_PROMPTS = [
  "I don't understand fractions",
  "What is photosynthesis?",
  "Help me understand multiplication",
  "Why is the sky blue?",
  "How do I write a paragraph?",
];

export function HomeworkHelper({ childId }: Props): JSX.Element {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiMutation = useHomeworkAI();
  const awardStars = useAwardStars();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setInput('');
    setMessages((m) => [...m, { role: 'kid', text: q }]);

    aiMutation.mutate(
      { childId, prompt: q },
      {
        onSuccess: (data) => {
          setMessages((m) => [...m, { role: 'ai', text: data.text }]);
          const newCount = sessionCount + 1;
          setSessionCount(newCount);
          // Award a star every 3 questions
          if (newCount % 3 === 0) {
            awardStars.mutate({ childId, stars: 1 });
          }
        },
        onError: (err) => {
          const msg = (err as Error).message || '';
          setMessages((m) => [
            ...m,
            {
              role: 'ai',
              text: msg.includes('Screen time')
                ? msg
                : "Hmm, I couldn't think of a good hint right now. Try again in a moment! 🤔",
            },
          ]);
        },
      },
    );
  }

  return (
    <div className="flex flex-col rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 overflow-hidden" style={{ height: 420 }}>
      {/* Header */}
      <div className="px-5 py-3 bg-blue-600 text-white">
        <h3 className="font-display font-bold text-base">✏️ Homework Helper</h3>
        <p className="text-xs opacity-80">I'll guide you — not give answers!</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">🧠</div>
            <p className="text-sm text-blue-700 font-semibold mb-3">What are you working on?</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs bg-blue-100 text-blue-700 rounded-full px-3 py-1.5 hover:bg-blue-200 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'kid' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={[
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                m.role === 'kid'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white text-surface-ink border border-blue-100 rounded-bl-sm',
              ].join(' ')}
            >
              {m.role === 'ai' && <span className="mr-1">🤖</span>}
              {m.text}
            </div>
          </div>
        ))}
        {aiMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-white border border-blue-100 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-surface-muted">
              🤔 Thinking of a hint…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 py-3 border-t border-blue-100 bg-white flex gap-2">
        <input
          className="flex-1 rounded-xl border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !aiMutation.isPending && send(input)}
          maxLength={300}
          disabled={aiMutation.isPending}
        />
        <button
          onClick={() => send(input)}
          disabled={aiMutation.isPending || !input.trim()}
          className="btn bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 px-4 text-sm"
        >
          →
        </button>
      </div>
    </div>
  );
}
