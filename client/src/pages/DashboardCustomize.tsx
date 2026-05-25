// ─── Dashboard Customize — AM Widget Config + Tab Layout ─────────────────────
// Propel Stack AI, LLC
//
// Lets users toggle dashboard widgets on/off, set briefing delivery time,
// enable compact mode, and configure auto-refresh. All preferences are
// persisted server-side (no localStorage).

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Clock, Zap, Activity, Target, Smile, Heart, DollarSign,
  Sparkles, ToggleLeft, ToggleRight, Save, Check,
} from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardConfig {
  widgets_enabled: string[];
  widget_order: string[];
  briefing_time: string;
  compact_mode: boolean;
  auto_refresh: boolean;
  refresh_interval_mins: number;
}

interface UserTab {
  id: number;
  tab_key: string;
  label: string;
  icon: string;
  tab_type: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
}

// ─── Widget catalog ───────────────────────────────────────────────────────────

const WIDGET_CATALOG = [
  { id: 'morning_briefing', label: 'Morning Briefing', icon: Sparkles,        plan: 'Solo+',   description: 'AI-generated daily brief for your hubs' },
  { id: 'life_score',       label: 'Life Score',        icon: Activity,        plan: 'All',     description: 'Your overall life balance score' },
  { id: 'goals',            label: 'Goals Progress',    icon: Target,          plan: 'All',     description: 'Active goal progress bars' },
  { id: 'streaks',          label: 'Streaks',           icon: Zap,             plan: 'All',     description: 'Habit streaks and wins' },
  { id: 'mood',             label: 'Mood & Journal',    icon: Smile,           plan: 'All',     description: 'Quick mood log and recent entries' },
  { id: 'energy',           label: 'Energy Level',      icon: Zap,             plan: 'All',     description: 'Today\'s energy check-in and profile' },
  { id: 'finance',          label: 'Finance Snapshot',  icon: DollarSign,      plan: 'Solo+',   description: 'Spending and budget overview' },
  { id: 'health',           label: 'Health Metrics',    icon: Heart,           plan: 'Solo+',   description: 'Recent health logs and trends' },
];

const REFRESH_OPTIONS = [
  { value: 5,   label: 'Every 5 min'  },
  { value: 15,  label: 'Every 15 min' },
  { value: 30,  label: 'Every 30 min' },
  { value: 60,  label: 'Every hour'   },
  { value: 240, label: 'Every 4 hrs'  },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useDashboardConfig() {
  return useQuery({
    queryKey: ['dashboard-config'],
    queryFn: () => apiRequest<DashboardConfig>('/api/dashboard-config'),
  });
}

function useUserTabs() {
  return useQuery({
    queryKey: ['user-tabs'],
    queryFn: () => apiRequest<{ tabs: UserTab[] }>('/api/tabs'),
  });
}

// ─── Widget Toggle Row ────────────────────────────────────────────────────────

function WidgetRow({
  widget, enabled, onToggle,
}: {
  widget: typeof WIDGET_CATALOG[number];
  enabled: boolean;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const Icon = widget.icon;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface-ink/[0.06] dark:border-white/[0.06] last:border-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        enabled ? 'bg-brand-indigo/10' : 'bg-surface-sunk dark:bg-white/5'
      }`}>
        <Icon size={16} className={enabled ? 'text-brand-indigo' : 'text-surface-muted'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-ink dark:text-white">{widget.label}</p>
        <p className="text-xs text-surface-muted truncate">{widget.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="chip text-[10px]">{widget.plan}</span>
        <button
          type="button"
          onClick={() => onToggle(widget.id, !enabled)}
          aria-pressed={enabled}
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${widget.label}`}
          className="transition-colors"
        >
          {enabled
            ? <ToggleRight size={28} className="text-brand-indigo" />
            : <ToggleLeft  size={28} className="text-surface-muted" />
          }
        </button>
      </div>
    </div>
  );
}

// ─── Tab Visibility Row ───────────────────────────────────────────────────────

function TabRow({ tab, onToggle }: { tab: UserTab; onToggle: (key: string, visible: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-ink/[0.06] dark:border-white/[0.06] last:border-0">
      <div className="flex-1">
        <p className="text-sm font-semibold text-surface-ink dark:text-white">{tab.label}</p>
        <p className="text-xs text-surface-muted">{tab.href}</p>
      </div>
      {tab.tab_type === 'built-in' && (
        <span className="chip text-[10px]">Built-in</span>
      )}
      <button
        type="button"
        onClick={() => onToggle(tab.tab_key, !tab.is_visible)}
        aria-pressed={tab.is_visible}
        aria-label={`${tab.is_visible ? 'Hide' : 'Show'} ${tab.label} tab`}
        className="transition-colors"
      >
        {tab.is_visible
          ? <ToggleRight size={26} className="text-brand-indigo" />
          : <ToggleLeft  size={26} className="text-surface-muted" />
        }
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DashboardCustomize() {
  const qc = useQueryClient();
  const { data: config, isLoading: configLoading } = useDashboardConfig();
  const { data: tabsData, isLoading: tabsLoading } = useUserTabs();

  // Local draft state — optimistic updates
  const [enabled,      setEnabled      ] = useState<string[]>([]);
  const [briefingTime, setBriefingTime ] = useState('07:00');
  const [compactMode,  setCompactMode  ] = useState(false);
  const [autoRefresh,  setAutoRefresh  ] = useState(true);
  const [refreshMins,  setRefreshMins  ] = useState(30);
  const [saved,        setSaved        ] = useState(false);

  // Sync local state from server on load
  useEffect(() => {
    if (config) {
      setEnabled(config.widgets_enabled);
      setBriefingTime(config.briefing_time);
      setCompactMode(config.compact_mode);
      setAutoRefresh(config.auto_refresh);
      setRefreshMins(config.refresh_interval_mins);
    }
  }, [config]);

  const saveConfig = useMutation({
    mutationFn: () =>
      apiRequest('/api/dashboard-config', {
        method: 'PUT',
        body: {
          widgets_enabled: enabled,
          widget_order: enabled,
          briefing_time: briefingTime,
          compact_mode: compactMode,
          auto_refresh: autoRefresh,
          refresh_interval_mins: refreshMins,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-config'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const toggleTab = useMutation({
    mutationFn: ({ key, visible }: { key: string; visible: boolean }) =>
      apiRequest(`/api/tabs/${key}/visibility`, {
        method: 'PATCH',
        body: { is_visible: visible },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-tabs'] }),
  });

  const handleWidgetToggle = (id: string, on: boolean) => {
    setEnabled(prev => on ? [...prev, id] : prev.filter(w => w !== id));
  };

  const tabs = tabsData?.tabs ?? [];

  if (configLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-sunk rounded-lg animate-pulse" />
        <div className="h-64 bg-surface-sunk rounded-xl2 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={22} className="text-brand-indigo" />
          <h1 className="font-display text-2xl font-bold text-surface-ink dark:text-white">Customize Dashboard</h1>
        </div>
        <button
          type="button"
          onClick={() => saveConfig.mutate()}
          disabled={saveConfig.isPending}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            saved
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-brand-indigo text-white hover:brightness-110'
          }`}
        >
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> {saveConfig.isPending ? 'Saving…' : 'Save'}</>}
        </button>
      </div>

      {/* Widgets section */}
      <div className="card space-y-1">
        <p className="font-semibold text-sm text-surface-ink dark:text-white mb-3">Dashboard widgets</p>
        {WIDGET_CATALOG.map(widget => (
          <WidgetRow
            key={widget.id}
            widget={widget}
            enabled={enabled.includes(widget.id)}
            onToggle={handleWidgetToggle}
          />
        ))}
      </div>

      {/* Briefing time */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-brand-indigo" />
          <p className="font-semibold text-sm text-surface-ink dark:text-white">Morning briefing time</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            className="input w-36"
            value={briefingTime}
            onChange={e => setBriefingTime(e.target.value)}
          />
          <span className="text-sm text-surface-muted">Your AI briefing generates at this time each day</span>
        </div>
      </div>

      {/* Display options */}
      <div className="card space-y-4">
        <p className="font-semibold text-sm text-surface-ink dark:text-white">Display options</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-ink dark:text-white">Compact mode</p>
            <p className="text-xs text-surface-muted">Smaller widget cards, more info per screen</p>
          </div>
          <button
            type="button"
            onClick={() => setCompactMode(v => !v)}
            aria-pressed={compactMode}
            aria-label="Toggle compact mode"
          >
            {compactMode
              ? <ToggleRight size={28} className="text-brand-indigo" />
              : <ToggleLeft  size={28} className="text-surface-muted" />
            }
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-ink dark:text-white">Auto-refresh data</p>
            <p className="text-xs text-surface-muted">Automatically update widget data in background</p>
          </div>
          <button
            type="button"
            onClick={() => setAutoRefresh(v => !v)}
            aria-pressed={autoRefresh}
            aria-label="Toggle auto-refresh"
          >
            {autoRefresh
              ? <ToggleRight size={28} className="text-brand-indigo" />
              : <ToggleLeft  size={28} className="text-surface-muted" />
            }
          </button>
        </div>

        {autoRefresh && (
          <div className="flex items-center gap-3 pl-0">
            <p className="text-sm text-surface-muted flex-1">Refresh interval</p>
            <select
              className="input w-44"
              value={refreshMins}
              onChange={e => setRefreshMins(Number(e.target.value))}
            >
              {REFRESH_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab visibility */}
      {!tabsLoading && tabs.length > 0 && (
        <div className="card">
          <p className="font-semibold text-sm text-surface-ink dark:text-white mb-3">Sidebar tab visibility</p>
          <p className="text-xs text-surface-muted mb-3">Show or hide tabs in the left sidebar. Hidden tabs can be re-enabled anytime.</p>
          {tabs.map(tab => (
            <TabRow
              key={tab.tab_key}
              tab={tab}
              onToggle={(key, visible) => toggleTab.mutate({ key, visible })}
            />
          ))}
        </div>
      )}

      {/* Save reminder */}
      <p className="text-xs text-surface-muted text-center">
        Changes are saved to your account — visible on all your devices.
      </p>
    </div>
  );
}
