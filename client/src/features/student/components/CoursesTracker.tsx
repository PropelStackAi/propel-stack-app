// ─── Courses Tracker ──────────────────────────────────────────────────────────
// Session 14 (Bug Fix) — Propel Stack AI, LLC

import { useState } from 'react';
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from '../api';
import type { Course } from '../types';

const STATUS_OPTIONS: { value: Course['status']; label: string; color: string }[] = [
  { value: 'active',    label: 'Active',    color: 'bg-green-100 text-green-700' },
  { value: 'planned',   label: 'Planned',   color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-600' },
  { value: 'dropped',   label: 'Dropped',   color: 'bg-red-100 text-red-600' },
];

const COLORS = ['#4F35C2', '#F05A28', '#01696F', '#6B21A8', '#D97706', '#DC2626'];

const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0,
};

function calcGPA(courses: Course[]): string | null {
  const graded = courses.filter((c) => c.status === 'completed' && GRADE_POINTS[c.grade] !== undefined);
  if (!graded.length) return null;
  const totalCredits = graded.reduce((s, c) => s + (c.credits || 3), 0);
  const totalPoints = graded.reduce((s, c) => s + (GRADE_POINTS[c.grade] * (c.credits || 3)), 0);
  return totalCredits ? (totalPoints / totalCredits).toFixed(2) : null;
}

export function CoursesTracker(): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Course['status'] | 'all'>('all');

  const [form, setForm] = useState({
    name: '', code: '', instructor: '', credits: '3',
    status: 'active' as Course['status'], grade: '', color: '#4F35C2', notes: '',
  });

  const { data } = useCourses();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  const courses = data?.courses ?? [];
  const filtered = filter === 'all' ? courses : courses.filter((c) => c.status === filter);
  const gpa = calcGPA(courses);

  function resetForm() {
    setForm({ name: '', code: '', instructor: '', credits: '3', status: 'active', grade: '', color: '#4F35C2', notes: '' });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(c: Course) {
    setForm({
      name: c.name, code: c.code, instructor: c.instructor, credits: String(c.credits),
      status: c.status, grade: c.grade, color: c.color, notes: c.notes,
    });
    setEditId(c.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    const payload = { ...form, credits: Number(form.credits) || 3 };
    if (editId) {
      updateCourse.mutate({ id: editId, ...payload }, { onSuccess: resetForm });
    } else {
      createCourse.mutate(payload, { onSuccess: resetForm });
    }
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-2 overflow-x-auto">
          {(['all', 'active', 'planned', 'completed', 'dropped'] as const).map((s) => {
            const count = s === 'all' ? courses.length : courses.filter((c) => c.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={[
                  'flex-shrink-0 px-3 py-1 rounded-xl text-xs font-semibold transition-all',
                  filter === s
                    ? 'bg-brand-indigo text-white'
                    : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
                ].join(' ')}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="text-xs bg-brand-indigo text-white px-3 py-1.5 rounded-xl font-semibold flex-shrink-0"
        >
          + Add course
        </button>
      </div>

      {gpa && (
        <div className="bg-brand-indigo/5 border border-brand-indigo/10 rounded-xl px-4 py-2 flex items-center gap-3">
          <span className="text-sm font-bold text-brand-indigo">GPA: {gpa}</span>
          <span className="text-xs text-surface-muted">
            (completed courses with letter grades)
          </span>
        </div>
      )}

      {/* Add / edit form */}
      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-surface-ink">
            {editId ? 'Edit course' : 'New course'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Course name *"
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo/30"
            />
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="Code (e.g. BIO 201)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={form.instructor}
              onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))}
              placeholder="Instructor"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Course['status'] }))}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input
              value={form.credits}
              onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
              placeholder="Credits"
              type="number"
              min="0"
              max="12"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value.toUpperCase() }))}
              placeholder="Grade (A, B+, etc.)"
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-muted">Color:</span>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-5 h-5 rounded-full border-2 ${form.color === c ? 'border-surface-ink' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={resetForm} className="text-xs text-surface-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createCourse.isPending || updateCourse.isPending}
              className="text-xs bg-brand-indigo text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40"
            >
              {editId ? 'Save changes' : 'Add course'}
            </button>
          </div>
        </div>
      )}

      {/* Course list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-surface-muted text-center py-8">
          {courses.length === 0 ? 'No courses yet — add your first!' : 'No courses in this category.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const status = STATUS_OPTIONS.find((s) => s.value === c.status);
            return (
              <div
                key={c.id}
                className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 flex items-start gap-3"
              >
                <div
                  className="w-2 self-stretch rounded-full flex-shrink-0"
                  style={{ background: c.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-surface-ink">{c.name}</p>
                    {c.code && <span className="text-xs text-surface-muted">{c.code}</span>}
                    {status && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                    {c.grade && (
                      <span className="text-xs font-bold text-brand-indigo">{c.grade}</span>
                    )}
                  </div>
                  {c.instructor && (
                    <p className="text-xs text-surface-muted mt-0.5">{c.instructor} · {c.credits} cr</p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="text-xs text-surface-muted hover:text-brand-indigo px-1"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCourse.mutate(c.id)}
                    className="text-xs text-surface-muted hover:text-red-500 px-1"
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
