import { useEffect, useState } from 'react';
import { useWeather } from '../api';
import { weatherLabel } from '../types';

export function WeatherWidget() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => setDenied(true),
      { timeout: 8000, maximumAge: 600000 },
    );
  }, []);

  const { data, isLoading } = useWeather(coords?.lat ?? null, coords?.lon ?? null);
  const w = data?.available ? weatherLabel(data.weatherCode) : null;

  return (
    <div className="card">
      <h2 className="font-display font-bold text-base text-surface-ink mb-2">Weather</h2>
      {denied ? (
        <p className="text-sm text-surface-muted">Enable location access to see local weather.</p>
      ) : !coords || isLoading ? (
        <p className="text-sm text-surface-muted">Locating…</p>
      ) : data?.available && w ? (
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>{w.icon}</span>
          <div>
            <div className="font-display font-bold text-2xl text-surface-ink">
              {data.temperature != null ? `${Math.round(data.temperature)}°F` : '—'}
            </div>
            <div className="text-sm text-surface-muted">{w.label}</div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-surface-muted">Weather unavailable right now.</p>
      )}
    </div>
  );
}
