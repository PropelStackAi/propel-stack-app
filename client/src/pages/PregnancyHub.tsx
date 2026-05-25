// ─── Pregnancy & Motherhood Hub ───────────────────────────────────────────────
// Propel Stack AI, LLC
//
// Disclaimer: PSAI-PREG-DISC-v1.0 — Propel Stack AI is not a medical provider.
// This hub is for informational and organizational purposes only. Always consult
// your OB/GYN, midwife, or qualified healthcare professional for medical advice.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart, Baby, Activity, Sparkles, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, MessageCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';
import { analytics } from '../lib/analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'trying' | 'pregnant' | 'postpartum';

interface PregnancyProfile {
  id: number;
  phase: Phase;
  lmp_date: string | null;
  due_date: string | null;
  baby_name: string | null;
  cycle_length: number;
  current_week: number | null;
}

interface WeekInfo {
  week: number | null;
  due_date: string | null;
  baby_name: string | null;
  trimester: number;
  days_until_due: number | null;
  milestone: { size: string; development: string } | null;
}

interface BabyLog {
  id: number;
  log_type: string;
  log_value: string | null;
  log_date: string;
  note: string | null;
}

// ─── Phase labels ─────────────────────────────────────────────────────────────

const PHASE_META: Record<Phase, { label: string; emoji: string; color: string }> = {
  trying:     { label: 'Trying to Conceive', emoji: '🌱', color: '#01696F' },
  pregnant:   { label: 'Pregnant',            emoji: '🤰', color: '#4F35C2' },
  postpartum: { label: 'Postpartum',          emoji: '👶', color: '#F05A28' },
};

const LOG_TYPE_META: Record<string, { label: string; emoji: string }> = {
  kick:     { label: 'Kick Count',   emoji: '👣' },
  feeding:  { label: 'Feeding',      emoji: '🍼' },
  sleep:    { label: 'Sleep',        emoji: '😴' },
  diaper:   { label: 'Diaper',       emoji: '🧷' },
  weight:   { label: 'Weight',       emoji: '⚖️' },
  symptom:  { label: 'Symptom',      emoji: '🩺' },
};

// ─── Profile Setup ────────────────────────────────────────────────────────────

function ProfileSetup({ onSaved }: { onSaved: () => void }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>('pregnant');
  const [lmpDate, setLmpDate] = useState('');
  const [babyName, setBabyName] = useState('');
  const [cycleLength, setCycleLength] = useState(28);

  const save = useMutation({
    mutationFn: () =>
      apiRequest('/api/pregnancy/profile', {
        method: 'POST',
        body: { phase, lmp_date: lmpDate || undefined, baby_name: babyName || undefined, cycle_length: cycleLength },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pregnancy-profile'] });
      qc.invalidateQueries({ queryKey: ['pregnancy-week-info'] });
      analytics.featureFirstUsed('pregnancy_hub');
      onSaved();
    },
  });

  return (
    <div className="card space-y-5 max-w-md mx-auto">
      <div className="text-center">
        <p className="text-3xl mb-2">🌸</p>
        <h2 className="font-display text-xl font-bold text-surface-ink dark:text-white">Set up your hub</h2>
        <p className="text-sm text-surface-muted mt-1">Tell us where you are in your journey</p>
      </div>

      <div className="space-y-2">
        <p className="label">Your phase</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(PHASE_META) as [Phase, typeof PHASE_META[Phase]][]).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPhase(key)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                phase === key
                  ? 'border-brand-indigo bg-brand-indigo/5'
                  : 'border-surface-ink/10 dark:border-white/10'
              }`}
              aria-pressed={phase === key}
            >
              <div className="text-xl mb-1">{meta.emoji}</div>
              <div className="text-[11px] font-semibold text-surface-ink dark:text-white leading-tight">{meta.label}</div>
            </button>
          ))}
        </div>
      </div>

      {(phase === 'pregnant' || phase === 'trying') && (
        <div className="space-y-1">
          <label className="label" htmlFor="lmp-date">Last menstrual period date</label>
          <input
            id="lmp-date"
            type="date"
            className="input"
            value={lmpDate}
            onChange={e => setLmpDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          <p className="text-xs text-surface-muted">Used to estimate your due date and current week</p>
        </div>
      )}

      {phase === 'pregnant' && (
        <div className="space-y-1">
          <label className="label" htmlFor="baby-name">Baby's name or nickname (optional)</label>
          <input
            id="baby-name"
            className="input"
            placeholder="e.g. Baby Smith, Peanut"
            value={babyName}
            onChange={e => setBabyName(e.target.value)}
          />
        </div>
      )}

      {phase === 'trying' && (
        <div className="space-y-1">
          <label className="label" htmlFor="cycle-len">Average cycle length (days)</label>
          <input
            id="cycle-len"
            type="number"
            min={21}
            max={40}
            className="input"
            value={cycleLength}
            onChange={e => setCycleLength(Number(e.target.value))}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="btn-primary w-full"
      >
        {save.isPending ? 'Saving…' : 'Get Started'}
      </button>

      <p className="text-[10px] text-surface-muted/70 text-center leading-relaxed">
        Propel Stack AI is not a medical provider. This hub is for informational purposes only.
        Always consult your healthcare provider for medical advice.
      </p>
    </div>
  );
}

// ─── Week Progress Card ───────────────────────────────────────────────────────

function WeekCard({ info }: { info: WeekInfo }) {
  const pct = info.week ? Math.min(100, (info.week / 40) * 100) : 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="label">Current pregnancy week</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-bold text-brand-indigo">{info.week ?? '—'}</span>
            <span className="text-sm text-surface-muted">/ 40 weeks</span>
          </div>
          {info.trimester && (
            <span className="chip mt-1">Trimester {info.trimester}</span>
          )}
        </div>
        {info.days_until_due !== null && info.days_until_due >= 0 && (
          <div className="text-right">
            <p className="text-xs text-surface-muted">Due date</p>
            <p className="text-sm font-semibold text-surface-ink dark:text-white">
              {info.due_date ? new Date(info.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </p>
            <p className="text-xs text-surface-muted">{info.days_until_due} days away</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-surface-sunk dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4F35C2, #F05A28)' }}
        />
      </div>

      {/* Milestone */}
      {info.milestone && (
        <div className="bg-brand-indigo/5 dark:bg-brand-indigo/10 rounded-xl p-3 border border-brand-indigo/10">
          <p className="text-xs font-semibold text-brand-indigo mb-1">
            This week — size of a {info.milestone.size}
          </p>
          <p className="text-xs text-surface-ink dark:text-white/80 leading-relaxed">{info.milestone.development}</p>
        </div>
      )}

      {info.baby_name && (
        <p className="text-sm text-surface-muted text-center">
          👶 Tracking for <strong className="text-surface-ink dark:text-white">{info.baby_name}</strong>
        </p>
      )}
    </div>
  );
}

// ─── Quick Log ────────────────────────────────────────────────────────────────

function QuickLog() {
  const qc = useQueryClient();
  const [logType, setLogType] = useState('kick');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      apiRequest('/api/pregnancy/baby-log', {
        method: 'POST',
        body: { log_type: logType, note: note.trim() || undefined },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baby-logs'] });
      setDone(true);
      setNote('');
      setTimeout(() => setDone(false), 1800);
    },
  });

  if (done) {
    return (
      <div className="card flex items-center gap-3 text-green-700 dark:text-green-400">
        <CheckCircle2 size={18} />
        <p className="text-sm font-semibold">Logged!</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Baby size={16} className="text-brand-indigo" />
        <p className="font-semibold text-sm text-surface-ink dark:text-white">Quick log</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(LOG_TYPE_META).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            onClick={() => setLogType(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              logType === key
                ? 'bg-brand-indigo text-white border-brand-indigo'
                : 'border-surface-ink/10 dark:border-white/10 text-surface-muted dark:text-white/60 hover:border-brand-indigo/40'
            }`}
            aria-pressed={logType === key}
          >
            {meta.emoji} {meta.label}
          </button>
        ))}
      </div>

      <input
        className="input"
        placeholder="Optional note…"
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="btn-primary"
      >
        {save.isPending ? 'Saving…' : `Log ${LOG_TYPE_META[logType]?.label}`}
      </button>
    </div>
  );
}

// ─── Recent Logs ──────────────────────────────────────────────────────────────

function RecentLogs({ logs }: { logs: BabyLog[] }) {
  const [open, setOpen] = useState(false);
  if (logs.length === 0) return null;

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between"
        aria-expanded={open}
      >
        <span className="font-semibold text-sm text-surface-ink dark:text-white">Recent logs ({logs.length})</span>
        {open ? <ChevronUp size={16} className="text-surface-muted" /> : <ChevronDown size={16} className="text-surface-muted" />}
      </button>

      {open && (
        <ul className="mt-4 divide-y divide-surface-ink/[0.06] dark:divide-white/[0.06]">
          {logs.slice(0, 10).map(log => {
            const meta = LOG_TYPE_META[log.log_type] ?? { label: log.log_type, emoji: '📌' };
            return (
              <li key={log.id} className="py-2 flex items-center gap-3">
                <span className="text-base shrink-0">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-surface-ink dark:text-white">{meta.label}</p>
                  {log.note && <p className="text-xs text-surface-muted truncate">{log.note}</p>}
                </div>
                <span className="text-xs text-surface-muted shrink-0">
                  {new Date(log.log_date).toLocaleDateString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── AI Advisor ───────────────────────────────────────────────────────────────

function AIAdvisor({ phase, week }: { phase: Phase; week: number | null }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const data = await apiRequest<{ advice: string }>('/api/pregnancy/ai-advice', {
        method: 'POST',
        body: { question: question.trim(), phase, week: week ?? undefined },
      });
      setAnswer(data.advice);
    } catch {
      setAnswer('Unable to get AI response right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-brand-coral" />
        <p className="font-semibold text-sm text-surface-ink dark:text-white">AI Advisor</p>
        <span className="chip text-[10px]">Not medical advice</span>
      </div>

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask a question about your journey…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
        />
        <button
          type="button"
          onClick={ask}
          disabled={loading || !question.trim()}
          className="btn-primary"
        >
          {loading ? '…' : 'Ask'}
        </button>
      </div>

      {answer && (
        <div className="bg-surface-sunk dark:bg-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <MessageCircle size={13} className="text-brand-coral" />
            <p className="text-xs font-semibold text-brand-coral">AI Response</p>
          </div>
          <p className="text-sm text-surface-ink dark:text-white/90 leading-relaxed">{answer}</p>
          <div className="flex items-start gap-1.5 mt-2">
            <AlertCircle size={11} className="text-surface-muted mt-0.5 shrink-0" />
            <p className="text-[10px] text-surface-muted/70 leading-relaxed">
              For medical concerns, always consult your OB/GYN, midwife, or healthcare provider.
            </p>
          </div>
        </div>
      )}

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5">
        {[
          'What foods should I avoid?',
          'When should I feel movements?',
          'What\'s normal for this trimester?',
          'Recovery tips for postpartum',
        ].map(q => (
          <button
            key={q}
            type="button"
            onClick={() => { setQuestion(q); }}
            className="px-2.5 py-1 rounded-full text-[11px] bg-surface-sunk dark:bg-white/5 text-surface-muted dark:text-white/60 hover:text-surface-ink dark:hover:text-white transition-colors border border-surface-ink/[0.06] dark:border-white/[0.06]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Postpartum Phase ─────────────────────────────────────────────────────────

function PostpartumPhase() {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Heart size={18} className="text-brand-coral" />
        <p className="font-semibold text-sm text-surface-ink dark:text-white">Recovery milestones</p>
      </div>
      <ul className="space-y-3">
        {[
          { week: '1–2 weeks', label: 'Hospital discharge, initial recovery', emoji: '🏥' },
          { week: '2–6 weeks', label: 'Physical healing, establishing feeding', emoji: '🍼' },
          { week: '6 weeks',   label: 'Postpartum checkup with provider', emoji: '👩‍⚕️' },
          { week: '3 months',  label: 'Hormones stabilizing, energy returning', emoji: '✨' },
          { week: '6 months',  label: 'Many moms return to pre-pregnancy activity', emoji: '🏃' },
          { week: '1 year',    label: 'Full fourth trimester behind you — celebrate!', emoji: '🎉' },
        ].map(m => (
          <li key={m.week} className="flex items-start gap-3">
            <span className="text-base shrink-0 mt-0.5">{m.emoji}</span>
            <div>
              <p className="text-xs font-semibold text-surface-ink dark:text-white">{m.week}</p>
              <p className="text-xs text-surface-muted">{m.label}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-surface-muted/70 text-center leading-relaxed">
        Recovery timelines vary. Always follow your provider's guidance.
      </p>
    </div>
  );
}

// ─── TTC (Trying to Conceive) Phase ──────────────────────────────────────────

function TTCPhase() {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-brand-teal" />
        <p className="font-semibold text-sm text-surface-ink dark:text-white">Cycle & Fertility Tracking</p>
      </div>
      <p className="text-sm text-surface-muted">
        Log your cycle data daily for the most accurate insights. The more data points, the better your personalized pattern analysis.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { emoji: '📅', label: 'Period flow', tip: 'Log daily flow level' },
          { emoji: '🌡️', label: 'Basal temp', tip: 'Take first thing in morning' },
          { emoji: '💧', label: 'Cervical mucus', tip: 'Helps predict fertile window' },
          { emoji: '😊', label: 'Mood & symptoms', tip: 'Track patterns over time' },
        ].map(item => (
          <div key={item.label} className="flex items-start gap-2 p-3 rounded-xl bg-surface-sunk dark:bg-white/5">
            <span className="text-lg">{item.emoji}</span>
            <div>
              <p className="text-xs font-semibold text-surface-ink dark:text-white">{item.label}</p>
              <p className="text-[11px] text-surface-muted">{item.tip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PregnancyHub() {
  const [editingPhase, setEditingPhase] = useState(false);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['pregnancy-profile'],
    queryFn: () => apiRequest<{ profile: PregnancyProfile | null }>('/api/pregnancy/profile'),
  });

  const { data: weekData } = useQuery({
    queryKey: ['pregnancy-week-info'],
    queryFn: () => apiRequest<WeekInfo>('/api/pregnancy/week-info'),
    enabled: profileData?.profile?.phase === 'pregnant',
  });

  const { data: logsData } = useQuery({
    queryKey: ['baby-logs'],
    queryFn: () => apiRequest<{ logs: BabyLog[] }>('/api/pregnancy/baby-logs'),
    enabled: !!profileData?.profile,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-surface-sunk rounded-lg animate-pulse" />
        <div className="h-48 bg-surface-sunk rounded-xl2 animate-pulse" />
      </div>
    );
  }

  const profile = profileData?.profile;
  const logs    = logsData?.logs ?? [];

  if (!profile || editingPhase) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-2">
          <Heart size={22} className="text-brand-coral" />
          <h1 className="font-display text-2xl font-bold text-surface-ink dark:text-white">Pregnancy & Motherhood</h1>
        </div>
        <ProfileSetup onSaved={() => setEditingPhase(false)} />
      </div>
    );
  }

  const meta = PHASE_META[profile.phase];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart size={22} className="text-brand-coral" />
          <div>
            <h1 className="font-display text-2xl font-bold text-surface-ink dark:text-white">Pregnancy & Motherhood</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm">{meta.emoji}</span>
              <span className="text-sm font-medium text-surface-muted">{meta.label}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditingPhase(true)}
          className="btn-outline text-xs"
        >
          Change phase
        </button>
      </div>

      {/* Phase-specific content */}
      {profile.phase === 'pregnant' && weekData?.week && (
        <WeekCard info={weekData} />
      )}

      {profile.phase === 'trying' && <TTCPhase />}

      {profile.phase === 'postpartum' && <PostpartumPhase />}

      {/* Quick log (pregnant & postpartum) */}
      {profile.phase !== 'trying' && <QuickLog />}

      {/* AI Advisor */}
      <AIAdvisor phase={profile.phase} week={profile.current_week} />

      {/* Recent logs */}
      <RecentLogs logs={logs} />

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-surface-muted/70 bg-surface-sunk dark:bg-white/5 rounded-xl p-3 border border-surface-ink/[0.04] dark:border-white/[0.04]">
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          Propel Stack AI is not a medical provider. Content in this hub is for informational and organizational purposes only.
          Always consult your OB/GYN, midwife, or qualified healthcare professional for medical guidance.
          If you have a medical emergency, call 911 or your local emergency number.
        </p>
      </div>
    </div>
  );
}
