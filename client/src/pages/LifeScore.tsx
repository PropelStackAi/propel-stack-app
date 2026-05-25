/**
 * Life Score / Wellness Dashboard — Session 14 Enhancement 1
 * Propel Stack AI, LLC
 *
 * Single AI-generated daily score (0-100) aggregating all hubs.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity, DollarSign, Heart, Share2, CheckSquare, Smile, RefreshCw, Settings, TrendingUp } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';
import { Link } from 'wouter';

interface LifeScoreData {
  total_score: number;
  finance_score: number;
  health_score: number;
  social_score: number;
  tasks_score: number;
  mood_score: number;
  ai_summary: string;
  score_date: string;
  cached: boolean;
}

interface ScoreHistory {
  score_date: string;
  total_score: number;
}

interface ScoreWeights {
  finance_weight: number;
  health_weight: number;
  social_weight: number;
  tasks_weight: number;
  mood_weight: number;
}

const SUB_SCORES = [
  { key: 'finance_score', label: 'Finance', icon: DollarSign, color: '#4F46E5', href: '/financial' },
  { key: 'health_score',  label: 'Health',  icon: Heart,      color: '#01696F', href: '/health'   },
  { key: 'social_score',  label: 'Social',  icon: Share2,     color: '#7C3AED', href: '/social'   },
  { key: 'tasks_score',   label: 'Tasks',   icon: CheckSquare,color: '#F97316', href: '/streaks'  },
  { key: 'mood_score',    label: 'Mood',    icon: Smile,      color: '#EC4899', href: '/journal'  },
] as const;

function scoreColor(score: number): string {
  if (score >= 80) return '#01696F';
  if (score >= 60) return '#4F46E5';
  if (score >= 40) return '#F97316';
  return '#EF4444';
}

function scoreGrade(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 45) return 'Fair';
  return 'Needs Attention';
}

export function LifeScore() {
  const qc = useQueryClient();
  const [days, setDays] = useState(30);

  const { data: score, isLoading } = useQuery({
    queryKey: ['lifescore', 'today'],
    queryFn: () => apiRequest<LifeScoreData>('/api/lifescore/demo-user'),
    staleTime: 60 * 60_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['lifescore', 'history', days],
    queryFn: () => apiRequest<ScoreHistory[]>(`/api/lifescore/history/demo-user?days=${days}`),
    staleTime: 30 * 60_000,
  });

  const { data: weights } = useQuery({
    queryKey: ['lifescore', 'weights'],
    queryFn: () => apiRequest<ScoreWeights>('/api/lifescore/weights/demo-user'),
  });

  const regen = useMutation({
    mutationFn: () => apiRequest('/api/lifescore/generate', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lifescore'] }),
  });

  const updateWeights = useMutation({
    mutationFn: (w: Partial<ScoreWeights>) => apiRequest('/api/lifescore/weights', { method: 'PUT', body: w }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lifescore', 'weights'] });
      setShowWeights(false);
    },
  });

  const [showWeights, setShowWeights] = useState(false);
  const [localWeights, setLocalWeights] = useState<ScoreWeights | null>(null);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-surface-raised rounded w-48" />
        <div className="h-64 bg-surface-raised rounded-2xl" />
      </div>
    );
  }

  const s = score ?? { total_score: 0, finance_score: 0, health_score: 0, social_score: 0, tasks_score: 0, mood_score: 0, ai_summary: '', score_date: '', cached: false };
  const radialData = [{ name: 'score', value: s.total_score, fill: scoreColor(s.total_score) }];
  const wts = localWeights ?? weights ?? { finance_weight: 0.25, health_weight: 0.25, social_weight: 0.20, tasks_weight: 0.15, mood_weight: 0.15 };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-indigo/10 text-brand-indigo border-transparent ring-1 ring-brand-indigo/20">Life OS</span>
        <span className="chip text-surface-muted">Life Score</span>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">Life Score</h1>
          <p className="text-sm text-surface-muted mt-1">Your daily wellness snapshot</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWeights(!showWeights)}
            className="btn-ghost flex items-center gap-1.5 text-sm"
          >
            <Settings size={15} /> Weights
          </button>
          <button
            onClick={() => regen.mutate()}
            disabled={regen.isPending}
            className="btn-ghost flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            <RefreshCw size={15} className={regen.isPending ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Weights editor */}
      {showWeights && (
        <div className="card mb-6">
          <h3 className="font-display font-bold text-sm mb-3">Category Weights (must sum to 1.0)</h3>
          <div className="space-y-3">
            {(['finance', 'health', 'social', 'tasks', 'mood'] as const).map((k) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-sm text-surface-muted w-16 capitalize">{k}</span>
                <input
                  type="range" min="0.05" max="0.50" step="0.05"
                  value={wts[`${k}_weight` as keyof ScoreWeights]}
                  onChange={(e) => setLocalWeights({ ...wts, [`${k}_weight`]: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-10 text-right">{(wts[`${k}_weight` as keyof ScoreWeights] * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => updateWeights.mutate(wts)} disabled={updateWeights.isPending} className="btn-primary text-sm">Save</button>
            <button onClick={() => { setShowWeights(false); setLocalWeights(null); }} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 mb-6">
        {/* Score Ring */}
        <div className="card flex flex-col items-center justify-center py-8">
          <div className="relative w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialData} startAngle={180} endAngle={-180}>
                <RadialBar dataKey="value" background={{ fill: 'var(--color-surface-sunk, #f3f4f6)' }} cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-extrabold text-5xl" style={{ color: scoreColor(s.total_score) }}>{s.total_score}</span>
              <span className="text-xs text-surface-muted mt-1">{scoreGrade(s.total_score)}</span>
            </div>
          </div>
          {s.ai_summary && (
            <p className="text-sm text-surface-muted text-center mt-4 max-w-xs italic">"{s.ai_summary}"</p>
          )}
        </div>

        {/* Sub-scores */}
        <div className="grid grid-cols-1 gap-3">
          {SUB_SCORES.map(({ key, label, icon: Icon, color, href }) => {
            const val = s[key];
            return (
              <Link key={key} href={href}>
                <div className="card flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="rounded-xl p-2 flex-shrink-0" style={{ background: color + '18' }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-surface-ink">{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>{val}</span>
                    </div>
                    <div className="h-1.5 bg-surface-sunk rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${val}%`, background: color }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* History Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-indigo" />
            <h2 className="font-display font-bold text-sm text-surface-ink">Score History</h2>
          </div>
          <div className="flex gap-1">
            {[7, 30, 90, 365].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`text-xs px-2 py-1 rounded-lg transition-colors ${days === d ? 'bg-brand-indigo text-white' : 'text-surface-muted hover:bg-surface-raised'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={history}>
              <XAxis dataKey="score_date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
              <Tooltip formatter={((v: unknown) => [`${v}/100`, 'Life Score']) as never} />
              <Line type="monotone" dataKey="total_score" stroke="#4F46E5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-24 text-surface-muted text-sm">
            <Activity size={24} className="mb-2 opacity-40" />
            History builds as you use the app daily
          </div>
        )}
      </div>
    </div>
  );
}
