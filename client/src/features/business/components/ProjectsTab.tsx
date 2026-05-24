// ─── Business Projects ────────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useState } from 'react';
import { useBusinessProjects, useCreateProject, useUpdateProject, useDeleteProject, useBusinessClients } from '../api';
import type { BusinessProject } from '../types';

const STATUS_OPTS: { value: BusinessProject['status']; label: string; color: string }[] = [
  { value: 'planning',  label: 'Planning',  color: 'bg-blue-100 text-blue-700'    },
  { value: 'active',    label: 'Active',    color: 'bg-green-100 text-green-700'  },
  { value: 'on_hold',   label: 'On Hold',   color: 'bg-yellow-100 text-yellow-700'},
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-500'    },
];

const BLANK = { name: '', description: '', client_id: '', status: 'active' as BusinessProject['status'], budget: '', deadline: '' };

export function ProjectsTab(): JSX.Element {
  const [filter, setFilter] = useState<BusinessProject['status'] | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const { data: projData } = useBusinessProjects();
  const { data: clientData } = useBusinessClients();
  const create = useCreateProject();
  const update = useUpdateProject();
  const del = useDeleteProject();

  const projects = projData?.projects ?? [];
  const clients = clientData?.clients ?? [];
  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter);

  function startEdit(p: BusinessProject) {
    setForm({ name: p.name, description: p.description, client_id: p.client_id ?? '', status: p.status, budget: p.budget ? String(p.budget) : '', deadline: p.deadline ?? '' });
    setEditId(p.id);
    setShowForm(true);
  }

  function reset() { setForm({ ...BLANK }); setEditId(null); setShowForm(false); }

  function submit() {
    if (!form.name.trim()) return;
    const payload = { ...form, budget: form.budget ? Number(form.budget) : null, client_id: form.client_id || null, deadline: form.deadline || null };
    if (editId) update.mutate({ id: editId, ...payload }, { onSuccess: reset });
    else create.mutate(payload, { onSuccess: reset });
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'active', 'planning', 'on_hold', 'completed'] as const).map((s) => {
          const n = s === 'all' ? projects.length : projects.filter((p) => p.status === s).length;
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={['flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold',
                filter === s ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
              ].join(' ')}>
              {s === 'on_hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)} ({n})
            </button>
          );
        })}
        <button type="button" onClick={() => { reset(); setShowForm(true); }}
          className="ml-auto text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold">
          + New project
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold">{editId ? 'Edit project' : 'New project'}</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Project name *" className="col-span-2 border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <select value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BusinessProject['status'] }))}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              placeholder="Budget ($)" type="number" className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <input value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              type="date" className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description" rows={2} className="col-span-2 resize-none border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={reset} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending || update.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {editId ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-surface-muted text-center py-8">
          {projects.length === 0 ? 'No projects yet.' : 'None in this status.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const s = STATUS_OPTS.find((o) => o.value === p.status);
            return (
              <div key={p.id} className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-surface-ink">{p.name}</p>
                      {s && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>}
                    </div>
                    <p className="text-xs text-surface-muted mt-0.5">
                      {[p.client_name, p.budget ? fmt(p.budget) : null, p.deadline ? `Due ${p.deadline}` : null].filter(Boolean).join(' · ')}
                    </p>
                    {p.description && <p className="text-xs text-surface-muted mt-0.5 line-clamp-1">{p.description}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button type="button" onClick={() => startEdit(p)} className="text-xs text-surface-muted hover:text-brand-teal">Edit</button>
                    <button type="button" onClick={() => del.mutate(p.id)} className="text-xs text-surface-muted hover:text-red-500">✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
