// ─── Maintenance Tab ──────────────────────────────────────────────────────────
// Enhancement 21 — Propel Stack AI, LLC

import { useState } from 'react';
import {
  useMaintenanceTasks, useCreateMaintenanceTask,
  useMarkTaskDone, useDeleteMaintenanceTask,
  useGenerateMaintenanceSchedule, useProperties,
} from '../api';
import type { MaintenanceTask } from '../types';

const CATEGORIES = ['hvac', 'exterior', 'plumbing', 'electrical', 'seasonal', 'general'];
const CATEGORY_EMOJI: Record<string, string> = {
  hvac: '❄️', exterior: '🏚️', plumbing: '🚿', electrical: '⚡', seasonal: '🍂', general: '🔧',
};
const CLIMATE_ZONES = ['Hot & Arid', 'Hot & Humid', 'Temperate', 'Cold', 'Mixed'];
const PROPERTY_TYPES = ['House', 'Condo / Apartment', 'Townhouse', 'Manufactured Home'];

function urgencyColor(nextDue?: string): string {
  if (!nextDue) return 'bg-surface-raised border-surface-ink/10';
  const days = Math.ceil((new Date(nextDue).getTime() - Date.now()) / 86400000);
  if (days < 0)  return 'bg-red-50 border-red-100';
  if (days <= 7) return 'bg-orange-50 border-orange-100';
  if (days <= 30) return 'bg-yellow-50 border-yellow-100';
  return 'bg-surface-raised border-surface-ink/10';
}

function dueBadge(nextDue?: string): string {
  if (!nextDue) return 'No due date';
  const days = Math.ceil((new Date(nextDue).getTime() - Date.now()) / 86400000);
  if (days < 0)  return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

function TaskCard({ task }: { task: MaintenanceTask }) {
  const markDone = useMarkTaskDone();
  const del = useDeleteMaintenanceTask();
  return (
    <div className={`rounded-xl border p-3 flex items-start gap-3 ${urgencyColor(task.next_due)}`}>
      <span className="text-xl flex-shrink-0 mt-0.5">{CATEGORY_EMOJI[task.category] ?? '🔧'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-ink">{task.task_name}</p>
        <p className="text-xs text-surface-muted capitalize">
          {task.property_name ?? 'No property'} · Every {task.frequency_days}d
          {task.last_done ? ` · Last: ${task.last_done}` : ''}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-[10px] font-semibold ${task.next_due && new Date(task.next_due) < new Date() ? 'text-red-600' : 'text-surface-muted'}`}>
          {dueBadge(task.next_due)}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={() => markDone.mutate(task.id)}
            disabled={markDone.isPending}
            className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-semibold hover:bg-green-200 disabled:opacity-40">
            ✓ Done
          </button>
          <button type="button" onClick={() => del.mutate(task.id)}
            className="text-xs text-surface-muted hover:text-red-500 px-1">✕</button>
        </div>
      </div>
    </div>
  );
}

export function MaintenanceTab() {
  const { data, isLoading } = useMaintenanceTasks();
  const { data: propData }  = useProperties();
  const create   = useCreateMaintenanceTask();
  const generate = useGenerateMaintenanceSchedule();

  const [showAdd, setShowAdd]     = useState(false);
  const [showAI, setShowAI]       = useState(false);
  const [taskName, setTaskName]   = useState('');
  const [category, setCategory]   = useState('general');
  const [freqDays, setFreqDays]   = useState('90');
  const [lastDone, setLastDone]   = useState('');
  const [propId, setPropId]       = useState('');
  const [aiPropId, setAiPropId]   = useState('');
  const [propType, setPropType]   = useState('House');
  const [climate, setClimate]     = useState('Temperate');
  const [age, setAge]             = useState('10');
  const [generated, setGenerated] = useState<{ task_name: string; category: string; frequency_days: number }[]>([]);

  const tasks      = data?.tasks ?? [];
  const properties = propData?.properties ?? [];

  function addTask() {
    if (!taskName || !propId) return;
    create.mutate({ property_id: propId, task_name: taskName, category, frequency_days: Number(freqDays), last_done: lastDone || undefined }, {
      onSuccess: () => { setShowAdd(false); setTaskName(''); setLastDone(''); },
    });
  }

  function generateSchedule() {
    generate.mutate({ property_type: propType, climate_zone: climate, property_age_years: Number(age), property_id: aiPropId || undefined }, {
      onSuccess: (d) => { setGenerated(d.tasks); setShowAI(false); },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-end flex-wrap">
        <button type="button" onClick={() => { setShowAI(!showAI); setShowAdd(false); }}
          className="text-xs bg-brand-indigo/10 text-brand-indigo px-3 py-1.5 rounded-xl font-semibold hover:bg-brand-indigo/20">
          🤖 AI Schedule
        </button>
        <button type="button" onClick={() => { setShowAdd(!showAdd); setShowAI(false); }}
          className="text-xs bg-brand-indigo text-white px-3 py-1.5 rounded-xl font-semibold">
          + Add task
        </button>
      </div>

      {/* AI Generator */}
      {showAI && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">🤖 AI Maintenance Schedule Generator</p>
          <p className="text-xs text-surface-muted">Tell us about your property and we'll generate a full annual maintenance checklist.</p>
          <div className="grid grid-cols-2 gap-2">
            <select value={propType} onChange={(e) => setPropType(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={climate} onChange={(e) => setClimate(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              {CLIMATE_ZONES.map((z) => <option key={z}>{z}</option>)}
            </select>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Property age (years)</label>
              <input value={age} onChange={(e) => setAge(e.target.value)} type="number" min="0"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            {properties.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-surface-muted uppercase tracking-wide">Save to property</label>
                <select value={aiPropId} onChange={(e) => setAiPropId(e.target.value)}
                  className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
                  <option value="">Don't save</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAI(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={generateSchedule} disabled={generate.isPending}
              className="text-xs bg-brand-indigo text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {generate.isPending ? '🤖 Generating…' : 'Generate schedule'}
            </button>
          </div>

          {generated.length > 0 && (
            <div className="border-t border-surface-ink/10 pt-3 space-y-1">
              <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Generated tasks ({generated.length})</p>
              {generated.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-surface-ink">
                  <span>{CATEGORY_EMOJI[t.category] ?? '🔧'}</span>
                  <span className="flex-1">{t.task_name}</span>
                  <span className="text-surface-muted">Every {t.frequency_days}d</span>
                </div>
              ))}
              {aiPropId && <p className="text-[10px] text-green-600 font-semibold">✓ Saved to your property</p>}
            </div>
          )}
        </div>
      )}

      {/* Manual add */}
      {showAdd && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Add maintenance task</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Task name"
              className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            <select value={propId} onChange={(e) => setPropId(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              <option value="">Select property…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm capitalize">
              {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{CATEGORY_EMOJI[c]} {c}</option>)}
            </select>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Repeat every (days)</label>
              <input value={freqDays} onChange={(e) => setFreqDays(e.target.value)} type="number" min="1"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Last completed</label>
              <input value={lastDone} onChange={(e) => setLastDone(e.target.value)} type="date"
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={addTask} disabled={create.isPending}
              className="text-xs bg-brand-indigo text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-surface-muted text-center py-8">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl">🔧</p>
          <p className="text-sm text-surface-muted mt-2">No maintenance tasks yet.</p>
          <p className="text-xs text-surface-muted">Use the AI generator to create a full schedule instantly.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => <TaskCard key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}
