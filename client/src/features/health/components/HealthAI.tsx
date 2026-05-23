import { useState, useRef, useEffect } from 'react';
import { useHealthAI } from '../api';
import { HEALTH_DISCLAIMER } from '../types';
import { hapticTap } from '../../../lib/native';

interface Message {
  role: 'user' | 'ai';
  text: string;
  crisis?: boolean;
  emergency?: boolean;
  resources?: string[];
}

const STARTER_QUESTIONS = [
  'What foods help lower blood pressure?',
  'How much sleep do adults need?',
  'What are early signs of diabetes?',
  'How can I improve my heart health?',
];

export function HealthAI(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const ai = useHealthAI();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    void hapticTap();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);

    ai.mutate(q, {
      onSuccess: (res) => {
        setMessages((m) => [...m, {
          role: 'ai',
          text: res.text,
          crisis: res.crisis,
          emergency: res.emergency,
          resources: res.resources,
        }]);
      },
      onError: () => {
        setMessages((m) => [...m, { role: 'ai', text: 'Sorry, I could not process your question. Please try again.' }]);
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Guardrail notice */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
        <strong>AI Health Assistant:</strong> Provides general health information only.{' '}
        <strong>Never diagnoses conditions or prescribes treatments.</strong>{' '}
        Always consult a licensed physician for medical advice.
      </div>

      {/* Chat area */}
      <div className="flex flex-col rounded-2xl border border-surface-ink/10 overflow-hidden" style={{ height: 380 }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="text-3xl mb-3">🩺</div>
              <p className="text-sm text-surface-muted mb-4">Ask a general health question</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs bg-surface-sunk text-surface-ink rounded-full px-3 py-1.5 hover:bg-brand-coral/10 hover:text-brand-coral transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={[
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-brand-coral text-white rounded-br-sm'
                  : m.crisis
                  ? 'bg-purple-50 border border-purple-300 text-purple-900 rounded-bl-sm'
                  : m.emergency
                  ? 'bg-red-50 border border-red-300 text-red-900 rounded-bl-sm'
                  : 'bg-surface-sunk text-surface-ink rounded-bl-sm',
              ].join(' ')}>
                {m.crisis && <div className="font-bold mb-1 text-purple-700">⚠️ Mental Health Resources</div>}
                {m.emergency && <div className="font-bold mb-1 text-red-700">🚨 Emergency Response</div>}
                {m.text}
                {m.resources && m.resources.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {m.resources.map((r, ri) => (
                      <li key={ri} className="text-xs font-semibold">• {r}</li>
                    ))}
                  </ul>
                )}
                {m.emergency && (
                  <a href="tel:911" className="inline-block mt-2 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-700">
                    📞 Call 911
                  </a>
                )}
                {m.crisis && (
                  <div className="flex gap-2 mt-2">
                    <a href="tel:988" className="inline-block bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-purple-700">📞 Call 988</a>
                    <a href="sms:741741?body=HOME" className="inline-block bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-purple-200">💬 Text 741741</a>
                  </div>
                )}
              </div>
            </div>
          ))}

          {ai.isPending && (
            <div className="flex justify-start">
              <div className="bg-surface-sunk rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-surface-muted">
                🩺 Searching health information…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-surface-ink/[0.06] bg-surface-raised flex gap-2">
          <input
            className="flex-1 rounded-xl border border-surface-ink/10 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-coral"
            placeholder="Ask a health question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !ai.isPending && send(input)}
            maxLength={400}
            disabled={ai.isPending}
          />
          <button
            onClick={() => send(input)}
            disabled={ai.isPending || !input.trim()}
            className="btn bg-brand-coral text-white hover:bg-brand-coral/90 disabled:opacity-50 px-4"
          >
            →
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-surface-muted">{HEALTH_DISCLAIMER}</p>
    </div>
  );
}
