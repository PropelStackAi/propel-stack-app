/**
 * Predictive Life Insights Engine — Enhancement 34
 * Propel Stack AI, LLC
 *
 * Cross-hub pattern detection, Life Score forecasting, risk flags.
 * Requires 30+ days of data before predictions fire.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Prediction {
  id: string;
  prediction_type: string;
  prediction_text: string;
  predicted_for_date: string | null;
  confidence_score: number;
  hubs_used: string[];
  shown_at: string | null;
  acted_on: boolean;
  outcome_score_delta: number | null;
  created_at: string;
}

interface GenerateResult {
  generated: number;
  message?: string;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  score_forecast: { icon: '📈', label: 'Score Forecast', color: 'bg-brand-indigo/10 text-brand-indigo' },
  pattern:        { icon: '🔄', label: 'Pattern',        color: 'bg-brand-teal/10 text-brand-teal' },
  risk_flag:      { icon: '⚠️', label: 'Risk Flag',      color: 'bg-red-100 text-red-700' },
  seasonal:       { icon: '🌊', label: 'Seasonal',       color: 'bg-brand-purple/10 text-brand-purple' },
  goal_predictor: { icon: '🎯', label: 'Goal Predictor', color: 'bg-amber-100 text-amber-800' },
};

export function PredictiveInsights() {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');

  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => apiRequest<Prediction[]>('/api/predictions'),
  });

  const actedMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/predictions/${id}/acted-on`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['predictions'] }),
  });

  async function generatePredictions() {
    setGenerating(true);
    setGenMessage('');
    try {
      const result = await apiRequest<GenerateResult>('/api/predictions/generate', { method: 'POST' });
      setGenMessage(result.message ?? `Generated ${result.generated} new predictions.`);
      qc.invalidateQueries({ queryKey: ['predictions'] });
    } finally { setGenerating(false); }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Predictive Insights</h1>
          <p className="text-sm text-surface-muted mt-1">AI detects patterns across your hubs and forecasts what's coming.</p>
        </div>
        <button className="btn-primary" onClick={generatePredictions} disabled={generating}>
          {generating ? 'Analyzing…' : '✨ Generate Insights'}
        </button>
      </div>

      {genMessage && (
        <div className="rounded-xl bg-brand-teal/5 border border-brand-teal/20 px-4 py-3 text-sm text-brand-teal">
          {genMessage}
        </div>
      )}

      {/* Data sufficiency info */}
      <div className="rounded-xl bg-brand-indigo/5 border border-brand-indigo/20 p-4 text-sm">
        <div className="flex items-center gap-2 mb-1">
          <span>🧠</span>
          <span className="font-semibold text-brand-indigo">How Predictions Work</span>
        </div>
        <p className="text-surface-muted text-xs">
          Predictions unlock after 30 days of data. Full accuracy at 90+ days.
          All pattern detection runs on aggregated statistics — no raw personal data is sent to AI.
          Predictions run automatically every Sunday night.
        </p>
      </div>

      {/* Prediction cards */}
      {isLoading ? (
        <div className="py-12 text-center text-surface-muted animate-pulse">Loading predictions…</div>
      ) : predictions.length === 0 ? (
        <div className="py-16 text-center card">
          <div className="text-5xl mb-3">🔮</div>
          <p className="text-surface-muted">No predictions yet.</p>
          <p className="text-xs text-surface-muted mt-1">Keep logging daily for 30+ days and click Generate above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {predictions.map((pred) => {
            const config = TYPE_CONFIG[pred.prediction_type] ?? TYPE_CONFIG.pattern;
            return (
              <div key={pred.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xl">{config.icon}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-surface-muted">
                        {Math.round(pred.confidence_score * 100)}% confidence
                      </span>
                      {pred.acted_on && <span className="text-xs text-brand-teal font-semibold">✓ Acted on</span>}
                    </div>
                    <p className="text-sm text-surface-ink">{pred.prediction_text}</p>
                    {pred.hubs_used && pred.hubs_used.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {pred.hubs_used.map((h) => (
                          <span key={h} className="chip text-xs capitalize">{h}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-surface-muted mt-2">{new Date(pred.created_at).toLocaleDateString()}</p>
                  </div>
                  {!pred.acted_on && (
                    <button
                      className="btn-ghost text-xs shrink-0"
                      onClick={() => actedMutation.mutate(pred.id)}
                    >
                      Mark acted on
                    </button>
                  )}
                </div>
                {/* Confidence bar */}
                <div className="mt-3 h-1 bg-surface-sunk rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-indigo/40 rounded-full"
                    style={{ width: `${pred.confidence_score * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
