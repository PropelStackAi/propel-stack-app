// ─── NewsHub.tsx ─────────────────────────────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import React, { useState } from 'react';
import {
  useNewsSources,
  useNewsFeed,
  useToggleNewsSource,
  useDeleteNewsSource,
  useAddNewsSource,
  useArticleSummary,
  useWatchlistTopics,
} from '../api';
import type { NewsSource, NewsArticle, BiasLabel } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function BiasChip({ label }: { label: BiasLabel }) {
  const styles: Record<BiasLabel, string> = {
    left: 'bg-blue-100 text-blue-700',
    center: 'bg-green-100 text-green-700',
    right: 'bg-red-100 text-red-700',
    unknown: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${styles[label]}`}>
      {label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div className="bg-surface-raised rounded-xl p-4 animate-pulse space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/4" />
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
    </div>
  );
}

// ─── Source Row ───────────────────────────────────────────────────────────────

interface SourceRowProps {
  source: NewsSource;
  onToggle: (id: string, is_active: boolean) => void;
  onDelete: (id: string) => void;
  toggling: boolean;
  deleting: boolean;
}

function SourceRow({ source, onToggle, onDelete, toggling, deleting }: SourceRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-surface-ink/[0.06] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-surface-ink truncate">{source.source_name}</p>
        <BiasChip label={source.bias_label} />
      </div>
      <button
        type="button"
        onClick={() => onToggle(source.id, !source.is_active)}
        disabled={toggling}
        aria-label={source.is_active ? 'Deactivate source' : 'Activate source'}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${source.is_active ? 'bg-brand-teal' : 'bg-gray-300'}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${source.is_active ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
      <button
        type="button"
        onClick={() => onDelete(source.id)}
        disabled={deleting}
        className="text-gray-400 hover:text-red-500 transition-colors text-xs"
        aria-label="Delete source"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────

interface ArticleCardProps {
  article: NewsArticle;
}

function ArticleCard({ article }: ArticleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const summarize = useArticleSummary();

  function handleSummarize() {
    if (aiSummary) {
      setExpanded(!expanded);
      return;
    }
    summarize.mutate(
      { title: article.title, text: article.summary },
      {
        onSuccess: (data) => {
          setAiSummary(data.summary);
          setExpanded(true);
        },
      }
    );
  }

  return (
    <div className="bg-surface-raised rounded-xl p-4 space-y-1.5">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-surface-ink hover:text-brand-teal leading-snug line-clamp-2"
      >
        {article.title}
      </a>
      <div className="flex items-center gap-2">
        <span className="text-xs text-surface-muted">{article.source}</span>
        <BiasChip label={article.bias_label} />
        <span className="text-xs text-surface-muted ml-auto">{timeAgo(article.published_at)}</span>
      </div>
      <p className="text-xs text-surface-muted line-clamp-2">{article.summary}</p>
      <div className="pt-1">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={summarize.isPending}
          className="btn-outline text-xs py-1 px-2"
        >
          {summarize.isPending ? 'Summarizing…' : aiSummary ? (expanded ? 'Hide Summary' : 'Show Summary') : '✨ Summarize'}
        </button>
      </div>
      {expanded && aiSummary && (
        <div className="mt-2 p-3 bg-surface-sunk rounded-xl text-xs text-surface-ink leading-relaxed border border-surface-ink/[0.06]">
          {aiSummary}
        </div>
      )}
    </div>
  );
}

// ─── NewsHub ──────────────────────────────────────────────────────────────────

export function NewsHub() {
  const { data: sources = [], isLoading: sourcesLoading } = useNewsSources();
  const { data: articles = [], isLoading: articlesLoading } = useNewsFeed();
  const { data: watchlistTopics = [] } = useWatchlistTopics();
  const toggleSource = useToggleNewsSource();
  const deleteSource = useDeleteNewsSource();
  const addSource = useAddNewsSource();

  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newRssUrl, setNewRssUrl] = useState('');
  const [activeTopic, setActiveTopic] = useState<string>('All Topics');

  function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSourceName.trim() || !newRssUrl.trim()) return;
    addSource.mutate(
      { source_name: newSourceName.trim(), rss_url: newRssUrl.trim() },
      {
        onSuccess: () => {
          setNewSourceName('');
          setNewRssUrl('');
        },
      }
    );
  }

  const filteredArticles: NewsArticle[] =
    activeTopic === 'All Topics'
      ? articles
      : articles.filter(
          (a) =>
            a.title.toLowerCase().includes(activeTopic.toLowerCase()) ||
            a.summary.toLowerCase().includes(activeTopic.toLowerCase())
        );

  const topicChips = ['All Topics', ...watchlistTopics.map((t) => t.topic)];

  return (
    <div className="flex flex-col md:flex-row gap-4 min-h-0">
      {/* Mobile sources toggle */}
      <div className="md:hidden">
        <button
          type="button"
          className="btn-outline w-full"
          onClick={() => setShowSourcePanel(!showSourcePanel)}
        >
          {showSourcePanel ? 'Hide Sources' : '📰 Sources'}
        </button>
      </div>

      {/* Source panel */}
      <aside
        className={`${showSourcePanel ? 'block' : 'hidden'} md:block md:max-w-[200px] md:flex-shrink-0 w-full`}
      >
        <div className="bg-surface-raised rounded-2xl p-3 border border-surface-ink/[0.06]">
          <h3 className="text-xs font-bold text-surface-muted uppercase tracking-wider mb-2">Sources</h3>
          {sourcesLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : sources.length === 0 ? (
            <p className="text-xs text-surface-muted">No sources added.</p>
          ) : (
            <div>
              {sources.map((src) => (
                <SourceRow
                  key={src.id}
                  source={src}
                  onToggle={(id, is_active) => toggleSource.mutate({ id, is_active })}
                  onDelete={(id) => deleteSource.mutate(id)}
                  toggling={toggleSource.isPending}
                  deleting={deleteSource.isPending}
                />
              ))}
            </div>
          )}

          <form onSubmit={handleAddSource} className="mt-3 space-y-1.5">
            <input
              className="input text-xs w-full"
              placeholder="Source name"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
            />
            <input
              className="input text-xs w-full"
              placeholder="RSS URL"
              value={newRssUrl}
              onChange={(e) => setNewRssUrl(e.target.value)}
            />
            <button
              type="submit"
              disabled={addSource.isPending}
              className="btn w-full text-xs py-1"
            >
              {addSource.isPending ? 'Adding…' : '+ Add Source'}
            </button>
          </form>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 min-w-0 space-y-4">
        {/* Topic filter chips */}
        <div className="flex flex-wrap gap-2">
          {topicChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setActiveTopic(chip)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeTopic === chip
                  ? 'bg-brand-teal text-white border-transparent'
                  : 'bg-surface-raised text-surface-muted border-surface-ink/[0.06] hover:border-brand-teal'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Articles */}
        {articlesLoading ? (
          <div className="space-y-3">
            <ArticleSkeleton />
            <ArticleSkeleton />
            <ArticleSkeleton />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="rounded-2xl bg-surface-sunk border border-surface-ink/[0.06] p-10 text-center">
            <p className="text-2xl mb-2">📰</p>
            <p className="text-surface-muted text-sm">Fetching news from active sources…</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
