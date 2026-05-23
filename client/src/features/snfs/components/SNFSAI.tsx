import { useState, useRef, useEffect } from 'react';
import { useSnfsConversations, useCreateConversation, useSnfsMessages, useSendSnfsMessage, useDeleteConversation } from '../api';
import type { SnfsConversation } from '../types';

const STARTER_QUESTIONS = [
  'How do I prepare for my child\'s IEP meeting?',
  'What is the difference between an IEP and a 504 Plan?',
  'What supports help with meltdowns and emotional dysregulation?',
  'How do I explain my child\'s diagnosis to siblings?',
  'What transition resources are available at age 14?',
  'How can I reduce caregiver burnout?',
];

/**
 * SNFS AI Q&A — Session 12.
 * Crisis detection runs server-side before every AI call.
 * Empathy-first. Never diagnoses. Never recommends medications.
 */
export function SNFSAI(): JSX.Element {
  const { data: conversations = [], isLoading } = useSnfsConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();

  // Auto-select first conversation
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  async function startNewConversation() {
    const conv = await createConv.mutateAsync({ title: 'New conversation' });
    setActiveConvId(conv.id);
  }

  return (
    <div className="space-y-4">
      {/* Guardrail notice */}
      <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 text-xs text-purple-800">
        <strong>AI Support Assistant:</strong> Provides general information and emotional support only.{' '}
        <strong>Never diagnoses conditions or recommends medications.</strong>{' '}
        Cites DSM-5, IDEA 2004, AAP, CDC, and NAMI. Always consult a licensed professional.{' '}
        Crisis messages automatically surface emergency resources.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        {/* Conversation list */}
        <div className="space-y-1">
          <button
            onClick={startNewConversation}
            disabled={createConv.isPending}
            className="w-full btn bg-brand-purple text-white hover:bg-brand-purple/90 text-xs mb-2 disabled:opacity-50"
          >
            + New conversation
          </button>
          {isLoading && <p className="text-xs text-surface-muted">Loading…</p>}
          {conversations.map((conv) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeConvId}
              onSelect={() => setActiveConvId(conv.id)}
              onDelete={() => {
                deleteConv.mutate(conv.id, {
                  onSuccess: () => {
                    if (activeConvId === conv.id) setActiveConvId(null);
                  },
                });
              }}
            />
          ))}
          {!isLoading && conversations.length === 0 && (
            <p className="text-xs text-surface-muted text-center py-4">No conversations yet.</p>
          )}
        </div>

        {/* Chat area */}
        {activeConvId ? (
          <ChatArea conversationId={activeConvId} />
        ) : (
          <div className="rounded-2xl border border-surface-ink/10 flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: 360 }}>
            <div className="text-4xl mb-3">💜</div>
            <p className="text-sm text-surface-muted mb-4">Start a conversation or select one from the list.</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {STARTER_QUESTIONS.slice(0, 3).map((q) => (
                <button
                  key={q}
                  onClick={async () => {
                    const conv = await createConv.mutateAsync({ title: q.slice(0, 60) });
                    setActiveConvId(conv.id);
                  }}
                  className="text-xs bg-purple-50 text-purple-700 rounded-full px-3 py-1.5 hover:bg-purple-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConvItem({ conv, active, onSelect, onDelete }: {
  conv: SnfsConversation; active: boolean;
  onSelect: () => void; onDelete: () => void;
}): JSX.Element {
  return (
    <div className={`flex items-center gap-1 rounded-xl px-2 py-1.5 group ${active ? 'bg-purple-100' : 'hover:bg-surface-sunk'}`}>
      <button onClick={onSelect} className="flex-1 text-left text-xs text-surface-ink truncate">
        {conv.title}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 text-surface-muted hover:text-red-500 text-sm shrink-0 w-5 text-center"
      >
        ×
      </button>
    </div>
  );
}

function ChatArea({ conversationId }: { conversationId: string }): JSX.Element {
  const { data: messages = [], isLoading } = useSnfsMessages(conversationId);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const send = useSendSnfsMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const q = input.trim();
    if (!q || send.isPending) return;
    setInput('');
    send.mutate({ conversationId, content: q });
  }

  return (
    <div className="flex flex-col rounded-2xl border border-surface-ink/10 overflow-hidden" style={{ minHeight: 360, maxHeight: 520 }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && <p className="text-sm text-surface-muted">Loading…</p>}

        {!isLoading && messages.length === 0 && (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">💜</div>
            <p className="text-sm text-surface-muted mb-4">Ask a question about special needs caregiving</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(''); send.mutate({ conversationId, content: q }); }}
                  className="text-xs bg-purple-50 text-purple-700 rounded-full px-3 py-1.5 hover:bg-purple-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={[
              'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
              m.role === 'user'
                ? 'bg-brand-purple text-white rounded-br-sm'
                : m.is_crisis
                ? 'bg-red-50 border border-red-300 text-red-900 rounded-bl-sm'
                : 'bg-surface-sunk text-surface-ink rounded-bl-sm',
            ].join(' ')}>
              {m.is_crisis && m.role === 'assistant' && (
                <div className="font-bold mb-2 text-red-700">🚨 Crisis Resources</div>
              )}
              {m.content}
              {m.is_crisis && m.role === 'assistant' && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <a href="tel:911" className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-700">📞 Call 911</a>
                  <a href="tel:988" className="inline-block bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-purple-700">📞 Call 988</a>
                  <a href="sms:741741?body=HOME" className="inline-block bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-purple-200">💬 Text 741741</a>
                </div>
              )}
            </div>
          </div>
        ))}

        {send.isPending && (
          <div className="flex justify-start">
            <div className="bg-surface-sunk rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-surface-muted">
              💜 Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-3 border-t border-surface-ink/[0.06] bg-surface-raised flex gap-2">
        <input
          className="flex-1 rounded-xl border border-surface-ink/10 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
          placeholder="Ask about special needs support, IEP, strategies…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !send.isPending && handleSend()}
          maxLength={2000}
          disabled={send.isPending}
        />
        <button
          onClick={handleSend}
          disabled={send.isPending || !input.trim()}
          className="btn bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50 px-4"
        >
          →
        </button>
      </div>
    </div>
  );
}
