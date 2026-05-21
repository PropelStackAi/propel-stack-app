import { useState } from 'react';
import { useCreateConversation } from '../features/assistant/api';
import { BudgetBanner } from '../features/assistant/components/BudgetBanner';
import { ChatView } from '../features/assistant/components/ChatView';
import { ConversationSidebar } from '../features/assistant/components/ConversationSidebar';
import type { Mode, Model } from '../features/assistant/types';

export function AIAssistant() {
  const create = useCreateConversation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [model, setModel] = useState<Model>('gpt-mini');
  const [mode, setMode] = useState<Mode>('general');

  async function ensureConversation(): Promise<string> {
    if (selectedId) return selectedId;
    const conv = await create.mutateAsync({ model, mode });
    setSelectedId(conv.id);
    return conv.id;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-coral/10 text-brand-coral border-transparent ring-1 ring-brand-coral/20">Session 4</span>
        <span className="chip text-surface-muted">AI Assistant</span>
      </div>
      <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink mb-3">AI Assistant</h1>

      <BudgetBanner />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6">
        <aside className="card p-3 lg:h-[calc(100vh-12rem)]">
          <ConversationSidebar selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
        <section className="card">
          <ChatView
            conversationId={selectedId}
            model={model}
            mode={mode}
            onModel={setModel}
            onMode={setMode}
            ensureConversation={ensureConversation}
          />
        </section>
      </div>
    </div>
  );
}
