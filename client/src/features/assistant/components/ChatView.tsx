import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { assistantKeys, useConversation, useRateMessage } from '../api';
import { SUGGESTED_PROMPTS, type Message, type Mode, type Model } from '../types';
import { MessageBubble } from './MessageBubble';
import { Selectors } from './Selectors';

interface Pending {
  userText: string;
  streamingText: string;
}

export function ChatView({
  conversationId,
  model,
  mode,
  onModel,
  onMode,
  ensureConversation,
}: {
  conversationId: string | null;
  model: Model;
  mode: Mode;
  onModel: (m: Model) => void;
  onMode: (m: Mode) => void;
  ensureConversation: () => Promise<string>;
}) {
  const qc = useQueryClient();
  const detail = useConversation(conversationId);
  const rate = useRateMessage(conversationId ?? '');
  const esRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [attached, setAttached] = useState<string | null>(null);

  const messages = detail.data?.messages ?? [];

  // Reset transient state when switching conversations.
  useEffect(() => {
    esRef.current?.close();
    esRef.current = null;
    setPending(null);
    setError(null);
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, pending?.streamingText]);

  function finalize(id: string, errMsg?: string) {
    esRef.current?.close();
    esRef.current = null;
    setPending(null);
    if (errMsg) setError(errMsg);
    qc.invalidateQueries({ queryKey: assistantKeys.detail(id) });
    qc.invalidateQueries({ queryKey: assistantKeys.list });
    qc.invalidateQueries({ queryKey: assistantKeys.usage });
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || pending) return;
    setError(null);
    setInput('');
    const composed = attached ? `[Attached: ${attached}] ${text}` : text;
    setAttached(null);

    const id = await ensureConversation();
    setPending({ userText: composed, streamingText: '' });

    const url = `/api/assistant/stream?conversationId=${encodeURIComponent(id)}&message=${encodeURIComponent(composed)}&model=${model}&mode=${mode}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('token', (e) => {
      try {
        const { t } = JSON.parse((e as MessageEvent).data);
        setPending((p) => (p ? { ...p, streamingText: p.streamingText + t } : p));
      } catch {
        /* ignore malformed chunk */
      }
    });
    es.addEventListener('done', () => finalize(id));
    es.addEventListener('budget', (e) => finalize(id, safeError((e as MessageEvent).data, 'Token budget reached.')));
    es.addEventListener('error', (e) => {
      const data = (e as MessageEvent).data;
      finalize(id, data ? safeError(data, 'Something went wrong.') : undefined);
    });
  }

  function regenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) void send(lastUser.content);
  }

  const showSuggestions = !pending && messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-surface-ink/[0.06]">
        <Selectors model={model} mode={mode} onModel={onModel} onMode={onMode} />
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {showSuggestions && (
          <div className="text-center pt-8">
            <h2 className="font-display font-bold text-lg text-surface-ink">Ask anything</h2>
            <p className="text-sm text-surface-muted mt-1 mb-4">Pick a starter or type your own.</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
              {SUGGESTED_PROMPTS[mode].map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="chip hover:bg-surface-sunk text-surface-ink">{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m: Message, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            onRate={m.role === 'assistant' ? (r) => rate.mutate({ messageId: m.id, rating: r }) : undefined}
            onRegenerate={m.role === 'assistant' && i === messages.length - 1 ? regenerate : undefined}
          />
        ))}

        {pending && (
          <>
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-brand-indigo text-white whitespace-pre-wrap">{pending.userText}</div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-surface-raised border border-surface-ink/[0.06] text-surface-ink whitespace-pre-wrap">
                {pending.streamingText || <span className="text-surface-muted">Thinking…</span>}
                {pending.streamingText && <span className="inline-block w-1.5 h-4 align-middle bg-brand-indigo/60 ml-0.5 animate-pulse" aria-hidden />}
              </div>
            </div>
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-red-600 py-1">{error}</p>}
      {attached && (
        <p className="text-xs text-surface-muted py-1">
          Attached: {attached} <button type="button" className="hover:text-red-600" onClick={() => setAttached(null)}>remove</button>
        </p>
      )}

      <div className="flex items-end gap-2 pt-2 border-t border-surface-ink/[0.06]">
        <label className="btn-secondary !py-2 !px-3 !text-xs cursor-pointer shrink-0" title="Attach a file">
          📎
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAttached(f.name); e.target.value = ''; }} />
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Message the assistant…  (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none max-h-32"
        />
        <button type="button" onClick={() => send(input)} disabled={!input.trim() || !!pending} className="btn-primary shrink-0 disabled:opacity-50">
          Send
        </button>
      </div>
    </div>
  );
}

function safeError(data: string, fallback: string): string {
  try {
    return JSON.parse(data).error ?? fallback;
  } catch {
    return fallback;
  }
}
