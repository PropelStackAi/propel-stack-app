import { useState } from 'react';
import { useConversations, useCreateConversation, useDeleteConversation, useUpdateConversation } from '../api';

export function ConversationSidebar({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const conversations = useConversations();
  const create = useCreateConversation();
  const remove = useDeleteConversation();
  const update = useUpdateConversation();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const list = (conversations.data ?? []).filter((c) =>
    c.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function newChat() {
    create.mutate({}, { onSuccess: (c) => onSelect(c.id) });
  }
  function saveRename(id: string) {
    const title = draft.trim();
    if (title) update.mutate({ id, body: { title } });
    setEditingId(null);
  }

  return (
    <div className="flex flex-col h-full">
      <button type="button" onClick={newChat} className="btn-primary w-full !py-2 !text-sm">+ New chat</button>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search chats…"
        className="mt-3 w-full rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none"
      />
      <div className="mt-3 flex-1 overflow-y-auto space-y-0.5 pr-1">
        {list.length === 0 && <p className="text-sm text-surface-muted px-1 py-4 text-center">No conversations yet.</p>}
        {list.map((c) => {
          const active = c.id === selectedId;
          return (
            <div
              key={c.id}
              className={[
                'group flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm',
                active ? 'bg-brand-indigo/10' : 'hover:bg-surface-sunk',
              ].join(' ')}
            >
              {editingId === c.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => saveRename(c.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveRename(c.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="flex-1 rounded border border-surface-ink/15 bg-surface-raised px-2 py-1 text-sm"
                />
              ) : (
                <button type="button" onClick={() => onSelect(c.id)} className={`flex-1 text-left truncate ${active ? 'text-brand-indigo font-semibold' : 'text-surface-ink'}`}>
                  {c.title}
                </button>
              )}
              <button type="button" aria-label="Rename" onClick={() => { setEditingId(c.id); setDraft(c.title); }} className="opacity-0 group-hover:opacity-100 text-xs text-surface-muted hover:text-surface-ink">✎</button>
              <button
                type="button"
                aria-label="Delete"
                onClick={() => { remove.mutate(c.id); if (selectedId === c.id) onSelect(null); }}
                className="opacity-0 group-hover:opacity-100 text-xs text-surface-muted hover:text-red-600"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
