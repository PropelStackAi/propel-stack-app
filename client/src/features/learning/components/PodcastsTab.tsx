// ─── Podcasts Tab ─────────────────────────────────────────────────────────────
// Enhancement 20 — Propel Stack AI, LLC

import { useState } from 'react';
import { useLearningItems, useCreateLearningItem, useDeleteLearningItem } from '../api';

export function PodcastsTab() {
  const { data, isLoading } = useLearningItems('podcast');
  const create = useCreateLearningItem();
  const del    = useDeleteLearningItem();

  const [showForm, setShowForm]   = useState(false);
  const [show, setShow]           = useState('');
  const [episode, setEpisode]     = useState('');
  const [takeaway, setTakeaway]   = useState('');

  const podcasts = data?.items ?? [];

  function submit() {
    if (!episode) return;
    create.mutate(
      {
        type: 'podcast',
        title: episode,
        author: show,
        key_takeaway: takeaway,
        status: 'finished',
        completed_at: new Date().toISOString().split('T')[0],
      },
      { onSuccess: () => { setShowForm(false); setShow(''); setEpisode(''); setTakeaway(''); } },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-surface-muted">Log episodes with a key takeaway (1–3 sentences).</p>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-coral text-white px-3 py-1.5 rounded-xl font-semibold flex-shrink-0">
          + Log episode
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Log a podcast episode</p>
          <div className="space-y-2">
            <input value={show} onChange={(e) => setShow(e.target.value)} placeholder="Show name"
              className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="Episode title"
              className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <textarea value={takeaway} onChange={(e) => setTakeaway(e.target.value)}
              placeholder="Key takeaway (1–3 sentences)" rows={3}
              className="w-full resize-none border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-coral text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Saving…' : 'Log it ✓'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-surface-muted text-center py-8">Loading…</p>
      ) : podcasts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl">🎙️</p>
          <p className="text-sm text-surface-muted mt-2">No podcast episodes logged yet.</p>
          <p className="text-xs text-surface-muted">Log an episode to capture what you learned.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {podcasts.map((p) => (
            <div key={p.id} className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 flex gap-3">
              <span className="text-2xl flex-shrink-0">🎙️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-ink leading-snug">{p.title}</p>
                {p.author && <p className="text-xs text-surface-muted">{p.author}</p>}
                {p.key_takeaway && (
                  <p className="text-xs text-surface-muted mt-1 italic leading-relaxed">"{p.key_takeaway}"</p>
                )}
                <p className="text-[10px] text-surface-muted mt-1">{p.completed_at ?? ''}</p>
              </div>
              <button type="button" onClick={() => del.mutate(p.id)}
                className="text-xs text-surface-muted hover:text-red-500 px-1 flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
