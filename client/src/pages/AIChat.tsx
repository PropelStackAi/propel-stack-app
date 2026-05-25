/**
 * AI Chat with Full Life OS Memory — Session 14 Enhancement 7
 * Propel Stack AI, LLC
 *
 * Context-aware AI that knows the user's complete Life OS data.
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Plus, MessageSquare, ChevronRight, Zap, Brain, Coins } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

interface Thread {
  id: string;
  title: string;
  hub_context: string;
  last_message_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  model_used: string;
  created_at: string;
}

const SUGGESTED_PROMPTS = [
  "What's my net worth trend?",
  "How are my goals tracking?",
  "Summarize my week",
  "What bills are due soon?",
  "How's my mood trend this month?",
  "What should I focus on today?",
];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-brand-indigo/10 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
          <Brain size={14} className="text-brand-indigo" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? 'bg-brand-indigo text-white rounded-tr-sm' : 'bg-surface-raised text-surface-ink rounded-tl-sm'}`}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {!isUser && message.tokens_used > 0 && (
          <div className="flex items-center gap-1 mt-2 opacity-50">
            <Coins size={10} />
            <span className="text-xs">{message.tokens_used} tokens · {message.model_used}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadSidebar({ threads, selectedId, onSelect, onNew }: { threads: Thread[]; selectedId: string | null; onSelect: (id: string) => void; onNew: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <button onClick={onNew} className="btn-primary flex items-center gap-2 mb-3">
        <Plus size={15} /> New Conversation
      </button>
      <div className="flex-1 overflow-y-auto space-y-1">
        {threads.length === 0 ? (
          <p className="text-xs text-surface-muted text-center py-4">No conversations yet</p>
        ) : threads.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${selectedId === t.id ? 'bg-brand-indigo/10 text-brand-indigo' : 'hover:bg-surface-raised text-surface-ink'}`}
          >
            <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
            <span className="text-sm truncate">{t.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AIChat() {
  const qc = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: threads = [] } = useQuery({
    queryKey: ['ai-chat', 'threads'],
    queryFn: () => apiRequest<Thread[]>('/api/ai-chat/threads'),
    staleTime: 2 * 60_000,
  });

  const { data: threadData } = useQuery({
    queryKey: ['ai-chat', 'messages', selectedThreadId],
    queryFn: () => apiRequest<{ thread: Thread; messages: Message[] }>(`/api/ai-chat/threads/${selectedThreadId}/messages`),
    enabled: !!selectedThreadId,
    staleTime: 0,
  });

  const messages = threadData?.messages ?? [];

  const createThread = useMutation({
    mutationFn: () => apiRequest<{ id: string }>('/api/ai-chat/threads', { method: 'POST', body: { hub_context: [] } }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai-chat', 'threads'] });
      setSelectedThreadId(data.id);
    },
  });

  const sendMessage = useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      apiRequest<Message>(`/api/ai-chat/threads/${threadId}/messages`, { method: 'POST', body: { content } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-chat', 'messages', selectedThreadId] });
      qc.invalidateQueries({ queryKey: ['ai-chat', 'threads'] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    if (!input.trim() || sendMessage.isPending) return;
    const content = input.trim();
    setInput('');

    let threadId = selectedThreadId;
    if (!threadId) {
      const newThread = await createThread.mutateAsync();
      threadId = newThread.id;
    }

    // Optimistic user message
    qc.setQueryData(['ai-chat', 'messages', threadId], (old: { thread: Thread; messages: Message[] } | undefined) => ({
      thread: old?.thread ?? { id: threadId!, title: 'New conversation', hub_context: '[]', last_message_at: new Date().toISOString() },
      messages: [...(old?.messages ?? []), { id: 'temp-' + Date.now(), role: 'user' as const, content, tokens_used: 0, model_used: '', created_at: new Date().toISOString() }],
    }));

    sendMessage.mutate({ threadId: threadId!, content });
  }

  function handlePrompt(prompt: string) {
    setInput(prompt);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-indigo/10 text-brand-indigo border-transparent ring-1 ring-brand-indigo/20">Life OS</span>
        <span className="chip text-surface-muted">AI Chat</span>
      </div>
      <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink mb-1">AI Chat</h1>
      <p className="text-sm text-surface-muted mb-5">Context-aware AI with full access to your Life OS data</p>

      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-4" style={{ height: 'calc(100vh - 18rem)' }}>
        {/* Thread Sidebar */}
        <div className="card overflow-hidden flex flex-col">
          <ThreadSidebar
            threads={threads}
            selectedId={selectedThreadId}
            onSelect={setSelectedThreadId}
            onNew={() => { setSelectedThreadId(null); createThread.mutate(); }}
          />
        </div>

        {/* Chat Area */}
        <div className="card flex flex-col overflow-hidden">
          {!selectedThreadId ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-indigo/10 flex items-center justify-center mb-4">
                <Brain size={32} className="text-brand-indigo" />
              </div>
              <h2 className="font-display font-bold text-xl text-surface-ink mb-2">Your Life OS AI</h2>
              <p className="text-sm text-surface-muted mb-6 max-w-sm">Ask questions about your own data — finances, goals, mood trends, upcoming events, and more.</p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePrompt(p)}
                    className="text-left text-sm p-3 rounded-xl bg-surface-raised hover:bg-surface-sunk transition-colors text-surface-ink flex items-start gap-2"
                  >
                    <ChevronRight size={14} className="text-brand-indigo flex-shrink-0 mt-0.5" />
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="pb-3 mb-3 border-b border-surface-ink/[0.06] flex items-center gap-2">
                <Brain size={16} className="text-brand-indigo" />
                <span className="font-display font-bold text-sm text-surface-ink truncate">{threadData?.thread?.title ?? 'Conversation'}</span>
                <div className="ml-auto flex items-center gap-1 text-xs text-surface-muted">
                  <Zap size={11} /> Context-aware
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-surface-muted">
                    <p className="text-sm">Start the conversation — ask about your data.</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {SUGGESTED_PROMPTS.slice(0, 3).map((p) => (
                        <button key={p} onClick={() => handlePrompt(p)} className="text-xs px-3 py-1.5 bg-surface-raised rounded-full hover:bg-surface-sunk transition-colors">{p}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.filter((m) => m.role !== 'system').map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {sendMessage.isPending && (
                  <div className="flex justify-start mb-3">
                    <div className="w-7 h-7 rounded-xl bg-brand-indigo/10 flex items-center justify-center flex-shrink-0 mr-2">
                      <Brain size={14} className="text-brand-indigo" />
                    </div>
                    <div className="bg-surface-raised rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 bg-surface-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="mt-3 pt-3 border-t border-surface-ink/[0.06]">
                <div className="flex items-end gap-2">
                  <textarea
                    className="flex-1 resize-none text-sm text-surface-ink placeholder-surface-muted focus:outline-none bg-surface-raised rounded-xl px-4 py-3 max-h-32"
                    rows={1}
                    placeholder="Ask about your finances, goals, mood, events…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sendMessage.isPending}
                    className="p-3 rounded-xl bg-brand-indigo text-white disabled:opacity-40 hover:bg-brand-indigo/90 transition-colors flex-shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-xs text-surface-muted mt-2 text-center">Not financial, medical, or legal advice. PSAI-SMH-DISC-v1.0</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
