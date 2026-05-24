// ─── Invoice Builder ──────────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

import { useState } from 'react';
import {
  useBusinessInvoices,
  useCreateInvoice,
  useUpdateInvoiceStatus,
  useDeleteInvoice,
  useBusinessClients,
  useBusinessProjects,
  type CreateInvoicePayload,
} from '../api';
import type { BusinessInvoice } from '../types';

const STATUS_OPTS: { value: BusinessInvoice['status']; label: string; color: string }[] = [
  { value: 'draft',     label: 'Draft',     color: 'bg-gray-100 text-gray-500'    },
  { value: 'sent',      label: 'Sent',      color: 'bg-blue-100 text-blue-700'    },
  { value: 'paid',      label: 'Paid',      color: 'bg-green-100 text-green-700'  },
  { value: 'overdue',   label: 'Overdue',   color: 'bg-red-100 text-red-700'      },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-400'    },
];

interface LineItem { description: string; quantity: number; unit_price: number }
const BLANK_ITEM: LineItem = { description: '', quantity: 1, unit_price: 0 };

export function InvoicesTab(): JSX.Element {
  const [showBuilder, setShowBuilder] = useState(false);
  const [filter, setFilter] = useState<BusinessInvoice['status'] | 'all'>('all');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ ...BLANK_ITEM }]);

  const { data: invData } = useBusinessInvoices();
  const { data: clientData } = useBusinessClients();
  const { data: projData } = useBusinessProjects();
  const create = useCreateInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const del = useDeleteInvoice();

  const invoices = invData?.invoices ?? [];
  const clients = clientData?.clients ?? [];
  const projects = projData?.projects ?? [];
  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const tax = subtotal * (Number(taxRate) / 100);
  const total = subtotal + tax;

  function addItem() { setItems((prev) => [...prev, { ...BLANK_ITEM }]); }
  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, [field]: field === 'description' ? value : Number(value) } : item,
    ));
  }

  function resetBuilder() {
    setShowBuilder(false); setClientId(''); setProjectId(''); setNotes('');
    setTaxRate('0'); setDueDate(''); setIssueDate(new Date().toISOString().slice(0, 10));
    setItems([{ ...BLANK_ITEM }]);
  }

  function submit() {
    if (!issueDate) return;
    const payload: CreateInvoicePayload = {
      client_id: clientId || undefined, project_id: projectId || undefined,
      issue_date: issueDate, due_date: dueDate || undefined,
      notes, tax_rate: Number(taxRate), status: 'draft', items,
    };
    create.mutate(payload, { onSuccess: resetBuilder });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((s) => {
          const n = s === 'all' ? invoices.length : invoices.filter((i) => i.status === s).length;
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={['flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold',
                filter === s ? 'bg-brand-teal text-white' : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
              ].join(' ')}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({n})
            </button>
          );
        })}
        <button type="button" onClick={() => setShowBuilder(!showBuilder)}
          className="ml-auto text-xs bg-brand-teal text-white px-3 py-1.5 rounded-xl font-semibold">
          + New invoice
        </button>
      </div>

      {/* Invoice Builder */}
      {showBuilder && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-surface-ink">Invoice Builder</p>
          <div className="grid grid-cols-2 gap-2">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              <option value="">No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm">
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Issue date</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-surface-muted uppercase tracking-wide">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Line items</p>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_90px_24px] gap-1.5 items-center">
                <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  placeholder="Description" className="border border-surface-ink/10 rounded-lg px-2 py-1.5 text-xs" />
                <input value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  type="number" min="0" step="0.5" placeholder="Qty"
                  className="border border-surface-ink/10 rounded-lg px-2 py-1.5 text-xs text-center" />
                <input value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                  type="number" min="0" step="0.01" placeholder="Rate ($)"
                  className="border border-surface-ink/10 rounded-lg px-2 py-1.5 text-xs text-right" />
                <button type="button" onClick={() => removeItem(idx)} className="text-surface-muted hover:text-red-500 text-xs">✕</button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-xs text-brand-teal font-semibold">+ Add line item</button>
          </div>

          {/* Totals */}
          <div className="border-t border-surface-ink/10 pt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-surface-muted">Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-surface-muted">Tax (%)</span>
              <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} type="number" min="0" max="100"
                className="w-16 border border-surface-ink/10 rounded px-2 py-0.5 text-xs text-right" />
            </div>
            {Number(taxRate) > 0 && (
              <div className="flex justify-between">
                <span className="text-surface-muted">Tax ({taxRate}%)</span>
                <span>{fmt(tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-surface-ink/10 pt-1">
              <span>Total</span>
              <span className="text-brand-teal">{fmt(total)}</span>
            </div>
          </div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
            className="w-full resize-none border border-surface-ink/10 rounded-lg px-3 py-2 text-sm" />

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={resetBuilder} className="text-xs text-surface-muted">Cancel</button>
            <button type="button" onClick={submit} disabled={create.isPending}
              className="text-xs bg-brand-teal text-white px-4 py-1.5 rounded-xl font-semibold disabled:opacity-40">
              {create.isPending ? 'Creating…' : 'Create invoice'}
            </button>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-surface-muted text-center py-8">
          {invoices.length === 0 ? 'No invoices yet — create your first!' : 'None in this status.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const s = STATUS_OPTS.find((o) => o.value === inv.status);
            const nextStatuses = inv.status === 'draft' ? ['sent'] : inv.status === 'sent' ? ['paid', 'overdue'] : [];
            return (
              <div key={inv.id} className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-surface-ink">{inv.invoice_number}</p>
                      {s && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>}
                      <span className="text-sm font-bold text-brand-teal ml-auto">{fmt(inv.total_amount)}</span>
                    </div>
                    <p className="text-xs text-surface-muted">
                      {[inv.client_name, `Issued ${inv.issue_date}`, inv.due_date ? `Due ${inv.due_date}` : null].filter(Boolean).join(' · ')}
                    </p>
                    {nextStatuses.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5">
                        {nextStatuses.map((ns) => {
                          const nso = STATUS_OPTS.find((o) => o.value === ns);
                          return (
                            <button key={ns} type="button"
                              onClick={() => updateStatus.mutate({ id: inv.id, status: ns })}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${nso?.color ?? ''}`}>
                              Mark {nso?.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => del.mutate(inv.id)} className="text-xs text-surface-muted hover:text-red-500 flex-shrink-0">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
