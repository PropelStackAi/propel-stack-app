/**
 * Enhancement 44 — Life OS Widget Layer
 * Propel Stack AI, LLC
 *
 * Widget settings page + live previews of widget data.
 * Native iOS/Android widget installation requires the mobile app (Capacitor).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface WidgetPreferences {
  enabled_widgets: string[];
  widget_refresh_hour: number;
}

interface LifeScoreData { score: number; direction: string; status_label: string; trend_7day: number[] }
interface MorningBriefingData { top_3_priorities: string[]; life_score: number; companion_message: string }
interface StreaksData { active_streaks_count: number; longest_streak_days: number; at_risk: boolean }
interface GoalsData { goals: Array<{ title: string; progress_pct: number }> }
interface CreditsData { used: number; total: number; pct_remaining: number; status: string }

const ALL_WIDGETS = [
  { id: 'life_score', name: 'Life Score', size: 'small', icon: '⭕', plan: 'All Plans' },
  { id: 'morning_briefing', name: 'Morning Briefing', size: 'medium', icon: '☀️', plan: 'Solo+' },
  { id: 'streaks', name: 'Streak Counter', size: 'small', icon: '🔥', plan: 'Solo+' },
  { id: 'goals', name: 'Goals Progress', size: 'medium', icon: '🎯', plan: 'Solo+' },
  { id: 'credits', name: 'AI Credits', size: 'small', icon: '🪙', plan: 'Solo+' },
  { id: 'companion', name: 'Companion Check-in', size: 'medium', icon: '🤖', plan: 'Family+' },
];

export function WidgetSettings() {
  const qc = useQueryClient();
  const [previewWidget, setPreviewWidget] = useState<string | null>(null);

  const { data: prefs } = useQuery<WidgetPreferences>({
    queryKey: ['widget-prefs'],
    queryFn: () => apiRequest<WidgetPreferences>('/api/widgets/preferences'),
  });

  const { data: lsData } = useQuery<LifeScoreData>({
    queryKey: ['widget-life-score'],
    queryFn: () => apiRequest<LifeScoreData>('/api/widgets/life-score'),
    enabled: previewWidget === 'life_score',
  });

  const { data: briefingData } = useQuery<MorningBriefingData>({
    queryKey: ['widget-morning-briefing'],
    queryFn: () => apiRequest<MorningBriefingData>('/api/widgets/morning-briefing'),
    enabled: previewWidget === 'morning_briefing',
  });

  const { data: streaksData } = useQuery<StreaksData>({
    queryKey: ['widget-streaks'],
    queryFn: () => apiRequest<StreaksData>('/api/widgets/streaks'),
    enabled: previewWidget === 'streaks',
  });

  const { data: goalsData } = useQuery<GoalsData>({
    queryKey: ['widget-goals'],
    queryFn: () => apiRequest<GoalsData>('/api/widgets/goals'),
    enabled: previewWidget === 'goals',
  });

  const { data: creditsData } = useQuery<CreditsData>({
    queryKey: ['widget-credits'],
    queryFn: () => apiRequest<CreditsData>('/api/widgets/credits'),
    enabled: previewWidget === 'credits',
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<WidgetPreferences>) => apiRequest('/api/widgets/preferences', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['widget-prefs'] }),
  });

  const enabled = prefs?.enabled_widgets ?? ['life_score', 'morning_briefing', 'streaks'];

  function toggleWidget(id: string) {
    const next = enabled.includes(id) ? enabled.filter(w => w !== id) : [...enabled, id];
    updateMutation.mutate({ enabled_widgets: next });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-surface-ink">Life OS Widget Layer</h1>
        <p className="text-surface-muted text-sm mt-1">Configure your home screen and lock screen widgets. Install via the mobile app.</p>
      </div>

      {/* Install Banner */}
      <div className="card border-brand-teal/30 bg-brand-teal/5">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📱</div>
          <div>
            <div className="font-semibold text-surface-ink">Install Widgets on Your Phone</div>
            <div className="text-sm text-surface-muted mt-1">Download the Propel Stack AI app, then long-press your home screen → Widgets → Propel Stack AI to add any widget below.</div>
            <div className="flex gap-2 mt-3">
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="chip bg-surface-ink text-white text-xs">📲 iOS App Store</a>
              <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="chip bg-surface-ink text-white text-xs">📲 Google Play</a>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Grid */}
      <div>
        <h2 className="font-semibold text-surface-ink mb-3">Available Widgets</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_WIDGETS.map(w => {
            const isEnabled = enabled.includes(w.id);
            return (
              <div key={w.id} className={`card transition-all ${isEnabled ? 'ring-2 ring-brand-indigo' : 'opacity-80'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-3xl">{w.icon}</div>
                  <div className="flex items-center gap-2">
                    <span className="chip text-xs">{w.size}</span>
                    <button
                      onClick={() => toggleWidget(w.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-brand-indigo' : 'bg-surface-ink/20'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${isEnabled ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
                <div className="font-medium text-surface-ink">{w.name}</div>
                <div className="text-xs text-surface-muted mt-0.5">{w.plan}</div>
                <button
                  onClick={() => setPreviewWidget(previewWidget === w.id ? null : w.id)}
                  className="text-xs text-brand-indigo hover:underline mt-2"
                >
                  {previewWidget === w.id ? 'Hide preview' : 'Preview data →'}
                </button>

                {/* Live data previews */}
                {previewWidget === w.id && (
                  <div className="mt-3 rounded-lg bg-surface-sunk p-3 text-xs font-mono">
                    {w.id === 'life_score' && lsData && (
                      <div>Score: <strong>{lsData.score}</strong> · {lsData.direction} · {lsData.status_label}</div>
                    )}
                    {w.id === 'morning_briefing' && briefingData && (
                      <div>
                        <div className="mb-1">Score: {briefingData.life_score}</div>
                        {briefingData.top_3_priorities.map((p, i) => <div key={i}>• {p}</div>)}
                        <div className="mt-1 italic">{briefingData.companion_message}</div>
                      </div>
                    )}
                    {w.id === 'streaks' && streaksData && (
                      <div>Active: {streaksData.active_streaks_count} · Best: {streaksData.longest_streak_days}d {streaksData.at_risk ? '⚠ at risk' : '✓'}</div>
                    )}
                    {w.id === 'goals' && goalsData && (
                      <div>{goalsData.goals.map((g, i) => <div key={i}>{g.title}: {g.progress_pct}%</div>)}</div>
                    )}
                    {w.id === 'credits' && creditsData && (
                      <div>Used: {creditsData.used.toLocaleString()} / {creditsData.total.toLocaleString()} ({creditsData.pct_remaining}% left)</div>
                    )}
                    {!lsData && !briefingData && !streaksData && !goalsData && !creditsData && (
                      <div className="text-surface-muted">Loading…</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Refresh Settings */}
      <div className="card">
        <h2 className="font-semibold text-surface-ink mb-3">Refresh Schedule</h2>
        <div>
          <label className="label">Morning briefing refresh hour</label>
          <select
            className="input w-48"
            value={prefs?.widget_refresh_hour ?? 6}
            onChange={e => updateMutation.mutate({ widget_refresh_hour: Number(e.target.value) })}
          >
            {[5, 6, 7, 8, 9].map(h => (
              <option key={h} value={h}>{h}:00 AM</option>
            ))}
          </select>
          <p className="text-xs text-surface-muted mt-1">Widgets update every hour. Morning briefing is forced at the selected hour.</p>
        </div>
      </div>

      {/* Performance note */}
      <div className="rounded-lg bg-surface-sunk px-4 py-3 text-xs text-surface-muted">
        ⚡ All widget API endpoints respond in &lt;200ms. Widget data is pre-computed and served from cache — no heavy database queries at widget refresh time.
      </div>
    </div>
  );
}
