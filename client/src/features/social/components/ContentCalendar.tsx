// ─── ContentCalendar.tsx ──────────────────────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import React, { useState, useMemo } from 'react';
import {
  useScheduledPosts,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  usePublishPost,
  useDraftPostAI,
  useSocialConnections,
} from '../api';
import type { ScheduledPost } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  x: 280,
  twitter: 280,
  instagram: 2200,
  linkedin: 3000,
  facebook: 63206,
  youtube: 5000,
};

const STATUS_STYLES: Record<ScheduledPost['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const POST_CHIP_COLORS = ['bg-brand-teal', 'bg-indigo-400', 'bg-orange-400', 'bg-pink-400', 'bg-yellow-400'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // Leading days from previous month
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(new Date(year, month, -firstDay.getDay() + i + 1));
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // Trailing days to fill last week
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push(new Date(year, month + 1, d));
    }
  }
  return days;
}

function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ScheduledPost['status'] }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

// ─── Create/Edit Panel ────────────────────────────────────────────────────────

interface PostFormPanelProps {
  selectedDate: Date | null;
  connectedPlatforms: string[];
  onClose: () => void;
  editPost: ScheduledPost | null;
}

function PostFormPanel({ selectedDate, connectedPlatforms, onClose, editPost }: PostFormPanelProps) {
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const draftAI = useDraftPostAI();

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    editPost ? JSON.parse(editPost.platforms) : []
  );
  const [content, setContent] = useState(editPost?.content ?? '');
  const [scheduledFor, setScheduledFor] = useState(
    editPost?.scheduled_for
      ? editPost.scheduled_for.slice(0, 16)
      : selectedDate
      ? formatDatetimeLocal(selectedDate)
      : ''
  );
  const [aiPlatform, setAiPlatform] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [showAIForm, setShowAIForm] = useState(false);

  const charLimit = useMemo(() => {
    const limits = selectedPlatforms
      .map((p) => PLATFORM_CHAR_LIMITS[p.toLowerCase()])
      .filter((l): l is number => l !== undefined);
    return limits.length > 0 ? Math.min(...limits) : null;
  }, [selectedPlatforms]);

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function handleSave(status: 'draft' | 'scheduled') {
    const payload = {
      platforms: selectedPlatforms,
      content,
      scheduled_for: scheduledFor || undefined,
      status,
    };
    if (editPost) {
      updatePost.mutate({ id: editPost.id, ...payload }, { onSuccess: onClose });
    } else {
      createPost.mutate(payload, { onSuccess: onClose });
    }
  }

  function handleAIDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!aiPlatform || !aiTopic) return;
    draftAI.mutate(
      { platform: aiPlatform, topic: aiTopic },
      {
        onSuccess: (data) => {
          setContent(data.draft);
          setShowAIForm(false);
        },
      }
    );
  }

  const isPending = createPost.isPending || updatePost.isPending;

  return (
    <div className="bg-surface-raised rounded-2xl border border-surface-ink/[0.06] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-surface-ink text-sm">
          {editPost ? 'Edit Post' : selectedDate ? `New Post — ${selectedDate.toLocaleDateString()}` : 'New Post'}
        </h3>
        <button type="button" onClick={onClose} className="text-surface-muted hover:text-surface-ink text-lg leading-none">
          ×
        </button>
      </div>

      {/* Platform checkboxes */}
      <div>
        <label className="label mb-1">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {connectedPlatforms.length === 0 ? (
            <p className="text-xs text-surface-muted">No connected accounts.</p>
          ) : (
            connectedPlatforms.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(p)}
                  onChange={() => togglePlatform(p)}
                  className="rounded"
                />
                <span className="capitalize">{p}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Content textarea */}
      <div>
        <label className="label mb-1">Content</label>
        <textarea
          className="input w-full resize-none"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={charLimit ?? undefined}
          placeholder="What do you want to post?"
        />
        <div className="flex justify-between mt-1">
          <button
            type="button"
            className="text-xs text-brand-teal hover:underline"
            onClick={() => setShowAIForm(!showAIForm)}
          >
            ✨ AI Draft
          </button>
          {charLimit !== null && (
            <span className={`text-xs ${content.length > charLimit * 0.9 ? 'text-red-500' : 'text-surface-muted'}`}>
              {content.length}/{charLimit}
            </span>
          )}
        </div>
      </div>

      {/* AI Draft mini-form */}
      {showAIForm && (
        <form onSubmit={handleAIDraft} className="bg-surface-sunk rounded-xl p-3 border border-surface-ink/[0.06] space-y-2">
          <p className="text-xs font-semibold text-surface-ink">AI Draft</p>
          <input
            className="input w-full text-xs"
            placeholder="Platform (e.g. LinkedIn)"
            value={aiPlatform}
            onChange={(e) => setAiPlatform(e.target.value)}
          />
          <input
            className="input w-full text-xs"
            placeholder="Topic or message idea"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
          />
          <button type="submit" disabled={draftAI.isPending} className="btn text-xs py-1 px-3 w-full">
            {draftAI.isPending ? 'Drafting…' : 'Generate Draft'}
          </button>
        </form>
      )}

      {/* Scheduled date/time */}
      <div>
        <label className="label mb-1">Schedule For</label>
        <input
          type="datetime-local"
          className="input w-full"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending || !content.trim()}
          onClick={() => handleSave('draft')}
          className="btn-outline flex-1 text-sm py-1.5"
        >
          {isPending ? 'Saving…' : 'Save as Draft'}
        </button>
        <button
          type="button"
          disabled={isPending || !content.trim() || selectedPlatforms.length === 0}
          onClick={() => handleSave('scheduled')}
          className="btn flex-1 text-sm py-1.5"
        >
          Schedule
        </button>
      </div>
    </div>
  );
}

// ─── ContentCalendar ──────────────────────────────────────────────────────────

export function ContentCalendar() {
  const { data: posts = [], isLoading } = useScheduledPosts();
  const { data: connections = [] } = useSocialConnections();
  const deletePost = useDeletePost();
  const publishPost = usePublishPost();

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState<ScheduledPost | null>(null);

  const connectedPlatforms = connections.map((c) => c.platform);
  const days = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  const postsByDate = useMemo(() => {
    const map: Record<string, ScheduledPost[]> = {};
    for (const post of posts) {
      if (!post.scheduled_for) continue;
      const key = post.scheduled_for.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(post);
    }
    return map;
  }, [posts]);

  function prevMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  function handleDayClick(day: Date) {
    setSelectedDate(day);
    setEditPost(null);
    setShowForm(true);
  }

  function handleEdit(post: ScheduledPost) {
    setEditPost(post);
    setSelectedDate(null);
    setShowForm(true);
  }

  const sortedPosts = [...posts].sort((a, b) => {
    if (!a.scheduled_for) return 1;
    if (!b.scheduled_for) return -1;
    return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
  });

  const monthLabel = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayStr = isoDateStr(new Date());

  return (
    <div className="space-y-6">
      {/* ── Calendar ── */}
      <div className="bg-surface-raised rounded-2xl border border-surface-ink/[0.06] p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={prevMonth} className="btn-outline px-3 py-1 text-sm">‹</button>
          <span className="font-bold text-surface-ink text-sm">{monthLabel}</span>
          <button type="button" onClick={nextMonth} className="btn-outline px-3 py-1 text-sm">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-surface-muted py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px">
          {days.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const dayStr = isoDateStr(day);
            const dayPosts = postsByDate[dayStr] ?? [];
            const isToday = dayStr === todayStr;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`min-h-[52px] rounded-lg p-1 text-left transition-colors hover:bg-surface-sunk ${
                  isCurrentMonth ? '' : 'opacity-30'
                } ${isToday ? 'ring-2 ring-brand-teal' : ''}`}
              >
                <span className={`text-xs font-medium block ${isToday ? 'text-brand-teal' : 'text-surface-ink'}`}>
                  {day.getDate()}
                </span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayPosts.slice(0, 3).map((p, pi) => (
                    <span
                      key={p.id}
                      className={`inline-block w-2 h-2 rounded-full ${POST_CHIP_COLORS[pi % POST_CHIP_COLORS.length]}`}
                      title={p.content.slice(0, 40)}
                    />
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="text-[9px] text-surface-muted">+{dayPosts.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Create/Edit Form ── */}
      {showForm && (
        <PostFormPanel
          selectedDate={selectedDate}
          connectedPlatforms={connectedPlatforms}
          onClose={() => { setShowForm(false); setEditPost(null); }}
          editPost={editPost}
        />
      )}

      {/* ── Post List ── */}
      <div className="space-y-2">
        <h3 className="font-bold text-surface-ink text-sm">All Posts</h3>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="rounded-2xl bg-surface-sunk border border-surface-ink/[0.06] p-8 text-center">
            <p className="text-surface-muted text-sm">No posts yet. Click a date to create one.</p>
          </div>
        ) : (
          sortedPosts.map((post) => {
            const platformList = (() => {
              try { return (JSON.parse(post.platforms) as string[]).join(', '); }
              catch { return post.platforms; }
            })();
            return (
              <div key={post.id} className="bg-surface-raised rounded-xl border border-surface-ink/[0.06] p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={post.status} />
                    <span className="text-[10px] text-surface-muted capitalize">{platformList}</span>
                    {post.scheduled_for && (
                      <span className="text-[10px] text-surface-muted ml-auto">
                        {new Date(post.scheduled_for).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-ink line-clamp-1">{post.content || <em className="text-surface-muted">No content</em>}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {(post.status === 'draft' || post.status === 'scheduled') && (
                    <button
                      type="button"
                      onClick={() => publishPost.mutate(post.id)}
                      disabled={publishPost.isPending}
                      className="btn text-[11px] py-1 px-2"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEdit(post)}
                    className="btn-outline text-[11px] py-1 px-2"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePost.mutate(post.id)}
                    disabled={deletePost.isPending}
                    className="text-red-400 hover:text-red-600 text-xs px-1"
                    aria-label="Delete post"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
