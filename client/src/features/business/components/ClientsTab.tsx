// ─── Business Clients ─────────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useState } from 'react';
import { useBusinessClients, useCreateClient, useUpdateClient, useDeleteClient } from '../api';
import type { BusinessClient } from '../types';

const STATUS_OPTS: { value: BusinessClient['status']; label: string; color: string }[] = [
  { value: 'active',   label: 'Active',   color: 'bg-green-100 text-green-700' },
  { value: 'lead',     label: 'Lead',     color: 'bg-blue-100 text-blue-700'   },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-500'   },
];

const BLANK = { name: '', company: '', email: '', phone: '', status: 'active' as BusinessClient['status'], notes: '' };

export function ClientsTab(): JSX.Element {
  const [filter, setFilter] = useState<BusinessClient['status'] | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const { data } = useBusinessClients();
  const create = useCreateClient();
  const update = useUpdateClient();
  const del = useDeleteClient();

  const clients = data?.clients ?? [];
  const filtered = filter === 'all' ? clients : clients.filter((c) => c.status === filter);

  function startEdit(c: BusinessClient) {
    setForm({ name: c.name, company: c.company, email: c.email, phone: c.phone, status: c.status, notes: c.notes });
    setEditId(c.id);
    setShowForm(true);
  }

  function reset() { setForm({ ...BLANK }); setEditId(null); setShowForm(false); }

  function submit() {
    if (!form.name.trim()) return;
    if (editId) update.mutate({ id: editId, ...form }, { onSuccess: reset });
    else create.mutate(form, { onSuccess: reset });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'active', 'lead', 'inactive'] as const).map((s) => {
          const n = s === 'all' ? clients.length : clients.filter((c) => c.status === s).length;
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={['flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold',
                filter === s ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
              ].join(' ')}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({n})
            </button>
          );
        })}
        <button type="button" onClick={() => { reset(); setShowForm(true); }}
          className="ml-auto text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold">
          + Add client
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold">{editId ? 'Edit client' : 'New client'}</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name *" className="col-span-2 input-base" />
            <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="Company" className="input-base" />
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BusinessClient['status'] }))}
              className="input-base">
              {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email" className="input-base" />
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone" className="input-base" />
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes" rows={2} className="col-span-2 resize-none input-base" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={reset} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending || update.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {editId ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-surface-muted text-center py-8">
          {clients.length === 0 ? 'No clients yet — add your first!' : 'None in this category.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const s = STATUS_OPTS.find((o) => o.value === c.status);
            return (
              <div key={c.id} className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-surface-ink">{c.name}</p>
                    {c.company && <span className="text-xs text-surface-muted">{c.company}</span>}
                    {s && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>}
                  </div>
                  <p className="text-xs text-surface-muted mt-0.5">
                    {[c.email, c.phone].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button type="button" onClick={() => startEdit(c)} className="text-xs text-surface-muted hover:text-brand-teal">Edit</button>
                  <button type="button" onClick={() => del.mutate(c.id)} className="text-xs text-surface-muted hover:text-red-500">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
