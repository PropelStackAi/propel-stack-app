import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useHealthMetrics, useAddMetric, useDeleteMetric } from '../api';
import type { MetricType } from '../types';
import { METRIC_CONFIG } from '../types';

const ALL_TYPES: MetricType[] = ['weight', 'bp', 'hr', 'glucose', 'spo2'];

export function VitalsLog(): JSX.Element {
  const [activeType, setActiveType] = useState<MetricType>('weight');
  const [showForm, setShowForm] = useState(false);
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [notes, setNotes] = useState('');

  const { data: metrics = [] } = useHealthMetrics(activeType);
  const addMetric = useAddMetric();
  const deleteMetric = useDeleteMetric();

  const cfg = METRIC_CONFIG[activeType];

  const chartData = metrics
    .slice(-30)
    .map((m) => ({
      date: new Date(m.measured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: m.value,
      value2: m.value2,
    }));

  const latest = metrics[metrics.length - 1];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    addMetric.mutate({
      metricType: activeType,
      value: Number(value),
      value2: value2 ? Number(value2) : undefined,
      unit: cfg.unit,
      notes,
    }, {
      onSuccess: () => { setValue(''); setValue2(''); setNotes(''); setShowForm(false); },
    });
  }

  return (
    <div className="space-y-5">
      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => {
          const c = METRIC_CONFIG[type];
          return (
            <button
              key={type}
              onClick={() => { setActiveType(type); setShowForm(false); }}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all',
                activeType === type
                  ? 'border-transparent text-white'
                  : 'border-surface-ink/10 text-surface-muted hover:border-surface-ink/20',
              ].join(' ')}
              style={activeType === type ? { backgroundColor: c.color } : {}}
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>

      {/* Latest reading */}
      {latest && (
        <div className="rounded-2xl border border-surface-ink/10 bg-surface-raised p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-surface-muted uppercase tracking-wider font-semibold">Latest {cfg.label}</div>
            <div className="font-display font-extrabold text-3xl mt-1" style={{ color: cfg.color }}>
              {activeType === 'bp' && latest.value2
                ? `${latest.value}/${latest.value2}`
                : latest.value}
              <span className="text-base font-normal text-surface-muted ml-1">{cfg.unit}</span>
            </div>
            {cfg.normal && <div className="text-xs text-surface-muted mt-0.5">Normal: {cfg.normal}</div>}
          </div>
          <div className="text-xs text-surface-muted">
            {new Date(latest.measured_at).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* 30-day chart */}
      {chartData.length > 1 && (
        <div className="rounded-2xl border border-surface-ink/10 bg-surface-raised p-4">
          <h4 className="text-sm font-semibold text-surface-ink mb-3">30-day trend</h4>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={2} dot={false} />
              {activeType === 'bp' && (
                <Line type="monotone" dataKey="value2" stroke="#F05A28" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add reading */}
      <div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="btn bg-brand-coral text-white hover:bg-brand-coral/90 text-sm"
          >
            + Log {cfg.label}
          </button>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-surface-ink/10 bg-surface-sunk/30 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-surface-ink">Log {cfg.label}</h4>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">{activeType === 'bp' ? 'Systolic (mmHg)' : `Value (${cfg.unit})`}</label>
                <input className="input" type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} required />
              </div>
              {activeType === 'bp' && (
                <div className="flex-1">
                  <label className="label">Diastolic (mmHg)</label>
                  <input className="input" type="number" step="1" value={value2} onChange={(e) => setValue2(e.target.value)} required />
                </div>
              )}
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. After morning walk" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm flex-1">Cancel</button>
              <button type="submit" disabled={addMetric.isPending} className="btn bg-brand-coral text-white text-sm flex-1 disabled:opacity-50">
                {addMetric.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Recent log */}
      {metrics.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-surface-ink mb-2">Recent readings</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {[...metrics].reverse().slice(0, 10).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b border-surface-ink/[0.06] last:border-0">
                <span className="font-semibold text-surface-ink">
                  {activeType === 'bp' && m.value2 ? `${m.value}/${m.value2}` : m.value} {cfg.unit}
                </span>
                <span className="text-surface-muted text-xs">{new Date(m.measured_at).toLocaleDateString()}</span>
                <button
                  onClick={() => deleteMetric.mutate(m.id)}
                  className="text-surface-muted hover:text-red-500 text-xs ml-3"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
