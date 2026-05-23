import { useState } from 'react';
import { RACE_DISTANCES } from '../types';

type Sport = 'running' | 'cycling' | 'swimming';

function fmtTime(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds <= 0) return '—';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function fmtPace(secPerKm: number, sport: Sport): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '—';
  if (sport === 'cycling') {
    const kmh = 3600 / secPerKm;
    return `${kmh.toFixed(1)} km/h`;
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  const unit = sport === 'swimming' ? '/100m' : '/km';
  const secPer = sport === 'swimming' ? secPerKm / 10 : secPerKm;
  const m2 = Math.floor(secPer / 60);
  const s2 = Math.round(secPer % 60);
  return sport === 'swimming'
    ? `${m2}:${s2.toString().padStart(2, '0')}${unit}`
    : `${m}:${s.toString().padStart(2, '0')}${unit}`;
}

export function PacingCalculator(): JSX.Element {
  const [sport, setSport] = useState<Sport>('running');
  const [distanceKey, setDistanceKey] = useState<string>('5K');
  const [customMeters, setCustomMeters] = useState('');
  const [timeH, setTimeH] = useState('');
  const [timeM, setTimeM] = useState('');
  const [timeS, setTimeS] = useState('');
  const [mode, setMode] = useState<'time-to-pace' | 'pace-to-time'>('time-to-pace');
  const [paceM, setPaceM] = useState('');
  const [paceS, setPaceS] = useState('');
  const [speedKmh, setSpeedKmh] = useState('');

  const distances = RACE_DISTANCES[sport] ?? RACE_DISTANCES.running;
  const selectedDist = distances.find((d) => d.label === distanceKey);
  const meters = distanceKey === 'Custom' ? (customMeters ? Number(customMeters) : 0) : (selectedDist?.meters ?? 0);

  // Time-to-pace calculation
  const totalSeconds = (Number(timeH || 0) * 3600) + (Number(timeM || 0) * 60) + Number(timeS || 0);
  const secPerMeter = meters > 0 && totalSeconds > 0 ? totalSeconds / meters : 0;
  const secPerKm = secPerMeter * 1000;

  // Pace-to-time calculation
  let estTotalSec = 0;
  if (mode === 'pace-to-time') {
    if (sport === 'cycling' && speedKmh) {
      const kmh = Number(speedKmh);
      estTotalSec = kmh > 0 ? (meters / 1000) / kmh * 3600 : 0;
    } else if (sport === 'swimming') {
      const per100m = (Number(paceM || 0) * 60) + Number(paceS || 0);
      estTotalSec = per100m > 0 ? (meters / 100) * per100m : 0;
    } else {
      const perKm = (Number(paceM || 0) * 60) + Number(paceS || 0);
      estTotalSec = perKm > 0 ? (meters / 1000) * perKm : 0;
    }
  }

  // Split targets (every km for running, every 5km for cycling, every 100m for swimming)
  function splitInterval(): number {
    if (sport === 'cycling') return 5000;
    if (sport === 'swimming') return 100;
    return 1000;
  }
  function splitLabel(): string {
    if (sport === 'cycling') return '5 km';
    if (sport === 'swimming') return '100 m';
    return '1 km';
  }
  const splitSec = mode === 'time-to-pace' ? secPerMeter * splitInterval() : estTotalSec / (meters / splitInterval());
  const numSplits = meters > 0 ? Math.floor(meters / splitInterval()) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-xs text-teal-800">
        <strong>Pacing Calculator:</strong> Estimates only. Actual performance depends on terrain, conditions, and fitness.
        Always train with a coach for race-specific pacing strategy.
      </div>

      {/* Sport selector */}
      <div className="flex gap-2">
        {(['running', 'cycling', 'swimming'] as Sport[]).map((s) => (
          <button key={s} onClick={() => { setSport(s); setDistanceKey(RACE_DISTANCES[s][0].label); }}
            className={`flex-1 capitalize rounded-xl border py-2 text-xs font-semibold transition-all ${sport === s ? 'bg-brand-teal text-white border-brand-teal' : 'bg-surface-sunk border-surface-ink/10 text-surface-muted'}`}
          >
            {s === 'running' ? '🏃 Running' : s === 'cycling' ? '🚴 Cycling' : '🏊 Swimming'}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-surface-ink/10 overflow-hidden">
        <button onClick={() => setMode('time-to-pace')}
          className={`flex-1 py-2 text-xs font-semibold transition-all ${mode === 'time-to-pace' ? 'bg-brand-teal text-white' : 'bg-surface-sunk text-surface-muted'}`}
        >
          Time → Pace
        </button>
        <button onClick={() => setMode('pace-to-time')}
          className={`flex-1 py-2 text-xs font-semibold transition-all ${mode === 'pace-to-time' ? 'bg-brand-teal text-white' : 'bg-surface-sunk text-surface-muted'}`}
        >
          Pace → Time
        </button>
      </div>

      {/* Distance */}
      <div>
        <label className="label">Distance</label>
        <div className="flex flex-wrap gap-1.5">
          {distances.map((d) => (
            <button key={d.label} onClick={() => setDistanceKey(d.label)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${distanceKey === d.label ? 'bg-brand-teal text-white border-brand-teal' : 'bg-surface-sunk border-surface-ink/10 text-surface-muted'}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {distanceKey === 'Custom' && (
          <input className="input mt-2" type="number" min={1} placeholder="Custom distance in meters" value={customMeters} onChange={(e) => setCustomMeters(e.target.value)} />
        )}
      </div>

      {mode === 'time-to-pace' ? (
        <div>
          <label className="label">Finish time</label>
          <div className="flex gap-2 items-center">
            <input className="input text-center w-16" type="number" min={0} max={23} placeholder="h" value={timeH} onChange={(e) => setTimeH(e.target.value)} />
            <span className="text-surface-muted font-bold">:</span>
            <input className="input text-center w-16" type="number" min={0} max={59} placeholder="mm" value={timeM} onChange={(e) => setTimeM(e.target.value)} />
            <span className="text-surface-muted font-bold">:</span>
            <input className="input text-center w-16" type="number" min={0} max={59} placeholder="ss" value={timeS} onChange={(e) => setTimeS(e.target.value)} />
          </div>
        </div>
      ) : (
        <div>
          <label className="label">{sport === 'cycling' ? 'Average speed (km/h)' : sport === 'swimming' ? 'Pace per 100m (mm:ss)' : 'Target pace per km (mm:ss)'}</label>
          {sport === 'cycling' ? (
            <input className="input" type="number" min={1} max={100} placeholder="e.g. 30" value={speedKmh} onChange={(e) => setSpeedKmh(e.target.value)} />
          ) : (
            <div className="flex gap-2 items-center">
              <input className="input text-center w-20" type="number" min={0} max={59} placeholder="mm" value={paceM} onChange={(e) => setPaceM(e.target.value)} />
              <span className="text-surface-muted font-bold">:</span>
              <input className="input text-center w-20" type="number" min={0} max={59} placeholder="ss" value={paceS} onChange={(e) => setPaceS(e.target.value)} />
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {meters > 0 && (
        <div className="rounded-2xl border border-surface-ink/10 bg-surface-raised p-4 space-y-3">
          <h4 className="font-semibold text-sm text-surface-ink">Results</h4>
          <div className="grid grid-cols-2 gap-3">
            {mode === 'time-to-pace' ? (
              <>
                <ResultCard label="Your pace" value={secPerKm > 0 ? fmtPace(secPerKm, sport) : '—'} color="teal" />
                <ResultCard label="Total time" value={totalSeconds > 0 ? fmtTime(totalSeconds) : '—'} color="indigo" />
              </>
            ) : (
              <>
                <ResultCard label="Estimated time" value={estTotalSec > 0 ? fmtTime(estTotalSec) : '—'} color="teal" />
                <ResultCard label="Avg speed" value={sport === 'cycling' && speedKmh ? `${speedKmh} km/h` : sport === 'swimming' ? `${fmtPace(estTotalSec / (meters / 100) * 1000, 'swimming')}` : estTotalSec > 0 ? fmtPace(estTotalSec / (meters / 1000), sport) : '—'} color="indigo" />
              </>
            )}
          </div>

          {/* Splits */}
          {numSplits > 0 && numSplits <= 50 && splitSec > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-surface-muted uppercase tracking-wider mb-2">Even splits ({splitLabel()})</h4>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {Array.from({ length: numSplits }, (_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-surface-sunk/40 px-3 py-1.5">
                    <span className="text-xs text-surface-muted">{sport === 'swimming' ? `${(i + 1) * 100}m` : sport === 'cycling' ? `${(i + 1) * 5} km` : `${i + 1} km`}</span>
                    <span className="text-xs font-semibold text-surface-ink">{fmtTime((i + 1) * splitSec)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, value, color }: { label: string; value: string; color: string }): JSX.Element {
  const colors: Record<string, string> = {
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };
  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${colors[color] ?? colors.teal}`}>
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] font-semibold mt-0.5">{label}</div>
    </div>
  );
}
