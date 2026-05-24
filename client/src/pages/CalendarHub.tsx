/**
 * Enhancement 45 — Smart Calendar Intelligence
 * Propel Stack AI, LLC
 *
 * OAuth connect for Google Calendar + Outlook.
 * Schedule analysis, goal-conflict detection, smart block suggestions, NLP scheduling.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_type: string;
  is_all_day: boolean;
}

interface ScheduleAnalysis {
  week_start: string;
  total_meeting_hours: number;
  overload_days: string[];
  goal_conflicts: string[];
  optimization_suggestions: string[];
  goal_alignment_score: number | null;
}

interface CalendarConnection {
  provider: string;
  calendar_id: string;
  last_synced: string | null;
}

const MEETING_COLORS: Record<string, string> = {
  meeting: 'bg-brand-indigo/10 border-brand-indigo/30 text-brand-indigo',
  focus: 'bg-brand-teal/10 border-brand-teal/30 text-brand-teal',
  personal: 'bg-brand-coral/10 border-brand-coral/30 text-brand-coral',
  travel: 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple',
  propelstack_block: 'bg-amber-50 border-amber-300 text-amber-700',
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function CalendarHub() {
  const qc = useQueryClient();
  const [view, setView] = useState<'events' | 'analysis' | 'nlp' | 'connect'>('events');
  const [nlpRequest, setNlpRequest] = useState('');
  const [nlpResult, setNlpResult] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evStart, setEvStart] = useState('');
  const [evEnd, setEvEnd] = useState('');
  const [evType, setEvType] = useState('meeting');

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events'],
    queryFn: () => apiRequest<CalendarEvent[]>('/api/calendar/events'),
  });

  const { data: analysis } = useQuery<ScheduleAnalysis>({
    queryKey: ['calendar-analysis'],
    queryFn: () => apiRequest<ScheduleAnalysis>('/api/calendar/analysis'),
    enabled: view === 'analysis',
  });

  const { data: connections = [] } = useQuery<CalendarConnection[]>({
    queryKey: ['calendar-connections'],
    queryFn: () => apiRequest<CalendarConnection[]>('/api/calendar/connections'),
    enabled: view === 'connect',
  });

  const addEventMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('/api/calendar/events', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
      setShowAddEvent(false);
      setEvTitle(''); setEvStart(''); setEvEnd('');
    },
  });

  const connectMutation = useMutation({
    mutationFn: (provider: string) => apiRequest<{ oauth_required?: boolean; auth_url?: string; connected?: boolean; message?: string }>(`/api/calendar/connect/${provider}`, { method: 'POST' }),
    onSuccess: (data) => {
      if (data.oauth_required && data.auth_url) {
        window.open(data.auth_url, '_blank');
      }
      qc.invalidateQueries({ queryKey: ['calendar-connections'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest('/api/calendar/sync', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  async function handleNlpSchedule() {
    if (!nlpRequest.trim()) return;
    setNlpLoading(true);
    try {
      const r = await apiRequest<{ suggestion: string }>('/api/calendar/nlp-schedule', {
        method: 'POST',
        body: JSON.stringify({ request: nlpRequest }),
      });
      setNlpResult(r.suggestion);
    } finally {
      setNlpLoading(false);
    }
  }

  const scoreColor = (score: number | null) => {
    if (!score) return 'text-surface-muted';
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Smart Calendar Intelligence</h1>
          <p className="text-surface-muted text-sm mt-1">AI-powered schedule analysis, goal-conflict detection, and natural language scheduling.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="btn-secondary text-sm">
            {syncMutation.isPending ? 'Syncing…' : '🔄 Sync'}
          </button>
          <button onClick={() => setShowAddEvent(s => !s)} className="btn-primary text-sm">+ Add Event</button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-sunk rounded-lg p-1 w-fit">
        {([
          { key: 'events', label: '📅 Events' },
          { key: 'analysis', label: '📊 Analysis' },
          { key: 'nlp', label: '💬 Smart Schedule' },
          { key: 'connect', label: '🔗 Connect' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === t.key ? 'bg-white shadow-sm text-surface-ink' : 'text-surface-muted hover:text-surface-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {showAddEvent && (
        <div className="card border-brand-indigo/30">
          <h3 className="font-semibold text-surface-ink mb-3">Add Calendar Event</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className="label">Title *</label><input className="input" value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Deep Work — Product Strategy" /></div>
            <div><label className="label">Start *</label><input className="input" type="datetime-local" value={evStart} onChange={e => setEvStart(e.target.value)} /></div>
            <div><label className="label">End *</label><input className="input" type="datetime-local" value={evEnd} onChange={e => setEvEnd(e.target.value)} /></div>
            <div><label className="label">Type</label>
              <select className="input" value={evType} onChange={e => setEvType(e.target.value)}>
                {['meeting','focus','personal','travel','propelstack_block'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => addEventMutation.mutate({ title: evTitle, start_time: evStart, end_time: evEnd, meeting_type: evType })} disabled={!evTitle || !evStart || !evEnd || addEventMutation.isPending} className="btn-primary text-sm">
              {addEventMutation.isPending ? 'Adding…' : 'Add Event'}
            </button>
            <button onClick={() => setShowAddEvent(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Events */}
      {view === 'events' && (
        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="card text-center py-10 text-surface-muted">
              <div className="text-4xl mb-2">📅</div>
              <p>No events. Connect your Google Calendar or Outlook, or add events manually.</p>
            </div>
          ) : (
            events.map(ev => (
              <div key={ev.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${MEETING_COLORS[ev.meeting_type] ?? 'bg-surface-sunk border-surface-ink/10'}`}>
                <div className="min-w-[60px] text-xs text-right text-surface-muted">
                  <div>{formatDate(ev.start_time)}</div>
                  <div>{formatTime(ev.start_time)}</div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{ev.title}</div>
                  <div className="text-xs opacity-70">{formatTime(ev.start_time)} – {formatTime(ev.end_time)} · {ev.meeting_type.replace(/_/g,' ')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analysis */}
      {view === 'analysis' && (
        <div className="space-y-4">
          {!analysis ? (
            <div className="card text-center py-8 text-surface-muted">Loading analysis…</div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="card text-center">
                  <div className="text-3xl font-bold text-surface-ink">{analysis.total_meeting_hours}</div>
                  <div className="text-xs text-surface-muted">Meeting hours this week</div>
                  {analysis.total_meeting_hours > 30 && <div className="text-xs text-red-500 mt-1">⚠ Overloaded</div>}
                </div>
                <div className="card text-center">
                  <div className={`text-3xl font-bold ${scoreColor(analysis.goal_alignment_score)}`}>
                    {analysis.goal_alignment_score ?? '—'}
                  </div>
                  <div className="text-xs text-surface-muted">Goal alignment score</div>
                </div>
                <div className="card text-center">
                  <div className="text-3xl font-bold text-surface-ink">{analysis.overload_days.length}</div>
                  <div className="text-xs text-surface-muted">Overloaded days</div>
                  {analysis.overload_days.length > 0 && <div className="text-xs text-amber-600 mt-1">{analysis.overload_days.join(', ')}</div>}
                </div>
              </div>

              {analysis.goal_conflicts.length > 0 && (
                <div className="card border-red-200">
                  <h3 className="font-semibold text-red-700 mb-2">⚠ Goal Conflicts Detected</h3>
                  <div className="space-y-1">
                    {analysis.goal_conflicts.map((c, i) => <div key={i} className="text-sm text-red-600">• {c}</div>)}
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="font-semibold text-surface-ink mb-2">💡 Optimization Suggestions</h3>
                <div className="space-y-2">
                  {analysis.optimization_suggestions.map((s, i) => (
                    <div key={i} className="text-sm text-surface-ink bg-brand-indigo/5 border border-brand-indigo/20 rounded-lg px-3 py-2">{s}</div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* NLP Schedule */}
      {view === 'nlp' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-surface-ink">Natural Language Scheduling</h2>
          <p className="text-sm text-surface-muted">Tell the AI what you want to schedule in plain English.</p>
          <textarea
            className="input"
            rows={3}
            placeholder="Schedule a 90-minute deep work block on the best day this week..."
            value={nlpRequest}
            onChange={e => setNlpRequest(e.target.value)}
          />
          <button onClick={handleNlpSchedule} disabled={!nlpRequest.trim() || nlpLoading} className="btn-primary text-sm">
            {nlpLoading ? 'Finding optimal slot…' : '✨ Schedule It'}
          </button>
          {nlpResult && (
            <div className="rounded-lg bg-brand-indigo/5 border border-brand-indigo/20 p-4 text-sm text-surface-ink leading-relaxed whitespace-pre-wrap">
              {nlpResult}
            </div>
          )}
        </div>
      )}

      {/* Connect */}
      {view === 'connect' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-surface-ink">Connect Your Calendar</h2>
          {connections.length > 0 && (
            <div className="space-y-2 mb-4">
              {connections.map(c => (
                <div key={c.provider} className="card flex items-center gap-3">
                  <div className="text-2xl">{c.provider === 'google' ? '📅' : '📆'}</div>
                  <div>
                    <div className="font-medium text-surface-ink capitalize">{c.provider} Calendar</div>
                    <div className="text-xs text-surface-muted">Connected · {c.last_synced ? `Last sync: ${new Date(c.last_synced).toLocaleDateString()}` : 'Not yet synced'}</div>
                  </div>
                  <span className="chip bg-green-100 text-green-700 text-xs ml-auto">Connected</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { provider: 'google', name: 'Google Calendar', icon: '📅', scope: 'calendar.events' },
              { provider: 'outlook', name: 'Microsoft Outlook', icon: '📆', scope: 'Calendars.ReadWrite' },
            ].map(c => (
              <div key={c.provider} className="card">
                <div className="text-3xl mb-2">{c.icon}</div>
                <div className="font-semibold text-surface-ink">{c.name}</div>
                <div className="text-xs text-surface-muted mt-1">Scope: {c.scope}</div>
                <button
                  onClick={() => connectMutation.mutate(c.provider)}
                  disabled={connectMutation.isPending}
                  className="btn-primary text-sm mt-3 w-full"
                >
                  {connectMutation.isPending ? 'Connecting…' : `Connect ${c.name}`}
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            ⚙ <strong>Setup required:</strong> Set <code>GOOGLE_CLIENT_ID</code> and <code>OUTLOOK_CLIENT_ID</code> environment variables in Railway to enable OAuth. Contact your developer for setup instructions.
          </div>
        </div>
      )}
    </div>
  );
}
