// ─── Article Vault Tab ────────────────────────────────────────────────────────
// Enhancement 20 — Propel Stack AI, LLC
// AI: saves URL + generates 1-sentence summary via claude-haiku-4-5

import { useState } from 'react';
import { useLearningItems, useCreateLearningItem, useDeleteLearningItem, useArticleSummary } from '../api';

export function ArticleVaultTab() {
  const { data, isLoading } = useLearningItems('article');
  const create      = useCreateLearningItem();
  const del         = useDeleteLearningItem();
  const summarize   = useArticleSummary();

  const [showForm, setShowForm]   = useState(false);
  const [url, setUrl]             = useState('');
  const [title, setTitle]         = useState('');
  const [tags, setTags]           = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const articles = data?.items ?? [];

  // Collect all unique tags
  const allTags = Array.from(
    new Set(articles.flatMap((a) => a.tags ? a.tags.split(',').map((t) => t.trim()).filter(Boolean) : [])),
  );

  const filtered = filterTag
    ? articles.filter((a) => a.tags.split(',').map((t) => t.trim()).includes(filterTag))
    : articles;

  async function generateSummary() {
    if (!url && !title) return;
    summarize.mutate({ url: url || undefined }, {
      onSuccess: (d) => setAiSummary(d.summary),
    });
  }

  function submit() {
    if (!url && !title) return;
    create.mutate(
      {
        type: 'article',
        title: title || url,
        url,
        tags,
        notes: aiSummary,
        status: 'finished',
        completed_at: new Date().toISOString().split('T')[0],
      },
      { onSuccess: () => { setShowForm(false); setUrl(''); setTitle(''); setTags(''); setAiSummary(''); } },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Tag filter chips */}
        <div className="flex gap-1 overflow-x-auto">
          <button type="button" onClick={() => setFilterTag('')}
            className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-xl font-semibold ${!filterTag ? 'bg-brand-coral text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'}`}>
            All ({articles.length})
          </button>
          {allTags.map((t) => (
            <button key={t} type="button" onClick={() => setFilterTag(filterTag === t ? '' : t)}
              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-xl font-semibold capitalize ${filterTag === t ? 'bg-brand-coral text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'}`}>
              {t}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-coral text-white px-3 py-1.5 rounded-xl font-semibold flex-shrink-0">
          + Save article
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Save an article</p>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Article URL"
            className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional — auto-filled from URL)"
            className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma-separated: productivity, AI, health)"
            className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />

          {/* AI summary */}
          <div className="space-y-1.5">
            <button type="button" onClick={generateSummary}
              disabled={summarize.isPending || (!url && !title)}
              className="text-xs bg-brand-indigo/10 text-brand-indigo px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40 hover:bg-brand-indigo/20">
              {summarize.isPending ? '🤖 Summarising…' : '🤖 AI summary'}
            </button>
            {aiSummary && (
              <p className="text-xs text-surface-muted italic bg-surface-sunk rounded-lg px-3 py-2">
                "{aiSummary}"
              </p>
            )}
          </div>

          <div className="border-t border-surface-ink/[0.06] pt-2 text-[10px] text-surface-muted">
            🔒 Only the URL is sent to AI for summarisation. No personal data.
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-coral text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Saving…' : 'Save to vault ✓'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-surface-muted text-center py-8">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl">📰</p>
          <p className="text-sm text-surface-muted mt-2">
            {articles.length === 0 ? 'Your article vault is empty.' : 'No articles with this tag.'}
          </p>
          <p className="text-xs text-surface-muted">Save articles with AI one-sentence summaries.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 flex gap-3">
              <span className="text-2xl flex-shrink-0">📰</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-ink leading-snug">{a.title}</p>
                {a.url && (
                  <p className="text-[10px] text-brand-indigo truncate">{a.url}</p>
                )}
                {a.notes && (
                  <p className="text-xs text-surface-muted mt-1 italic">"{a.notes}"</p>
                )}
                {a.tags && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {a.tags.split(',').filter(Boolean).map((t) => (
                      <span key={t} className="text-[10px] bg-brand-coral/10 text-brand-coral px-1.5 py-0.5 rounded-full capitalize">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => del.mutate(a.id)}
                className="text-xs text-surface-muted hover:text-red-500 px-1 flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
