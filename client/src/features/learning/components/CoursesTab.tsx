// ─── Courses & Certifications Tab ─────────────────────────────────────────────
// Enhancement 20 — Propel Stack AI, LLC

import { useState } from 'react';
import { useLearningItems, useCreateLearningItem, useUpdateLearningItem, useDeleteLearningItem, useLogLearningSession } from '../api';
import type { LearningItem } from '../types';

const PLATFORMS = ['Coursera', 'Udemy', 'edX', 'LinkedIn Learning', 'YouTube', 'Skillshare', 'Other'];
const ITEM_TYPES = [
  { value: 'course',         label: 'Course',          emoji: '🎓' },
  { value: 'certification',  label: 'Certification',   emoji: '📜' },
];

function CourseCard({ item }: { item: LearningItem }) {
  const update = useUpdateLearningItem();
  const del    = useDeleteLearningItem();
  const log    = useLogLearningSession();
  const [logging, setLogging] = useState(false);
  const [mins, setMins]       = useState('');
  const [prog, setProg]       = useState(String(item.progress));

  const emoji = item.type === 'certification' ? '📜' : '🎓';
  const isDone = item.status === 'completed';

  function logSession() {
    log.mutate(
      { item_id: item.id, duration_minutes: Number(mins) || 0 },
      {
        onSuccess: () => {
          // Also update progress if changed
          if (Number(prog) !== item.progress) {
            update.mutate({ id: item.id, progress: Number(prog) });
          }
          setLogging(false); setMins('');
        },
      },
    );
  }

  function markDone() {
    update.mutate({ id: item.id, status: 'completed', progress: 100, completed_at: new Date().toISOString().split('T')[0] });
  }

  return (
    <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-ink leading-snug">{item.title}</p>
          <p className="text-xs text-surface-muted capitalize">
            {item.platform || 'No platform'} · {item.type}
            {item.exam_date ? ` · Exam: ${item.exam_date}` : ''}
          </p>
          {!isDone && (
            <div className="mt-1.5 space-y-0.5">
              <div className="flex justify-between text-[10px] text-surface-muted">
                <span>{item.progress}% complete</span>
                {item.study_hours_logged > 0 && <span>{item.study_hours_logged}h logged</span>}
              </div>
              <div className="h-1.5 bg-surface-sunk rounded-full overflow-hidden">
                <div className="h-full bg-brand-indigo rounded-full" style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          )}
          {isDone && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full mt-1">
              ✓ Completed {item.completed_at ?? ''}
              {item.pass_fail === 'pass' && ' · Passed'}
            </span>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!isDone && (
            <>
              <button type="button" onClick={() => setLogging(!logging)}
                className="text-xs bg-brand-indigo/10 text-brand-indigo px-2 py-1 rounded-lg font-semibold hover:bg-brand-indigo/20">
                Log
              </button>
              <button type="button" onClick={markDone}
                className="text-xs text-surface-muted hover:text-green-600 px-1 text-lg leading-none">✓</button>
            </>
          )}
          <button type="button" onClick={() => del.mutate(item.id)}
            className="text-xs text-surface-muted hover:text-red-500 px-1">✕</button>
        </div>
      </div>

      {logging && (
        <div className="bg-surface-sunk rounded-lg p-2.5 space-y-2">
          <p className="text-xs font-semibold text-surface-muted">Log study session</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Minutes studied</label>
              <input value={mins} onChange={(e) => setMins(e.target.value)} type="number" min="0" placeholder="30"
                className="w-full border border-surface-ink/10 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Progress %</label>
              <input value={prog} onChange={(e) => setProg(e.target.value)} type="number" min="0" max="100" placeholder="0"
                className="w-full border border-surface-ink/10 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setLogging(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={logSession} disabled={log.isPending}
              className="text-xs bg-brand-indigo text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {log.isPending ? 'Saving…' : 'Save ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CoursesTab() {
  const { data: courseData, isLoading: cLoading } = useLearningItems('course');
  const { data: certData,   isLoading: certLoading } = useLearningItems('certification');
  const create = useCreateLearningItem();

  const [showForm, setShowForm]   = useState(false);
  const [itemType, setItemType]   = useState<'course' | 'certification'>('course');
  const [title, setTitle]         = useState('');
  const [platform, setPlatform]   = useState('');
  const [examDate, setExamDate]   = useState('');

  const courses = courseData?.items ?? [];
  const certs   = certData?.items ?? [];
  const isLoading = cLoading || certLoading;

  function submit() {
    if (!title) return;
    create.mutate(
      { type: itemType, title, platform, exam_date: examDate || undefined, status: 'in-progress', progress: 0 },
      { onSuccess: () => { setShowForm(false); setTitle(''); setPlatform(''); setExamDate(''); } },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="text-xs bg-brand-indigo text-white px-3 py-1.5 rounded-xl font-semibold">
          + Add course
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add course / certification</p>
          <div className="flex gap-1">
            {ITEM_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setItemType(t.value as 'course' | 'certification')}
                className={`flex-1 text-xs px-2 py-1.5 rounded-xl font-semibold ${itemType === t.value ? 'bg-brand-indigo text-white' : 'bg-surface-sunk text-surface-muted'}`}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course / cert name"
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              <option value="">Platform…</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {itemType === 'certification' && (
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-surface-muted uppercase tracking-wide">Exam date</label>
                <input value={examDate} onChange={(e) => setExamDate(e.target.value)} type="date"
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-indigo text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-surface-muted text-center py-8">Loading…</p>
      ) : (
        <>
          {courses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Courses</p>
              {courses.map((c) => <CourseCard key={c.id} item={c} />)}
            </div>
          )}
          {certs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Certifications</p>
              {certs.map((c) => <CourseCard key={c.id} item={c} />)}
            </div>
          )}
          {courses.length === 0 && certs.length === 0 && (
            <div className="text-center py-10">
              <p className="text-3xl">🎓</p>
              <p className="text-sm text-surface-muted mt-2">No courses or certifications yet.</p>
              <p className="text-xs text-surface-muted">Add a course to track your progress.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
