// ─── Social & Media Hub — AI Social Digest ───────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import { useState } from 'react';
import { useSocialDigest, useRegenerateDigest } from '../api';
import type { SocialDigest as DigestType } from '../types';
import { SOCIAL_PLATFORMS } from '../types';

function getPlatformEmoji(platformId: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === platformId)?.emoji ?? '🌐';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function DigestSkeleton(): JSX.Element {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
        </div>
        <div className="h-4 w-32 bg-gray-100 rounded" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-5 space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3.5 w-full bg-gray-100 rounded" />
          <div className="h-3.5 w-5/6 bg-gray-100 rounded" />
          <div className="h-3.5 w-2/3 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl px-6 py-12 text-center space-y-3">
      <p className="text-3xl">🤖</p>
      <h3 className="font-semibold text-surface-ink text-base">AI Morning Digest</h3>
      <p className="text-surface-muted text-sm max-w-sm mx-auto leading-relaxed">
        Once you connect your social accounts, the digest will include a personalized summary,
        top social highlights from your feeds, watchlist news hits, and suggested actions for the day.
      </p>
    </div>
  );
}

interface DigestContentProps {
  digest: DigestType;
  cached: boolean;
  generatedAt: string;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function DigestContent({
  digest,
  cached,
  generatedAt,
  onRegenerate,
  isRegenerating,
}: DigestContentProps): JSX.Element {
  const [showConfirm, setShowConfirm] = useState(false);

  function handleRegenerateClick(): void {
    setShowConfirm(true);
  }

  function handleConfirm(): void {
    setShowConfirm(false);
    onRegenerate();
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-surface-ink text-lg flex-1">🤖 AI Morning Digest</h2>
          <span
            className={[
              'text-xs font-semibold rounded-full px-2.5 py-1',
              cached
                ? 'bg-gray-100 text-gray-500'
                : 'bg-green-100 text-green-700',
            ].join(' ')}
          >
            {cached ? 'Cached' : 'Live'}
          </span>
          <button
            onClick={handleRegenerateClick}
            disabled={isRegenerating}
            className="btn-outline text-xs disabled:opacity-50"
          >
            {isRegenerating ? 'Regenerating…' : '↻ Regenerate'}
          </button>
        </div>
        <p className="text-xs text-surface-muted mt-2">{formatDate(generatedAt)}</p>
      </div>

      {/* Regenerate confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-surface-ink text-base">Regenerate Digest?</h3>
            <p className="text-sm text-surface-muted leading-relaxed">
              This will generate a fresh AI digest using your latest social feed and news data.
              Approximately <strong>~800 tokens</strong> will be used.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 btn-outline text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 btn bg-brand-teal text-white text-sm"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-surface-sunk rounded-xl p-5">
        <h3 className="font-semibold text-surface-ink text-sm mb-2">Summary</h3>
        <p className="text-sm text-surface-ink leading-relaxed">{digest.summary}</p>
      </div>

      {/* Social Highlights */}
      {digest.highlights.length > 0 && (
        <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-surface-ink text-sm">Social Highlights</h3>
          <ul className="space-y-2">
            {digest.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-base flex-shrink-0">{getPlatformEmoji(h.platform)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-ink leading-relaxed">{h.text}</p>
                  {h.url && (
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-teal hover:underline"
                    >
                      View →
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Watchlist News Hits */}
      {digest.news_hits.length > 0 && (
        <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-surface-ink text-sm">Watchlist News Hits</h3>
          <ul className="space-y-3">
            {digest.news_hits.map((hit, i) => (
              <li key={i} className="border-l-2 border-brand-teal pl-3 space-y-0.5">
                <a
                  href={hit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-surface-ink hover:underline leading-snug"
                >
                  {hit.headline}
                </a>
                <p className="text-xs text-surface-muted">{hit.source}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Actions */}
      {digest.actions.length > 0 && (
        <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-surface-ink text-sm">Suggested Actions</h3>
          <ul className="space-y-2">
            {digest.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-surface-ink">
                <span className="text-brand-teal font-bold flex-shrink-0 mt-0.5">•</span>
                <span className="leading-relaxed">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SocialDigest(): JSX.Element {
  const { data, isLoading, isError, error } = useSocialDigest();
  const regenerate = useRegenerateDigest();

  if (isLoading) return <DigestSkeleton />;

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
        <p className="text-sm font-semibold text-red-700">Failed to load digest</p>
        <p className="text-xs text-red-600 mt-1">
          {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
    );
  }

  if (!data) return <EmptyState />;

  const generatedAt = new Date().toISOString();

  return (
    <DigestContent
      digest={data.digest}
      cached={data.cached}
      generatedAt={generatedAt}
      onRegenerate={() => regenerate.mutate()}
      isRegenerating={regenerate.isPending}
    />
  );
}
