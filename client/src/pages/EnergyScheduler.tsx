// ─── Energy Scheduler — Enhancement 25 (Energy-Aware Scheduling) ─────────────
// Propel Stack AI, LLC

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Clock, TrendingUp, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';
import { analytics } from '../lib/analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

type EnergyType = 'physical' | 'mental' | 'emotional';

interface EnergyLog {
  id: number;
  energy_level: number;
  energy_type: EnergyType;
  note: string | null;
  logged_at: string;
}

interface TodayEnergy {
  logs: EnergyLog[];
  avg_energy: number;
}

interface EnergyProfile {
  peak_hours: number[];
  low_hours: number[];
  avg_daily: number;
  data_points: number;
}

interface Recommendation {
  hour: number;
  label: string;
  task_type: string;
  reason: string;
}

interface EnergySchedule {
  recommendations: Recommendation[];
  ai_tip: string | null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useTodayEnergy() {
  return useQuery({
    queryKey: ['energy-today'],
    queryFn: () => apiRequest<TodayEnergy>('/api/energy/today'),
  });
}

function useEnergyProfile() {
  return useQuery({
    queryKey: ['energy-profile'],
    queryFn: () => apiRequest<EnergyProfile>('/api/energy/profile'),
  });
}

function useEnergySchedule() {
  return useQuery({
    queryKey: ['energy-schedule'],
    queryFn: () => apiRequest<EnergySchedule>('/api/energy/schedule'),
  });
}

// ─── Energy Level Selector ────────────────────────────────────────────────────

const LEVEL_META: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Drained',   color: '#ef4444', bg: '#fef2f2' },
  2: { label: 'Low',       color: '#f97316', bg: '#fff7ed' },
  3: { label: 'Moderate',  color: '#eab308', bg: '#fefce8' },
  4: { label: 'Good',      color: '#22c55e', bg: '#f0fdf4' },
  5: { label: 'Peak',      color: '#4F35C2', bg: '#f0eeff' },
};

const TYPE_LABELS: Record<EnergyType, string> = {
  physical: '💪 Physical',
  mental:   '🧠 Mental',
  emotional:'❤️ Emotional',
};

function EnergyInput({ onLogged }: { onLogged: () => void }) {
  const qc = useQueryClient();
  const [level,  setLevel ] = useState<number>(3);
  const [type,   setType  ] = useState<EnergyType>('mental');
  const [note,   setNote  ] = useState('');
  const [done,   setDone  ] = useState(false);

  const log = useMutation({
    mutationFn: () =>
      apiRequest('/api/energy/log', {
        method: 'POST',
        body: { energy_level: level, energy_type: type, note: note.trim() || undefined },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['energy-today'] });
      qc.invalidateQueries({ queryKey: ['energy-profile'] });
      qc.invalidateQueries({ queryKey: ['energy-schedule'] });
      analytics.energyLogged(level, type);
      setDone(true);
      setNote('');
      setTimeout(() => { setDone(false); onLogged(); }, 1500);
    },
  });

  if (done) {
    return (
      <div className="card flex items-center gap-3 text-green-700 dark:text-green-400">
        <CheckCircle2 size={20} />
        <p className="text-sm font-semibold">Energy logged!</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={18} className="text-brand-coral" />
        <p className="font-semibold text-sm text-surface-ink dark:text-white">Log your energy</p>
      </div>

      {/* Level selector */}
      <div className="space-y-2">
        <p className="label">Energy level right now</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const meta = LEVEL_META[n];
            const active = level === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setLevel(n)}
                className="flex-1 py-2 rounded-xl text-sm font-bold transition-all border-2"
                style={{
                  background: active ? meta.bg : 'transparent',
                  borderColor: active ? meta.color : 'rgba(26,22,37,0.08)',
                  color: active ? meta.color : '#6B6680',
                }}
                aria-pressed={active}
                aria-label={`Level ${n}: ${meta.label}`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center font-medium" style={{ color: LEVEL_META[level].color }}>
          {LEVEL_META[level].label}
        </p>
      </div>

      {/* Type selector */}
      <div className="space-y-2">
        <p className="label">Type</p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TYPE_LABELS) as EnergyType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                type === t
                  ? 'bg-brand-indigo text-white border-brand-indigo'
                  : 'border-surface-ink/10 dark:border-white/10 text-surface-muted dark:text-white/60 hover:border-brand-indigo/40'
              }`}
              aria-pressed={type === t}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Optional note */}
      <div className="space-y-1">
        <label className="label" htmlFor="energy-note">Note (optional)</label>
        <input
          id="energy-note"
          className="input"
          placeholder="What's affecting your energy today?"
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={200}
        />
      </div>

      <button
        type="button"
        onClick={() => log.mutate()}
        disabled={log.isPending}
        className="btn-primary w-full"
      >
        {log.isPending ? 'Saving…' : 'Log Energy'}
      </button>
    </div>
  );
}

// ─── Peak/Low Hour Badge ──────────────────────────────────────────────────────

function formatHour(h: number): string {
  if (h === 0)  return '12 AM';
  if (h < 12)   return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function HourBadges({ hours, color, label }: { hours: number[]; color: string; label: string }) {
  if (hours.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-surface-muted uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {hours.slice(0, 6).map(h => (
          <span
            key={h}
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: `${color}18`, color }}
          >
            {formatHour(h)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Schedule Recommendations ─────────────────────────────────────────────────

function ScheduleCard({ rec }: { rec: Recommendation }) {
  const taskColors: Record<string, string> = {
    'deep work':          '#4F35C2',
    'creative work':      '#F05A28',
    'admin tasks':        '#01696F',
    'recovery':           '#6B21A8',
    'light tasks':        '#0891b2',
    'physical activity':  '#16a34a',
    'meetings':           '#d97706',
  };
  const color = taskColors[rec.task_type.toLowerCase()] ?? '#4F35C2';

  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-ink/[0.06] dark:border-white/[0.06] last:border-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <Clock size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-surface-ink dark:text-white">{formatHour(rec.hour)}</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
            style={{ background: `${color}15`, color }}
          >
            {rec.task_type}
          </span>
        </div>
        <p className="text-xs text-surface-muted leading-relaxed">{rec.reason}</p>
      </div>
      <ChevronRight size={14} className="text-surface-muted shrink-0 mt-1" />
    </div>
  );
}

// ─── Today's Logs ─────────────────────────────────────────────────────────────

function TodayLogs({ logs }: { logs: EnergyLog[] }) {
  if (logs.length === 0) return null;
  return (
    <div className="card space-y-2">
      <p className="font-semibold text-sm text-surface-ink dark:text-white">Today's logs</p>
      <ul className="divide-y divide-surface-ink/[0.06] dark:divide-white/[0.06]">
        {logs.map(log => {
          const meta = LEVEL_META[log.energy_level];
          return (
            <li key={log.id} className="py-2 flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: meta.bg, color: meta.color }}
              >
                {log.energy_level}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-surface-ink dark:text-white">{meta.label}</span>
                <span className="text-xs text-surface-muted ml-1.5">{TYPE_LABELS[log.energy_type]}</span>
                {log.note && (
                  <p className="text-xs text-surface-muted truncate">{log.note}</p>
                )}
              </div>
              <span className="text-xs text-surface-muted shrink-0">
                {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function EnergyScheduler() {
  const { data: today } = useTodayEnergy();
  const { data: profile,  isLoading: profileLoading  } = useEnergyProfile();
  const { data: schedule, isLoading: scheduleLoading } = useEnergySchedule();
  const [logKey, setLogKey] = useState(0); // bump to re-render input after submission

  const logs = today?.logs ?? [];
  const recs = schedule?.recommendations ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={22} className="text-brand-coral" />
          <h1 className="font-display text-2xl font-bold text-surface-ink dark:text-white">Energy Scheduler</h1>
        </div>
        <p className="text-sm text-surface-muted">
          Track your energy levels and get AI-powered scheduling suggestions that match your natural rhythms.
        </p>
      </div>

      {/* Log input */}
      <EnergyInput key={logKey} onLogged={() => setLogKey(k => k + 1)} />

      {/* Profile card */}
      {!profileLoading && profile && profile.data_points > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-indigo" />
              <p className="font-semibold text-sm text-surface-ink dark:text-white">Your Energy Profile</p>
            </div>
            <span className="chip">{profile.data_points} data points</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-sunk dark:bg-white/5">
            <div className="text-center">
              <div className="text-2xl font-display font-bold text-brand-indigo">{profile.avg_daily.toFixed(1)}</div>
              <div className="text-[10px] text-surface-muted uppercase tracking-wide">avg daily</div>
            </div>
            <div className="flex-1 space-y-3">
              <HourBadges hours={profile.peak_hours} color="#4F35C2" label="Peak hours" />
              <HourBadges hours={profile.low_hours}  color="#F05A28" label="Low hours"  />
            </div>
          </div>

          {profile.data_points < 10 && (
            <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                Log energy for a few more days to build a reliable profile. Recommendations improve with more data.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Schedule recommendations */}
      {!scheduleLoading && (
        <div className="card space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-brand-indigo" />
            <p className="font-semibold text-sm text-surface-ink dark:text-white">Today's Optimal Schedule</p>
          </div>

          {recs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">⚡</p>
              <p className="text-sm text-surface-muted">Log a few energy check-ins to get personalized schedule recommendations.</p>
            </div>
          ) : (
            <>
              {recs.map((rec, i) => (
                <ScheduleCard key={i} rec={rec} />
              ))}
              {schedule?.ai_tip && (
                <div className="mt-3 p-3 rounded-xl bg-brand-indigo/5 dark:bg-brand-indigo/10 border border-brand-indigo/10">
                  <p className="text-xs font-semibold text-brand-indigo mb-1">AI Tip</p>
                  <p className="text-xs text-surface-ink dark:text-white/80 leading-relaxed">{schedule.ai_tip}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Today's logs */}
      <TodayLogs logs={logs} />

      {/* Empty state for profile */}
      {!profileLoading && profile && profile.data_points === 0 && (
        <div className="card text-center py-8">
          <p className="text-3xl mb-3">⚡</p>
          <p className="text-sm font-semibold text-surface-ink dark:text-white mb-1">Start tracking your energy</p>
          <p className="text-xs text-surface-muted max-w-xs mx-auto">
            Log your energy levels a few times a day. After a week, Propel Stack AI will learn your natural rhythms and suggest the best times for deep work, meetings, and rest.
          </p>
        </div>
      )}
    </div>
  );
}
