/**
 * Goals & Milestones Hub — Session 14 Enhancement 3
 * Propel Stack AI, LLC
 *
 * Users set big-picture goals and the AI tracks progress automatically.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { Plus, Target, Trophy, ChevronRight, CheckCircle2, Circle, Brain, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

interface Goal {
  id: string;
  title: string;
  category: string;
  target_value: number;
  current_value: number;
  unit: string;
  hub_source?: string;
  target_date?: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  ai_coaching_enabled: boolean;
  created_at: string;
}

interface GoalDetail extends Goal {
  milestones: Array<{ id: string; milestone_pct: number; achieved_at?: string; ai_message: string }>;
  progress: Array<{ logged_value: number; logged_at: string; source: string }>;
}

const CATEGORIES = ['finance', 'health', 'personal', 'family', 'career'] as const;
const CATEGORY_COLORS: Record<string, string> = {
  finance: '#4F46E5', health: '#01696F', personal: '#7C3AED', family: '#F97316', career: '#EC4899',
};
const CATEGORY_LABELS: Record<string, string> = {
  finance: 'Finance', health: 'Health', personal: 'Personal', family: 'Family', career: 'Career',
};

function pct(g: Goal): number {
  if (g.target_value === 0) return 0;
  return Math.min(100, Math.round((g.current_value / g.target_value) * 100));
}

function GoalRing({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const p = pct(goal);
  const color = CATEGORY_COLORS[goal.category] ?? '#4F46E5';
  const isOverdue = goal.target_date && new Date(goal.target_date) < new Date() && goal.status === 'active';

  return (
    <div onClick={onClick} className="card cursor-pointer hover:shadow-md transition-shadow relative">
      {isOverdue && <div className="absolute top-2 right-2"><AlertCircle size={14} className="text-amber-500" /></div>}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ value: p, fill: color }]} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" background={{ fill: '#f3f4f6' }} cornerRadius={4} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color }}>{p}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: color + '18', color }}>{CATEGORY_LABELS[goal.category] ?? goal.category}</span>
          </div>
          <p className="font-semibold text-sm text-surface-ink truncate">{goal.title}</p>
          <p className="text-xs text-surface-muted mt-0.5">
            {goal.current_value} / {goal.target_value} {goal.unit}
            {goal.target_date && ` · due ${new Date(goal.target_date).toLocaleDateString()}`}
          </p>
        </div>
        <ChevronRight size={16} className="text-surface-muted flex-shrink-0" />
      </div>
    </div>
  );
}

function CreateGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: '', category: 'personal', target_value: 100, current_value: 0, unit: '%', target_date: '', ai_coaching_enabled: true });

  const create = useMutation({
    mutationFn: (body: typeof form) => apiRequest('/api/goals', { method: 'POST', body }),
    onSuccess: () => { onCreated(); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-xl mb-4">New Goal</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Title</label>
            <input className="input w-full mt-1" placeholder="e.g. Save $10,000 emergency fund" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Category</label>
              <select className="input w-full mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Unit</label>
              <select className="input w-full mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="%">% (percent)</option>
                <option value="USD">$ (dollars)</option>
                <option value="lbs">lbs</option>
                <option value="books">books</option>
                <option value="km">km</option>
                <option value="hrs">hours</option>
                <option value="custom">custom</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Target</label>
              <input className="input w-full mt-1" type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Current</label>
              <input className="input w-full mt-1" type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Target Date (optional)</label>
            <input className="input w-full mt-1" type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ai_coaching_enabled} onChange={(e) => setForm({ ...form, ai_coaching_enabled: e.target.checked })} className="rounded" />
            <span className="text-sm text-surface-ink">Enable AI coaching for this goal</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => create.mutate(form)} disabled={!form.title || create.isPending} className="btn-primary flex-1 disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create Goal'}
          </button>
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function GoalDetailModal({ goalId, onClose }: { goalId: string; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: goal } = useQuery({
    queryKey: ['goals', goalId],
    queryFn: () => apiRequest<GoalDetail>(`/api/goals/${goalId}`),
  });

  const { data: coaching } = useQuery({
    queryKey: ['goals', goalId, 'coaching'],
    queryFn: () => apiRequest<{ coaching: string; pct: number; days_left?: number }>(`/api/goals/${goalId}/coaching`),
    enabled: !!goal?.ai_coaching_enabled,
  });

  const updateProgress = useMutation({
    mutationFn: (current_value: number) => apiRequest(`/api/goals/${goalId}`, { method: 'PATCH', body: { current_value } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); onClose(); },
  });

  const [newValue, setNewValue] = useState('');

  if (!goal) return null;
  const p = pct(goal);
  const color = CATEGORY_COLORS[goal.category] ?? '#4F46E5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="chip text-xs" style={{ background: color + '18', color, border: 'none' }}>{CATEGORY_LABELS[goal.category]}</span>
            <h2 className="font-display font-bold text-xl mt-1">{goal.title}</h2>
          </div>
          <button onClick={onClose} className="text-surface-muted hover:text-surface-ink">✕</button>
        </div>

        {/* Progress Ring */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ value: p, fill: color }]} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" background={{ fill: '#f3f4f6' }} cornerRadius={4} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-extrabold" style={{ color }}>{p}%</span>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-surface-ink">{goal.current_value} <span className="text-sm text-surface-muted">/ {goal.target_value} {goal.unit}</span></p>
            {goal.target_date && <p className="text-sm text-surface-muted mt-1">Due {new Date(goal.target_date).toLocaleDateString()}</p>}
          </div>
        </div>

        {/* AI Coaching */}
        {coaching?.coaching && (
          <div className="rounded-xl p-4 mb-4" style={{ background: color + '10' }}>
            <div className="flex items-start gap-2">
              <Brain size={16} color={color} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm text-surface-ink italic">{coaching.coaching}</p>
            </div>
          </div>
        )}

        {/* Milestones */}
        {goal.milestones && goal.milestones.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">Milestones</h3>
            <div className="grid grid-cols-4 gap-2">
              {goal.milestones.map((m) => (
                <div key={m.id} className={`text-center rounded-xl p-2 ${m.achieved_at ? 'bg-green-50' : 'bg-surface-raised'}`}>
                  {m.achieved_at ? <CheckCircle2 size={16} className="mx-auto text-green-500 mb-1" /> : <Circle size={16} className="mx-auto text-surface-muted mb-1" />}
                  <p className="text-xs font-bold" style={{ color: m.achieved_at ? '#22c55e' : undefined }}>{m.milestone_pct}%</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log Progress */}
        <div className="border-t border-surface-ink/[0.06] pt-4">
          <h3 className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">Log Progress</h3>
          <div className="flex gap-2">
            <input className="input flex-1" type="number" placeholder={`New value (${goal.unit})`} value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            <button onClick={() => updateProgress.mutate(Number(newValue))} disabled={!newValue || updateProgress.isPending} className="btn-primary px-4 disabled:opacity-50">Log</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Goals() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiRequest<Goal[]>('/api/goals'),
    staleTime: 5 * 60_000,
  });

  const filtered = goals.filter((g) => filter === 'all' ? true : g.status === filter);
  const activeCount = goals.filter((g) => g.status === 'active').length;
  const completedCount = goals.filter((g) => g.status === 'completed').length;

  return (
    <div>
      {showCreate && <CreateGoalModal onClose={() => setShowCreate(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['goals'] })} />}
      {selectedGoalId && <GoalDetailModal goalId={selectedGoalId} onClose={() => setSelectedGoalId(null)} />}

      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-indigo/10 text-brand-indigo border-transparent ring-1 ring-brand-indigo/20">Life OS</span>
        <span className="chip text-surface-muted">Goals</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">Goals & Milestones</h1>
          <p className="text-sm text-surface-muted mt-1">{activeCount} active · {completedCount} completed</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Active', value: activeCount, icon: Target, color: '#4F46E5' },
          { label: 'Completed', value: completedCount, icon: Trophy, color: '#01696F' },
          { label: 'Avg Progress', value: goals.filter(g => g.status === 'active').length > 0 ? Math.round(goals.filter(g => g.status === 'active').reduce((a, g) => a + pct(g), 0) / Math.max(1, goals.filter(g => g.status === 'active').length)) + '%' : '—', icon: CheckCircle2, color: '#F97316' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card text-center py-4">
            <div className="rounded-xl p-2 mx-auto mb-2 w-fit" style={{ background: color + '18' }}>
              <Icon size={16} color={color} />
            </div>
            <div className="font-display font-extrabold text-2xl text-surface-ink">{value}</div>
            <div className="text-xs text-surface-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-surface-raised rounded-xl p-1 w-fit">
        {(['active', 'completed', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${filter === f ? 'bg-white text-surface-ink shadow-sm' : 'text-surface-muted'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-raised rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Target size={40} className="text-surface-muted mb-4" />
          <p className="font-display font-bold text-surface-ink mb-1">No {filter === 'all' ? '' : filter} goals yet</p>
          <p className="text-sm text-surface-muted mb-4">Set a goal to start tracking your progress</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create your first goal</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((goal) => <GoalRing key={goal.id} goal={goal} onClick={() => setSelectedGoalId(goal.id)} />)}
        </div>
      )}
    </div>
  );
}
