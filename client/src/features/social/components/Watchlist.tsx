// ─── Watchlist.tsx ───────────────────────────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import React, { useState } from 'react';
import {
  useWatchlistTopics,
  useAddWatchlistTopic,
  useDeleteWatchlistTopic,
  useToggleWatchlistAlert,
  useNewsFeed,
} from '../api';
import type { WatchlistTopic, NewsArticle } from '../types';

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

function matchingArticles(articles: NewsArticle[], topic: string): NewsArticle[] {
  const kw = topic.toLowerCase();
  return articles
    .filter(
      (a) =>
        a.title.toLowerCase().includes(kw) ||
        a.summary.toLowerCase().includes(kw)
    )
    .slice(0, 3);
}

// ─── TopicCard ────────────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: WatchlistTopic;
  articles: NewsArticle[];
  onDelete: (id: string) => void;
  onToggleAlert: (id: string, alert_enabled: boolean) => void;
  deleting: boolean;
  toggling: boolean;
}

function TopicCard({ topic, articles, onDelete, onToggleAlert, deleting, toggling }: TopicCardProps) {
  const hits = matchingArticles(articles, topic.topic);
  const [showAlertTip, setShowAlertTip] = useState(false);

  return (
    <div className="bg-surface-raised rounded-2xl p-4 border border-surface-ink/[0.06] space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-surface-ink text-sm">{topic.topic}</span>
        <div className="flex items-center gap-2">
          {/* Alert toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAlertTip(true);
                setTimeout(() => setShowAlertTip(false), 2000);
                onToggleAlert(topic.id, !topic.alert_enabled);
              }}
              disabled={toggling}
              aria-label={topic.alert_enabled ? 'Disable alert' : 'Enable alert'}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${topic.alert_enabled ? 'bg-brand-teal' : 'bg-gray-300'}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${topic.alert_enabled ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
            {showAlertTip && (
              <div className="absolute bottom-7 right-0 z-10 bg-gray-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                Network+ plan required for push alerts
              </div>
            )}
          </div>
          <span className="text-[10px] text-surface-muted">Alert</span>
          <button
            type="button"
            onClick={() => onDelete(topic.id)}
            disabled={deleting}
            className="text-gray-400 hover:text-red-500 transition-colors text-xs ml-1"
            aria-label="Delete topic"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Matching articles */}
      {hits.length === 0 ? (
        <p className="text-xs text-surface-muted italic">No recent hits</p>
      ) : (
        <ul className="space-y-1.5">
          {hits.map((article) => (
            <li key={article.id} className="flex flex-col gap-0.5">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-brand-teal hover:underline line-clamp-1"
              >
                {article.title}
              </a>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-surface-muted">{article.source}</span>
                <span className="text-[10px] text-surface-muted">·</span>
                <span className="text-[10px] text-surface-muted">{timeAgo(article.published_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export function Watchlist() {
  const { data: topics = [], isLoading } = useWatchlistTopics();
  const { data: articles = [] } = useNewsFeed();
  const addTopic = useAddWatchlistTopic();
  const deleteTopic = useDeleteWatchlistTopic();
  const toggleAlert = useToggleWatchlistAlert();

  const [newTopic, setNewTopic] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTopic.trim();
    if (!trimmed) return;
    addTopic.mutate(
      { topic: trimmed },
      { onSuccess: () => setNewTopic('') }
    );
  }

  return (
    <div className="space-y-5">
      {/* Add topic form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Add a topic to monitor…"
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          maxLength={80}
        />
        <button
          type="submit"
          disabled={addTopic.isPending || !newTopic.trim()}
          className="btn px-4"
        >
          {addTopic.isPending ? 'Adding…' : 'Add Topic'}
        </button>
      </form>

      {/* Plan note */}
      <p className="text-xs text-surface-muted bg-surface-sunk rounded-xl px-3 py-2 border border-surface-ink/[0.06]">
        Solo plan: 5 topics max. Network+ plan for unlimited.
      </p>

      {/* Topics */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="rounded-2xl bg-surface-sunk border border-surface-ink/[0.06] p-10 text-center">
          <p className="text-2xl mb-2">👀</p>
          <p className="text-surface-muted text-sm">Add topics to monitor news and social mentions.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              articles={articles}
              onDelete={(id) => deleteTopic.mutate(id)}
              onToggleAlert={(id, alert_enabled) => toggleAlert.mutate({ id, alert_enabled })}
              deleting={deleteTopic.isPending}
              toggling={toggleAlert.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
