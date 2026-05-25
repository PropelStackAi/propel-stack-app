/**
 * Mood & Journal Hub — Session 14 Enhancement 4
 * Propel Stack AI, LLC
 *
 * Private daily mood check-in + free-write journal with AI reflection.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BookOpen, Brain, TrendingUp, Lock, Lightbulb } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

interface JournalEntry {
  id: string;
  entry_date: string;
  mood_score: number;
  mood_label: string;
  tags: string;
  created_at: string;
}

interface MoodTrend {
  entry_date: string;
  mood_score: number;
  mood_label: string;
}

interface MoodInsight {
  id: string;
  insight_type: string;
  content: string;
  insight_date: string;
}

interface CreateResult {
  id: string;
  mood_label: string;
  mood_emoji: string;
  ai_reflection: string;
  reflection_prompt: string;
  tokens_used: number;
}

const MOOD_OPTIONS = [
  { score: 1, emoji: '😞', label: 'Terrible' },
  { score: 2, emoji: '😕', label: 'Bad' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😊', label: 'Great' },
];

const MOOD_COLORS: Record<number, string> = { 1: '#EF4444', 2: '#F97316', 3: '#EAB308', 4: '#22C55E', 5: '#01696F' };

type Tab = 'log' | 'history' | 'insights';

export function Journal() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('log');
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [aiOptIn, setAiOptIn] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);

  const { data: entries = [] } = useQuery({
    queryKey: ['journal', 'list'],
    queryFn: () => apiRequest<JournalEntry[]>('/api/journal'),
    staleTime: 5 * 60_000,
  });

  const { data: trend = [] } = useQuery({
    queryKey: ['journal', 'trend'],
    queryFn: () => apiRequest<MoodTrend[]>('/api/journal/trend/mood'),
    staleTime: 15 * 60_000,
    enabled: tab === 'history',
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['journal', 'insights'],
    queryFn: () => apiRequest<MoodInsight[]>('/api/journal/insights/list'),
    staleTime: 60 * 60_000,
    enabled: tab === 'insights',
  });

  const create = useMutation({
    mutationFn: (body: { mood_score: number; content: string; ai_opted_in: boolean }) =>
      apiRequest<CreateResult>('/api/journal', { method: 'POST', body }),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['journal'] });
    },
  });

  const canSubmit = moodScore !== null;
  const todayEntry = entries[0]?.entry_date === new Date().toISOString().slice(0, 10);

  function handleSubmit() {
    if (!canSubmit || moodScore === null) return;
    create.mutate({ mood_score: moodScore, content, ai_opted_in: aiOptIn });
  }

  function reset() {
    setMoodScore(null);
    setContent('');
    setAiOptIn(false);
    setResult(null);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-teal/10 text-brand-teal border-transparent ring-1 ring-brand-teal/20">Life OS</span>
        <span className="chip text-surface-muted">Journal</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">Mood & Journal</h1>
          <p className="text-sm text-surface-muted mt-1 flex items-center gap-1">
            <Lock size={12} /> Private by default · your entries stay on device
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-raised rounded-xl p-1 w-fit">
        {([['log', 'Today'], ['history', 'History'], ['insights', 'Insights']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === id ? 'bg-white text-surface-ink shadow-sm' : 'text-surface-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* LOG TAB */}
      {tab === 'log' && (
        <div className="space-y-4">
          {result ? (
            /* Result state */
            <div className="card text-center py-8">
              <div className="text-5xl mb-3">{result.mood_emoji}</div>
              <p className="font-display font-bold text-xl text-surface-ink mb-1">Feeling {result.mood_label}</p>
              <p className="text-sm text-surface-muted mb-4">Entry saved ·{' '}{new Date().toLocaleDateString()}</p>
              {result.ai_reflection && (
                <div className="rounded-xl p-4 bg-brand-teal/5 text-left mb-4">
                  <div className="flex items-start gap-2">
                    <Brain size={16} className="text-brand-teal flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-brand-teal mb-1">AI Reflection</p>
                      <p className="text-sm text-surface-ink italic">{result.ai_reflection}</p>
                    </div>
                  </div>
                </div>
              )}
              {result.reflection_prompt && (
                <div className="rounded-xl p-4 bg-amber-50 text-left">
                  <div className="flex items-start gap-2">
                    <Lightbulb size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-surface-muted">{result.reflection_prompt}</p>
                  </div>
                </div>
              )}
              <button onClick={reset} className="btn-ghost mt-4">Log another entry</button>
            </div>
          ) : todayEntry && !result ? (
            /* Already logged today */
            <div className="card text-center py-8">
              <div className="text-4xl mb-3">{MOOD_OPTIONS.find(m => m.score === entries[0]?.mood_score)?.emoji ?? '😐'}</div>
              <p className="font-display font-bold text-surface-ink mb-1">You've logged today</p>
              <p className="text-sm text-surface-muted mb-4">Feeling {entries[0]?.mood_label}</p>
              <button onClick={reset} className="btn-ghost text-sm">Log again anyway</button>
            </div>
          ) : (
            /* Entry form */
            <>
              <div className="card">
                <h3 className="font-display font-bold text-sm text-surface-ink mb-4">How are you feeling?</h3>
                <div className="flex justify-between gap-2">
                  {MOOD_OPTIONS.map((m) => (
                    <button
                      key={m.score}
                      onClick={() => setMoodScore(m.score)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${moodScore === m.score ? 'border-current scale-105 shadow-md' : 'border-transparent bg-surface-raised hover:bg-surface-sunk'}`}
                      style={moodScore === m.score ? { borderColor: MOOD_COLORS[m.score], background: MOOD_COLORS[m.score] + '12' } : {}}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-xs font-semibold" style={moodScore === m.score ? { color: MOOD_COLORS[m.score] } : { color: '#9CA3AF' }}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-display font-bold text-sm text-surface-ink mb-2">Write (optional)</h3>
                <textarea
                  className="w-full resize-none text-sm text-surface-ink placeholder-surface-muted focus:outline-none"
                  rows={5}
                  placeholder="What's on your mind? This is private and only for you…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="border-t border-surface-ink/[0.06] pt-3 mt-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={aiOptIn} onChange={(e) => setAiOptIn(e.target.checked)} className="mt-0.5 rounded" />
                    <div>
                      <span className="text-sm text-surface-ink">Get AI reflection on this entry</span>
                      <p className="text-xs text-surface-muted mt-0.5">Your journal content will be sent to AI for a supportive reflection. ~300 tokens.</p>
                    </div>
                  </label>
                </div>
              </div>

              <button onClick={handleSubmit} disabled={!canSubmit || create.isPending} className="btn-primary w-full py-3 disabled:opacity-50">
                {create.isPending ? 'Saving…' : 'Save Entry'}
              </button>
            </>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-4">
          {trend.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-brand-teal" />
                <h3 className="font-display font-bold text-sm">30-Day Mood Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={trend}>
                  <XAxis dataKey="entry_date" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 9 }} width={16} />
                  <Tooltip formatter={((v: unknown) => [MOOD_OPTIONS.find(m => m.score === (v as number))?.label ?? v, 'Mood']) as never} />
                  <Line type="monotone" dataKey="mood_score" stroke="#01696F" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2">
            {entries.length === 0 ? (
              <div className="card text-center py-10 text-surface-muted">
                <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No journal entries yet. Start by logging your mood today.</p>
              </div>
            ) : entries.map((e) => (
              <div key={e.id} className="card flex items-center gap-4">
                <div className="rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0 text-xl" style={{ background: MOOD_COLORS[e.mood_score] + '18' }}>
                  {MOOD_OPTIONS.find(m => m.score === e.mood_score)?.emoji ?? '😐'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-ink">{new Date(e.entry_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <p className="text-xs text-surface-muted capitalize">{e.mood_label}</p>
                </div>
                <div className="h-2 w-16 bg-surface-sunk rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(e.mood_score / 5) * 100}%`, background: MOOD_COLORS[e.mood_score] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INSIGHTS TAB */}
      {tab === 'insights' && (
        <div className="space-y-3">
          <div className="card bg-amber-50 border-amber-100">
            <div className="flex items-start gap-2">
              <Lock size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">AI insights require your journal entries. Insights only generate after 5+ entries. Your content is processed privately.</p>
            </div>
          </div>
          {insights.length === 0 ? (
            <div className="card text-center py-10">
              <Brain size={32} className="mx-auto mb-3 text-surface-muted opacity-40" />
              <p className="font-display font-bold text-surface-ink mb-1">No insights yet</p>
              <p className="text-sm text-surface-muted">Log 5+ journal entries to unlock AI mood pattern analysis</p>
            </div>
          ) : insights.map((ins) => (
            <div key={ins.id} className="card">
              <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 bg-brand-teal/10 flex-shrink-0">
                  <Lightbulb size={14} className="text-brand-teal" />
                </div>
                <div>
                  <span className="chip text-xs bg-brand-teal/10 text-brand-teal border-transparent capitalize">{ins.insight_type}</span>
                  <p className="text-sm text-surface-ink mt-1">{ins.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
