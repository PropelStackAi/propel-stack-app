// ─── Books Tab ────────────────────────────────────────────────────────────────
// Enhancement 20 — Propel Stack AI, LLC

import { useState } from 'react';
import { useLearningItems, useCreateLearningItem, useUpdateLearningItem, useDeleteLearningItem, useLogLearningSession } from '../api';
import type { LearningItem } from '../types';

const STATUS_TABS = [
  { value: 'reading',  label: '📖 Reading'  },
  { value: 'to-read',  label: '📚 To Read'  },
  { value: 'finished', label: '✅ Finished' },
];

function finishDateEstimate(pagesLeft: number, pagesPerDay: number): string {
  if (pagesPerDay <= 0 || pagesLeft <= 0) return '';
  const days = Math.ceil(pagesLeft / pagesPerDay);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `Finish in ~${days}d (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
}

function BookCard({ book, pagesPerDay }: { book: LearningItem; pagesPerDay: number }) {
  const update = useUpdateLearningItem();
  const del    = useDeleteLearningItem();
  const log    = useLogLearningSession();
  const [logging, setLogging] = useState(false);
  const [pages, setPages]     = useState('');
  const [mins, setMins]       = useState('');

  const pct = book.total_pages ? Math.min(100, Math.round((book.progress / book.total_pages) * 100)) : 0;
  const pagesLeft = book.total_pages ? book.total_pages - book.progress : 0;

  function logSession() {
    log.mutate(
      { item_id: book.id, pages_read: Number(pages) || 0, duration_minutes: Number(mins) || 0 },
      { onSuccess: () => { setLogging(false); setPages(''); setMins(''); } },
    );
  }

  function markStatus(status: string) {
    update.mutate({ id: book.id, status, ...(status === 'finished' ? { completed_at: new Date().toISOString().split('T')[0] } : {}) });
  }

  return (
    <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">📗</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-ink leading-snug">{book.title}</p>
          {book.author && <p className="text-xs text-surface-muted">{book.author}</p>}
          {book.status === 'reading' && book.total_pages ? (
            <div className="mt-1.5 space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-surface-muted">
                <span>{book.progress} / {book.total_pages} pages ({pct}%)</span>
                {pagesPerDay > 0 && <span className="text-brand-teal">{finishDateEstimate(pagesLeft, pagesPerDay)}</span>}
              </div>
              <div className="h-1.5 bg-surface-sunk rounded-full overflow-hidden">
                <div className="h-full bg-brand-teal rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {book.status === 'reading' && (
            <button type="button" onClick={() => setLogging(!logging)}
              className="text-xs bg-brand-teal/10 text-brand-teal px-2 py-1 rounded-lg font-semibold hover:bg-brand-teal/20">
              Log
            </button>
          )}
          {book.status === 'to-read' && (
            <button type="button" onClick={() => markStatus('reading')}
              className="text-xs bg-brand-indigo/10 text-brand-indigo px-2 py-1 rounded-lg font-semibold hover:bg-brand-indigo/20">
              Start
            </button>
          )}
          {book.status === 'reading' && (
            <button type="button" onClick={() => markStatus('finished')}
              className="text-xs text-surface-muted hover:text-green-600 px-1 text-lg leading-none">
              ✓
            </button>
          )}
          <button type="button" onClick={() => del.mutate(book.id)}
            className="text-xs text-surface-muted hover:text-red-500 px-1">✕</button>
        </div>
      </div>

      {logging && (
        <div className="bg-surface-sunk rounded-lg p-2.5 space-y-2">
          <p className="text-xs font-semibold text-surface-muted">Log today's reading session</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Pages read</label>
              <input value={pages} onChange={(e) => setPages(e.target.value)} type="number" min="0" placeholder="0"
                className="w-full border border-surface-ink/10 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Minutes</label>
              <input value={mins} onChange={(e) => setMins(e.target.value)} type="number" min="0" placeholder="0"
                className="w-full border border-surface-ink/10 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setLogging(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={logSession} disabled={log.isPending}
              className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {log.isPending ? 'Saving…' : 'Save session ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BooksTab({ pagesPerDay }: { pagesPerDay: number }) {
  const [status, setStatus] = useState('reading');
  const { data, isLoading } = useLearningItems('book', status);
  const create = useCreateLearningItem();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle]       = useState('');
  const [author, setAuthor]     = useState('');
  const [totalPages, setTotal]  = useState('');
  const [startStatus, setStart] = useState<'reading' | 'to-read'>('reading');

  const books = data?.items ?? [];

  function submit() {
    if (!title) return;
    create.mutate(
      { type: 'book', title, author, total_pages: totalPages ? Number(totalPages) : undefined, status: startStatus },
      { onSuccess: () => { setShowForm(false); setTitle(''); setAuthor(''); setTotal(''); } },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {STATUS_TABS.map((t) => (
            <button key={t.value} type="button" onClick={() => setStatus(t.value)}
              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-xl font-semibold ${status === t.value ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold flex-shrink-0">
          + Add book
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add a book</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author (optional)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <input value={totalPages} onChange={(e) => setTotal(e.target.value)} type="number" min="1" placeholder="Total pages"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <select value={startStatus} onChange={(e) => setStart(e.target.value as 'reading' | 'to-read')}
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              <option value="reading">Currently reading</option>
              <option value="to-read">Add to reading list</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Adding…' : 'Add book'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-surface-muted text-center py-8">Loading…</p>
      ) : books.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl">📚</p>
          <p className="text-sm text-surface-muted mt-2">No books here yet.</p>
          <p className="text-xs text-surface-muted">Add a book to start tracking your reading.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {books.map((b) => <BookCard key={b.id} book={b} pagesPerDay={pagesPerDay} />)}
        </div>
      )}
    </div>
  );
}
