// ─── Research Resources Library ───────────────────────────────────────────────
// Session 14 (Bug Fix) — Propel Stack AI, LLC

import { useState } from 'react';
import { useStudentResources, useCreateResource, useDeleteResource } from '../api';
import type { StudentResource } from '../types';

const SOURCE_TYPES: { value: StudentResource['source_type']; label: string; emoji: string }[] = [
  { value: 'article', label: 'Article',        emoji: '📰' },
  { value: 'book',    label: 'Book',           emoji: '📚' },
  { value: 'journal', label: 'Journal',        emoji: '🔬' },
  { value: 'video',   label: 'Video',          emoji: '🎬' },
  { value: 'website', label: 'Website',        emoji: '🌐' },
];

export function ResourcesLibrary(): JSX.Element {
  const [filter, setFilter] = useState<StudentResource['source_type'] | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', url: '', authors: '', year: '',
    summary: '', tags: '', source_type: 'article' as StudentResource['source_type'],
  });

  const { data } = useStudentResources(filter !== 'all' ? filter : undefined);
  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();

  const resources = data?.resources ?? [];

  function handleSubmit() {
    if (!form.title.trim()) return;
    createResource.mutate(form, {
      onSuccess: () => {
        setForm({ title: '', url: '', authors: '', year: '', summary: '', tags: '', source_type: 'article' });
        setShowForm(false);
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto flex-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={[
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold',
              filter === 'all'
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            All ({resources.length})
          </button>
          {SOURCE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilter(t.value)}
              className={[
                'flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold',
                filter === t.value
                  ? 'bg-brand-teal text-white'
                  : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
              ].join(' ')}
            >
              {t.emoji}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex-shrink-0 text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold"
        >
          + Add source
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-surface-ink">New resource</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Title *"
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
            <input
              value={form.authors}
              onChange={(e) => setForm((f) => ({ ...f, authors: e.target.value }))}
              placeholder="Author(s)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              placeholder="Year"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="URL (optional)"
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
            <select
              value={form.source_type}
              onChange={(e) => setForm((f) => ({ ...f, source_type: e.target.value as StudentResource['source_type'] }))}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
              ))}
            </select>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="Tags (comma-separated)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Summary / notes (optional)"
              rows={2}
              className="col-span-2 resize-none border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createResource.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {resources.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-2xl">📚</p>
          <p className="text-sm text-surface-muted">
            No sources saved yet. Build your research library!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => {
            const typeInfo = SOURCE_TYPES.find((t) => t.value === r.source_type);
            let tags: string[] = [];
            try { tags = JSON.parse(r.tags); } catch { /* noop */ }

            return (
              <div
                key={r.id}
                className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">{typeInfo?.emoji ?? '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-ink line-clamp-1">
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-brand-teal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.title}
                        </a>
                      ) : (
                        r.title
                      )}
                    </p>
                    <p className="text-xs text-surface-muted mt-0.5">
                      {[r.authors, r.year].filter(Boolean).join(' · ')}
                    </p>
                    {r.summary && (
                      <p className="text-xs text-surface-muted mt-1 line-clamp-2">{r.summary}</p>
                    )}
                    {tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteResource.mutate(r.id)}
                    className="text-surface-muted hover:text-red-500 text-xs px-1 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
