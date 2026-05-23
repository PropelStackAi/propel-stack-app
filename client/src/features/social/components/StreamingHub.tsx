// ─── StreamingHub.tsx ─────────────────────────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useMediaConnections,
  useAddMediaConnection,
  useRemoveMediaConnection,
  useLogScreenTime,
  useScreenTimeWeekly,
} from '../api';
import type { StreamingService } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_EMOJIS: Record<string, string> = {
  Netflix: '🎬',
  Hulu: '📺',
  'Disney+': '🏰',
  'Prime Video': '📦',
  Max: '🌊',
  Peacock: '🦚',
  'Paramount+': '⭐',
  'Apple TV+': '🍎',
  'ESPN+': '🏈',
  Spotify: '🎵',
  'Apple Music': '🎶',
  'YouTube Music': '▶️',
  'Spotify Podcasts': '🎙️',
  'Apple Podcasts': '🎧',
  'Pocket Casts': '📻',
};

const SECTION_ORDER: StreamingService['service_type'][] = ['streaming', 'music', 'podcast'];
const SECTION_LABELS: Record<StreamingService['service_type'], string> = {
  streaming: 'Streaming',
  music: 'Music',
  podcast: 'Podcasts',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatHHMM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function deltaPercent(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? '+100%' : '0%';
  const pct = Math.round(((current - prev) / prev) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

function buildCSV(data: { platform: string; total_seconds: number; session_count: number }[]): string {
  const header = 'Platform,Sessions,Total Minutes,Avg Session (min)';
  const rows = data.map((d) => {
    const totalMin = Math.round(d.total_seconds / 60);
    const avgMin = d.session_count > 0 ? Math.round(totalMin / d.session_count) : 0;
    return `${d.platform},${d.session_count},${totalMin},${avgMin}`;
  });
  return [header, ...rows].join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Service Tile ─────────────────────────────────────────────────────────────

interface ServiceTileProps {
  service: StreamingService;
  isConnected: boolean;
  connectionId: string | null;
  onAdd: (service: StreamingService) => void;
  onRemove: (id: string) => void;
  onOpen: (service: StreamingService) => void;
  adding: boolean;
  removing: boolean;
}

function ServiceTile({ service, isConnected, connectionId, onAdd, onRemove, onOpen, adding, removing }: ServiceTileProps) {
  const emoji = SERVICE_EMOJIS[service.service] ?? '📱';
  return (
    <div
      className={`bg-surface-raised rounded-xl p-3 border transition-all flex flex-col gap-2 ${
        isConnected ? 'border-teal-400 ring-2 ring-teal-300/40' : 'border-surface-ink/[0.06]'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-surface-ink truncate">{service.service}</p>
          {isConnected && (
            <span className="text-[10px] text-teal-600 font-medium">✓ Added</span>
          )}
        </div>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onOpen(service)}
          className="btn-outline text-[11px] py-1 px-2 flex-1"
        >
          Open App
        </button>
        {isConnected && connectionId ? (
          <button
            type="button"
            onClick={() => onRemove(connectionId)}
            disabled={removing}
            className="text-[11px] text-red-500 hover:text-red-700 px-1.5"
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAdd(service)}
            disabled={adding}
            className="btn text-[11px] py-1 px-2"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}

// ─── StreamingHub ─────────────────────────────────────────────────────────────

export function StreamingHub() {
  const { data: mediaData, isLoading: mediaLoading } = useMediaConnections();
  const { data: screenData } = useScreenTimeWeekly();
  const addConnection = useAddMediaConnection();
  const removeConnection = useRemoveMediaConnection();
  const logScreenTime = useLogScreenTime();

  const connections = mediaData?.connections ?? [];
  const catalog: StreamingService[] = (mediaData?.catalog ?? []) as StreamingService[];
  const weeklyData = screenData?.weekly ?? [];
  const prevWeekTotal = screenData?.prev_week_total ?? 0;
  const currentWeekTotal = weeklyData.reduce((sum, e) => sum + e.total_seconds, 0);
  const mostUsed = weeklyData.reduce(
    (top, e) => (e.total_seconds > (top?.total_seconds ?? 0) ? e : top),
    weeklyData[0]
  );

  const chartData = weeklyData.map((e) => ({
    platform: e.platform,
    minutes: Math.round(e.total_seconds / 60),
  }));

  function getConnectionId(service: string): string | null {
    return connections.find((c) => c.service === service)?.id ?? null;
  }

  function handleOpen(service: StreamingService) {
    window.open(service.deep_link_url || '#', '_blank', 'noopener,noreferrer');
    logScreenTime.mutate({ platform: service.service });
  }

  function handleAdd(service: StreamingService) {
    addConnection.mutate({
      service: service.service,
      service_type: service.service_type,
      deep_link_url: service.deep_link_url,
    });
  }

  const grouped = SECTION_ORDER.reduce<Record<string, StreamingService[]>>((acc, type) => {
    acc[type] = catalog.filter((s) => s.service_type === type);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* ── Section 1: Services Grid ── */}
      {mediaLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {SECTION_ORDER.map((type) => {
            const services = grouped[type];
            if (!services || services.length === 0) return null;
            return (
              <div key={type}>
                <h3 className="text-xs font-bold text-surface-muted uppercase tracking-wider mb-2">
                  {SECTION_LABELS[type]}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {services.map((svc) => {
                    const connId = getConnectionId(svc.service);
                    return (
                      <ServiceTile
                        key={svc.service}
                        service={svc}
                        isConnected={connId !== null}
                        connectionId={connId}
                        onAdd={handleAdd}
                        onRemove={(id) => removeConnection.mutate(id)}
                        onOpen={handleOpen}
                        adding={addConnection.isPending}
                        removing={removeConnection.isPending}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Section 2: Watch Time ── */}
      <div className="bg-surface-raised rounded-2xl p-5 border border-surface-ink/[0.06] space-y-4">
        <h3 className="font-bold text-surface-ink text-sm">Watch Time This Week</h3>

        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-sunk rounded-xl p-3 text-center border border-surface-ink/[0.06]">
            <p className="text-[10px] text-surface-muted uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold text-surface-ink">{formatHHMM(currentWeekTotal)}</p>
          </div>
          <div className="bg-surface-sunk rounded-xl p-3 text-center border border-surface-ink/[0.06]">
            <p className="text-[10px] text-surface-muted uppercase tracking-wide">vs Last Week</p>
            <p className={`text-lg font-bold ${currentWeekTotal >= prevWeekTotal ? 'text-red-500' : 'text-green-600'}`}>
              {deltaPercent(currentWeekTotal, prevWeekTotal)}
            </p>
          </div>
          <div className="bg-surface-sunk rounded-xl p-3 text-center border border-surface-ink/[0.06]">
            <p className="text-[10px] text-surface-muted uppercase tracking-wide">Most Used</p>
            <p className="text-sm font-bold text-surface-ink truncate">{mostUsed?.platform ?? '—'}</p>
          </div>
        </div>

        {/* Bar Chart */}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="platform" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value) => [`${value as number} min`, 'Screen Time']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="minutes" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-surface-muted text-center py-6">No watch time data yet.</p>
        )}

        {/* Export */}
        <button
          type="button"
          className="btn-outline text-xs py-1.5 px-4"
          onClick={() => {
            const csv = buildCSV(weeklyData);
            downloadCSV(csv, 'screen-time-weekly.csv');
          }}
        >
          Download Weekly Report CSV
        </button>
      </div>
    </div>
  );
}
