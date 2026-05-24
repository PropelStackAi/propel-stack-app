/**
 * Enhancement 39 — AI Sleep Coach
 * Propel Stack AI, LLC
 *
 * Morning Readiness Score = sleep_score*0.5 + max(0, 100-resting_hr)*0.3 + min(hrv_avg*0.5, 20)
 * Coach report requires 7+ days of sleep data.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface SleepLog {
  id: string;
  date: string;
  total_minutes?: number;
  deep_minutes?: number;
  rem_minutes?: number;
  sleep_score?: number;
  hrv_avg?: number;
  resting_hr?: number;
  source: string;
}

interface CoachReport {
  report: string | null;
  readiness_score: number;
  data_days: number;
  message?: string;
}

interface Correlations {
  correlations: string[];
  paired_days: number;
  message?: string;
}

function minsToHM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function SleepCoach() {
  const qc = useQueryClient();
  const [view, setView] = useState<'logs' | 'log' | 'env' | 'report' | 'correlations'>('logs');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalMin, setTotalMin] = useState('');
  const [deepMin, setDeepMin] = useState('');
  const [remMin, setRemMin] = useState('');
  const [hrv, setHrv] = useState('');
  const [rhr, setRhr] = useState('');
  const [score, setScore] = useState('');
  const [envDate, setEnvDate] = useState(new Date().toISOString().split('T')[0]);
  const [roomTemp, setRoomTemp] = useState('');
  const [alcohol, setAlcohol] = useState('');
  const [caffeine, setCaffeine] = useState('');
  const [screenTime, setScreenTime] = useState('');
  const [stress, setStress] = useState('');
  const [envNotes, setEnvNotes] = useState('');

  const { data: logs = [] } = useQuery<SleepLog[]>({
    queryKey: ['sleep-logs'],
    queryFn: () => apiRequest<SleepLog[]>('/api/sleep/logs'),
  });

  const { data: reportData } = useQuery<CoachReport>({
    queryKey: ['sleep-report'],
    queryFn: () => apiRequest<CoachReport>('/api/sleep/coach-report'),
    enabled: view === 'report',
  });

  const { data: corrData } = useQuery<Correlations>({
    queryKey: ['sleep-correlations'],
    queryFn: () => apiRequest<Correlations>('/api/sleep/correlations'),
    enabled: view === 'correlations',
  });

  const logMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('/api/sleep/log', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sleep-logs'] });
      setTotalMin(''); setDeepMin(''); setRemMin(''); setHrv(''); setRhr(''); setScore('');
      setView('logs');
    },
  });

  const envMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('/api/sleep/environment', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      setRoomTemp(''); setAlcohol(''); setCaffeine(''); setScreenTime(''); setStress(''); setEnvNotes('');
      setView('logs');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">AI Sleep Coach</h1>
          <p className="text-surface-muted text-sm mt-1">Track sleep, log environments, and unlock AI coaching with 7+ nights of data.</p>
        </div>
        {reportData?.readiness_score && (
          <div className="text-center">
            <div className={`text-3xl font-bold ${scoreColor(reportData.readiness_score)}`}>{reportData.readiness_score}</div>
            <div className="text-xs text-surface-muted">Readiness</div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-surface-sunk rounded-lg p-1 w-fit">
        {(['logs', 'log', 'env', 'report', 'correlations'] as const).map(t => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === t ? 'bg-white shadow-sm text-surface-ink' : 'text-surface-muted hover:text-surface-ink'}`}
          >
            {t === 'logs' ? '📊 History' : t === 'log' ? '+ Log Sleep' : t === 'env' ? '🌙 Environment' : t === 'report' ? '🤖 Coach Report' : '🔗 Correlations'}
          </button>
        ))}
      </div>

      {/* Sleep History */}
      {view === 'logs' && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="card text-center py-12 text-surface-muted">
              <div className="text-5xl mb-3">😴</div>
              <p>No sleep logs yet. Tap "+ Log Sleep" to start tracking.</p>
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="card flex items-center gap-4">
                <div className="text-2xl">🌙</div>
                <div className="flex-1">
                  <div className="font-medium text-surface-ink">{log.date}</div>
                  <div className="text-xs text-surface-muted">
                    {log.total_minutes ? minsToHM(log.total_minutes) : 'No duration'}
                    {log.deep_minutes ? ` · Deep: ${minsToHM(log.deep_minutes)}` : ''}
                    {log.rem_minutes ? ` · REM: ${minsToHM(log.rem_minutes)}` : ''}
                    {log.hrv_avg ? ` · HRV: ${log.hrv_avg}` : ''}
                    {log.resting_hr ? ` · RHR: ${log.resting_hr}` : ''}
                    {` · Source: ${log.source}`}
                  </div>
                </div>
                {log.sleep_score && (
                  <div className={`text-xl font-bold ${scoreColor(log.sleep_score)}`}>{log.sleep_score}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Log Sleep */}
      {view === 'log' && (
        <div className="card">
          <h2 className="font-semibold text-surface-ink mb-4">Log Sleep Night</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Date *</label><input className="input" type="date" value={logDate} onChange={e => setLogDate(e.target.value)} /></div>
            <div><label className="label">Sleep Score (0–100)</label><input className="input" type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} placeholder="85" /></div>
            <div><label className="label">Total Sleep (minutes)</label><input className="input" type="number" value={totalMin} onChange={e => setTotalMin(e.target.value)} placeholder="420" /></div>
            <div><label className="label">Deep Sleep (minutes)</label><input className="input" type="number" value={deepMin} onChange={e => setDeepMin(e.target.value)} placeholder="90" /></div>
            <div><label className="label">REM Sleep (minutes)</label><input className="input" type="number" value={remMin} onChange={e => setRemMin(e.target.value)} placeholder="100" /></div>
            <div><label className="label">HRV Average (ms)</label><input className="input" type="number" step="0.1" value={hrv} onChange={e => setHrv(e.target.value)} placeholder="55" /></div>
            <div><label className="label">Resting Heart Rate (bpm)</label><input className="input" type="number" value={rhr} onChange={e => setRhr(e.target.value)} placeholder="58" /></div>
          </div>
          <button
            onClick={() => logMutation.mutate({
              date: logDate,
              total_minutes: totalMin ? Number(totalMin) : undefined,
              deep_minutes: deepMin ? Number(deepMin) : undefined,
              rem_minutes: remMin ? Number(remMin) : undefined,
              hrv_avg: hrv ? Number(hrv) : undefined,
              resting_hr: rhr ? Number(rhr) : undefined,
              sleep_score: score ? Number(score) : undefined,
            })}
            disabled={!logDate || logMutation.isPending}
            className="btn-primary mt-4 text-sm"
          >
            {logMutation.isPending ? 'Saving…' : 'Save Sleep Log'}
          </button>
        </div>
      )}

      {/* Environment Log */}
      {view === 'env' && (
        <div className="card">
          <h2 className="font-semibold text-surface-ink mb-4">Log Sleep Environment</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Date *</label><input className="input" type="date" value={envDate} onChange={e => setEnvDate(e.target.value)} /></div>
            <div><label className="label">Room Temp (°F)</label><input className="input" type="number" step="0.5" value={roomTemp} onChange={e => setRoomTemp(e.target.value)} placeholder="68" /></div>
            <div><label className="label">Alcoholic Drinks</label><input className="input" type="number" min="0" value={alcohol} onChange={e => setAlcohol(e.target.value)} placeholder="0" /></div>
            <div><label className="label">Caffeine (mg)</label><input className="input" type="number" value={caffeine} onChange={e => setCaffeine(e.target.value)} placeholder="200" /></div>
            <div><label className="label">Screen Time Before Bed (min)</label><input className="input" type="number" value={screenTime} onChange={e => setScreenTime(e.target.value)} placeholder="30" /></div>
            <div><label className="label">Stress Level (1–10)</label><input className="input" type="number" min="1" max="10" value={stress} onChange={e => setStress(e.target.value)} placeholder="5" /></div>
            <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={envNotes} onChange={e => setEnvNotes(e.target.value)} placeholder="Anything that might have affected sleep…" /></div>
          </div>
          <button
            onClick={() => envMutation.mutate({
              date: envDate,
              room_temp_f: roomTemp ? Number(roomTemp) : undefined,
              alcohol_drinks: alcohol ? Number(alcohol) : undefined,
              caffeine_mg: caffeine ? Number(caffeine) : undefined,
              screen_time_min: screenTime ? Number(screenTime) : undefined,
              stress_level: stress ? Number(stress) : undefined,
              notes: envNotes || undefined,
            })}
            disabled={!envDate || envMutation.isPending}
            className="btn-primary mt-4 text-sm"
          >
            {envMutation.isPending ? 'Saving…' : 'Save Environment Log'}
          </button>
        </div>
      )}

      {/* Coach Report */}
      {view === 'report' && (
        <div className="space-y-4">
          {!reportData ? (
            <div className="card text-center py-8 text-surface-muted">Loading report…</div>
          ) : reportData.message && !reportData.report ? (
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-4xl">😴</div>
                <div>
                  <div className="font-semibold text-surface-ink">Data Gate</div>
                  <div className="text-sm text-surface-muted">{reportData.message}</div>
                </div>
              </div>
              <div className="w-full bg-surface-sunk rounded-full h-2 mt-2">
                <div
                  className="bg-brand-indigo h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (reportData.data_days / 7) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-surface-muted mt-1">{reportData.data_days}/7 nights logged</div>
            </div>
          ) : (
            <>
              <div className="card flex items-center gap-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${scoreColor(reportData.readiness_score)}`}>{reportData.readiness_score}</div>
                  <div className="text-xs text-surface-muted">Morning Readiness</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-surface-ink">Today's Readiness Score</div>
                  <div className="text-xs text-surface-muted">Based on sleep score, resting HR, and HRV</div>
                  <div className="w-full bg-surface-sunk rounded-full h-2 mt-2">
                    <div className={`h-2 rounded-full ${reportData.readiness_score >= 75 ? 'bg-green-500' : reportData.readiness_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${reportData.readiness_score}%` }} />
                  </div>
                </div>
              </div>

              {reportData.report && (
                <div className="card">
                  <h2 className="font-semibold text-surface-ink mb-3">Weekly AI Sleep Report</h2>
                  <div className="whitespace-pre-wrap text-sm text-surface-ink leading-relaxed">{reportData.report}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Correlations */}
      {view === 'correlations' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-surface-ink mb-3">Sleep–Mood Correlations</h2>
            {!corrData ? (
              <p className="text-sm text-surface-muted">Loading…</p>
            ) : corrData.message && corrData.correlations.length === 0 ? (
              <p className="text-sm text-surface-muted">{corrData.message}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-surface-muted mb-3">Based on {corrData.paired_days} days of paired sleep + mood data</p>
                {corrData.correlations.map((c, i) => (
                  <div key={i} className="rounded-lg bg-brand-teal/5 border border-brand-teal/20 px-4 py-3 text-sm text-surface-ink">
                    🔗 {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
