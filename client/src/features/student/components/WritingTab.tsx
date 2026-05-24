// ─── Writing Tab — Essays, Papers, Theses, Notes ──────────────────────────────
// Session 14 (Bug Fix) — Propel Stack AI, LLC

import { useState } from 'react';
import { useStudentNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../api';
import type { StudentNote } from '../types';

const DOC_TYPES: { value: StudentNote['doc_type']; label: string; emoji: string }[] = [
  { value: 'notes',  label: 'Notes',        emoji: '📝' },
  { value: 'essay',  label: 'Essay',        emoji: '✍️' },
  { value: 'paper',  label: 'Research Paper', emoji: '📄' },
  { value: 'thesis', label: 'Thesis',       emoji: '🎓' },
];

export function WritingTab(): JSX.Element {
  const [filter, setFilter] = useState<StudentNote['doc_type'] | 'all'>('all');
  const [activeNote, setActiveNote] = useState<StudentNote | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<StudentNote['doc_type']>('notes');
  const [isDirty, setIsDirty] = useState(false);

  const { data } = useStudentNotes(filter !== 'all' ? filter : undefined);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const notes = data?.notes ?? [];

  function openNote(note: StudentNote) {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditType(note.doc_type);
    setIsDirty(false);
  }

  function handleNew() {
    const blank: Partial<StudentNote> = {
      title: 'Untitled', content: '', doc_type: 'notes',
    };
    createNote.mutate(blank, {
      onSuccess: (created) => {
        openNote(created);
      },
    });
  }

  function handleSave() {
    if (!activeNote) return;
    updateNote.mutate(
      { id: activeNote.id, title: editTitle, content: editContent, doc_type: editType },
      { onSuccess: (updated) => { setActiveNote(updated); setIsDirty(false); } },
    );
  }

  function handleDelete(id: string) {
    deleteNote.mutate(id, {
      onSuccess: () => {
        if (activeNote?.id === id) {
          setActiveNote(null);
          setIsDirty(false);
        }
      },
    });
  }

  const wordCount = editContent.trim().split(/\s+/).filter(Boolean).length;

  // Editor view
  if (activeNote) {
    return (
      <div className="flex flex-col h-[560px]">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (isDirty && !confirm('Discard unsaved changes?')) return;
              setActiveNote(null);
              setIsDirty(false);
            }}
            className="text-xs text-surface-muted hover:text-surface-ink"
          >
            ← All documents
          </button>
          <select
            value={editType}
            onChange={(e) => { setEditType(e.target.value as StudentNote['doc_type']); setIsDirty(true); }}
            className="text-xs border border-surface-ink/10 rounded-lg px-2 py-1 bg-surface-raised"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
            ))}
          </select>
          <span className="text-xs text-surface-muted flex-1">
            {wordCount} word{wordCount !== 1 ? 's' : ''}
            {isDirty && <span className="ml-1 text-brand-coral"> · Unsaved</span>}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateNote.isPending || !isDirty}
            className="text-xs bg-brand-indigo text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
          >
            {updateNote.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Title */}
        <input
          value={editTitle}
          onChange={(e) => { setEditTitle(e.target.value); setIsDirty(true); }}
          placeholder="Document title…"
          className="text-lg font-bold text-surface-ink border-0 border-b border-surface-ink/10 pb-2 mb-3 focus:outline-none focus:border-brand-indigo bg-transparent"
        />

        {/* Body */}
        <textarea
          value={editContent}
          onChange={(e) => { setEditContent(e.target.value); setIsDirty(true); }}
          placeholder="Start writing…"
          className="flex-1 resize-none text-sm text-surface-ink leading-relaxed focus:outline-none bg-transparent"
        />

        <p className="text-[10px] text-surface-muted mt-1">
          AI Tutor can help you think through your ideas — switch to the AI Tutor tab for guidance.
        </p>
      </div>
    );
  }

  // Document list view
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
                ? 'bg-brand-indigo text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            All
          </button>
          {DOC_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilter(t.value)}
              className={[
                'flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold',
                filter === t.value
                  ? 'bg-brand-indigo text-white'
                  : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
              ].join(' ')}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleNew}
          disabled={createNote.isPending}
          className="flex-shrink-0 text-xs bg-brand-indigo text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
        >
          + New
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-surface-muted text-center py-8">
          No documents yet — create one!
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => {
            const type = DOC_TYPES.find((t) => t.value === n.doc_type);
            return (
              <div
                key={n.id}
                className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 flex items-start gap-3 cursor-pointer hover:border-brand-indigo/30"
                onClick={() => openNote(n)}
              >
                <span className="text-xl">{type?.emoji ?? '📝'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-ink truncate">{n.title}</p>
                  <p className="text-xs text-surface-muted mt-0.5">
                    {n.word_count} words · {type?.label} ·{' '}
                    {new Date(n.updated_at).toLocaleDateString()}
                  </p>
                  {n.content && (
                    <p className="text-xs text-surface-muted mt-0.5 line-clamp-1">{n.content}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                  className="text-surface-muted hover:text-red-500 text-xs px-1 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
