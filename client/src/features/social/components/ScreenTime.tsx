// ─── ScreenTime.tsx ───────────────────────────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useScreenTimeWeekly } from '../api';
import type { ScreenTimeEntry } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  '#0d9488',
  '#6366f1',
  '#f97316',
  '#ec4899',
  '#22c55e',
  '#eab308',
  '#3b82f6',
  '#8b5cf6',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatHHMM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatHHMMShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function deltaPercent(current: number, prev: number): { text: string; positive: boolean } {
  if (prev === 0) {
    if (current === 0) return { text: '0%', positive: true };
    return { text: '+100%', positive: false };
  }
  const pct = Math.round(((current - prev) / prev) * 100);
  return { text: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct <= 0 };
}

function buildCSV(entries: ScreenTimeEntry[]): string {
  const lines = ['Platform,Sessions,Total Minutes,Avg Session (min)'];
  for (const e of entries) {
    const totalMin = Math.round(e.total_seconds / 60);
    const avgMin = e.session_count > 0 ? Math.round(totalMin / e.session_count) : 0;
    lines.push(`${e.platform},${e.session_count},${totalMin},${avgMin}`);
  }
  return lines.join('\n');
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

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  payload: { platform: string; minutes: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const { platform, minutes } = payload[0].payload;
  return (
    <div className="bg-white border border-surface-ink/[0.06] rounded-xl shadow px-3 py-2">
      <p className="text-xs font-semibold text-surface-ink">{platform}</p>
      <p className="text-xs text-surface-muted">{formatHHMMShort(minutes)}</p>
    </div>
  );
}

// ─── ScreenTime ───────────────────────────────────────────────────────────────

export function ScreenTime() {
  const { data, isLoading } = useScreenTimeWeekly();

  const weekly: ScreenTimeEntry[] = data?.weekly ?? [];
  const prevWeekTotal = data?.prev_week_total ?? 0;
  const currentWeekTotal = weekly.reduce((sum, e) => sum + e.total_seconds, 0);

  const mostUsed = weekly.reduce<ScreenTimeEntry | null>(
    (top, e) => (top === null || e.total_seconds > top.total_seconds ? e : top),
    null
  );

  const delta = deltaPercent(currentWeekTotal, prevWeekTotal);

  const chartData = weekly.map((e) => ({
    platform: e.platform,
    minutes: Math.round(e.total_seconds / 60),
  }));

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="h-60 bg-gray-100 rounded-2xl" />
        <div className="h-40 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (weekly.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-sunk border border-surface-ink/[0.06] p-12 text-center">
        <p className="text-3xl mb-3">📱</p>
        <p className="text-surface-muted text-sm">
          No screen time data yet. Open streaming or social apps to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-raised rounded-xl border border-surface-ink/[0.06] p-4 text-center">
          <p className="text-[10px] text-surface-muted uppercase tracking-wide mb-1">Total This Week</p>
          <p className="text-xl font-bold text-surface-ink">{formatHHMM(currentWeekTotal)}</p>
        </div>
        <div className="bg-surface-raised rounded-xl border border-surface-ink/[0.06] p-4 text-center">
          <p className="text-[10px] text-surface-muted uppercase tracking-wide mb-1">vs Last Week</p>
          <p className={`text-xl font-bold flex items-center justify-center gap-1 ${delta.positive ? 'text-green-600' : 'text-red-500'}`}>
            <span>{delta.positive ? '↓' : '↑'}</span>
            <span>{delta.text}</span>
          </p>
        </div>
        <div className="bg-surface-raised rounded-xl border border-surface-ink/[0.06] p-4 text-center">
          <p className="text-[10px] text-surface-muted uppercase tracking-wide mb-1">Most Used</p>
          <p className="text-sm font-bold text-surface-ink truncate">{mostUsed?.platform ?? '—'}</p>
        </div>
      </div>

      {/* ── Bar Chart ── */}
      <div className="bg-surface-raised rounded-2xl border border-surface-ink/[0.06] p-4">
        <h3 className="text-xs font-bold text-surface-muted uppercase tracking-wider mb-3">
          Minutes Per Platform
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="platform" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface-raised rounded-2xl border border-surface-ink/[0.06] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-sunk border-b border-surface-ink/[0.06]">
              <th className="text-left px-4 py-2.5 font-semibold text-surface-muted">Platform</th>
              <th className="text-right px-4 py-2.5 font-semibold text-surface-muted">Sessions</th>
              <th className="text-right px-4 py-2.5 font-semibold text-surface-muted">Total Time</th>
              <th className="text-right px-4 py-2.5 font-semibold text-surface-muted">Avg Session</th>
            </tr>
          </thead>
          <tbody>
            {weekly.map((entry, idx) => {
              const totalMin = Math.round(entry.total_seconds / 60);
              const avgMin = entry.session_count > 0 ? Math.round(totalMin / entry.session_count) : 0;
              return (
                <tr
                  key={entry.platform}
                  className="border-b border-surface-ink/[0.06] last:border-0 hover:bg-surface-sunk transition-colors"
                >
                  <td className="px-4 py-2.5 text-surface-ink font-medium flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: COLORS[idx % COLORS.length] }}
                    />
                    {entry.platform}
                  </td>
                  <td className="px-4 py-2.5 text-right text-surface-muted">{entry.session_count}</td>
                  <td className="px-4 py-2.5 text-right text-surface-muted">{formatHHMMShort(totalMin)}</td>
                  <td className="px-4 py-2.5 text-right text-surface-muted">{formatHHMMShort(avgMin)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Export ── */}
      <button
        type="button"
        className="btn-outline text-sm py-2 px-4"
        onClick={() => {
          const csv = buildCSV(weekly);
          downloadCSV(csv, `screen-time-${new Date().toISOString().slice(0, 10)}.csv`);
        }}
      >
        Download CSV
      </button>
    </div>
  );
}
