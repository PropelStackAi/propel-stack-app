/**
 * Smart Reminders & Life Events Timeline — Session 14 Enhancement 5
 * Propel Stack AI, LLC
 *
 * Unified life calendar aggregating from every hub.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, DollarSign, Heart, Star, Repeat, CheckCircle2, Brain } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

interface LifeEvent {
  id: string;
  user_id: string;
  title: string;
  event_type: string;
  event_date: string;
  hub_source?: string;
  amount?: number;
  recurrence: string;
  reminder_days: number;
  ai_prep_suggestions: string;
  is_completed: boolean;
  description?: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  bill: '#4F46E5', birthday: '#EC4899', medical: '#01696F', goal_deadline: '#F97316',
  subscription: '#7C3AED', custom: '#6B7280',
};
const EVENT_TYPE_ICONS: Record<string, React.ElementType> = {
  bill: DollarSign, birthday: Star, medical: Heart, goal_deadline: CheckCircle2,
  subscription: Repeat, custom: Calendar,
};
const HUB_COLORS: Record<string, string> = {
  financial: '#4F46E5', health: '#01696F', crm: '#EC4899', social: '#7C3AED',
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function EventCard({ event, onComplete }: { event: LifeEvent; onComplete: (id: string) => void }) {
  const [showPrep, setShowPrep] = useState(false);
  const color = EVENT_TYPE_COLORS[event.event_type] ?? '#6B7280';
  const Icon = EVENT_TYPE_ICONS[event.event_type] ?? Calendar;
  const days = daysUntil(event.event_date);
  const preps = JSON.parse(event.ai_prep_suggestions || '[]') as string[];
  const isUrgent = days >= 0 && days <= event.reminder_days;

  return (
    <div className={`card ${event.is_completed ? 'opacity-60' : ''} ${isUrgent && !event.is_completed ? 'border-amber-300 bg-amber-50/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl p-2 flex-shrink-0 mt-0.5" style={{ background: color + '18' }}>
          <Icon size={16} color={color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-surface-ink">{event.title}</p>
              <p className="text-xs text-surface-muted mt-0.5">{formatEventDate(event.event_date)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {days >= 0 && !event.is_completed && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${days <= 3 ? 'bg-red-100 text-red-600' : days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-surface-raised text-surface-muted'}`}>
                  {days === 0 ? 'Today' : `${days}d`}
                </span>
              )}
              {!event.is_completed && (
                <button onClick={() => onComplete(event.id)} className="text-surface-muted hover:text-green-500 transition-colors" title="Mark complete">
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
          {event.amount && <p className="text-xs text-surface-muted mt-1">${event.amount.toLocaleString()}</p>}
          {event.hub_source && <span className="text-xs px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: (HUB_COLORS[event.hub_source] ?? '#6B7280') + '18', color: HUB_COLORS[event.hub_source] ?? '#6B7280' }}>{event.hub_source}</span>}
          {preps.length > 0 && (
            <button onClick={() => setShowPrep(!showPrep)} className="flex items-center gap-1 text-xs text-brand-teal mt-2 hover:underline">
              <Brain size={12} /> {showPrep ? 'Hide' : 'Show'} AI prep suggestions
            </button>
          )}
          {showPrep && preps.length > 0 && (
            <ul className="mt-2 space-y-1 pl-3">
              {preps.map((p, i) => <li key={i} className="text-xs text-surface-muted list-disc">{p}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AddEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: '', event_type: 'custom', event_date: '', amount: '', recurrence: 'none', reminder_days: 3 });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest('/api/life-events', { method: 'POST', body }),
    onSuccess: () => { onCreated(); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-xl mb-4">Add Life Event</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Title</label>
            <input className="input w-full mt-1" placeholder="e.g. Property tax due" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Type</label>
              <select className="input w-full mt-1" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                {['bill', 'birthday', 'medical', 'goal_deadline', 'subscription', 'custom'].map((t) => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Date</label>
              <input className="input w-full mt-1" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Amount ($)</label>
              <input className="input w-full mt-1" type="number" placeholder="Optional" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Remind me</label>
              <select className="input w-full mt-1" value={form.reminder_days} onChange={(e) => setForm({ ...form, reminder_days: Number(e.target.value) })}>
                {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''} before</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-surface-muted uppercase tracking-wide">Recurrence</label>
            <select className="input w-full mt-1" value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
              {['none', 'daily', 'weekly', 'monthly', 'yearly'].map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => create.mutate({ ...form, amount: form.amount ? Number(form.amount) : undefined })}
            disabled={!form.title || !form.event_date || create.isPending}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {create.isPending ? 'Adding…' : 'Add Event'}
          </button>
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function EventsTimeline() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState<'upcoming' | 'completed'>('upcoming');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['life-events', 'all'],
    queryFn: () => apiRequest<LifeEvent[]>('/api/life-events'),
    staleTime: 5 * 60_000,
  });

  const complete = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/life-events/${id}`, { method: 'PATCH', body: { is_completed: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['life-events'] }),
  });

  const upcoming = events.filter((e) => !e.is_completed).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const completed = events.filter((e) => e.is_completed);

  // Group upcoming by time bucket
  const today = new Date().toISOString().slice(0, 10);
  const groups: { label: string; events: LifeEvent[] }[] = [
    { label: 'Today & Overdue', events: upcoming.filter((e) => e.event_date <= today) },
    { label: 'This Week', events: upcoming.filter((e) => { const d = daysUntil(e.event_date); return d > 0 && d <= 7; }) },
    { label: 'This Month', events: upcoming.filter((e) => { const d = daysUntil(e.event_date); return d > 7 && d <= 30; }) },
    { label: 'Later', events: upcoming.filter((e) => daysUntil(e.event_date) > 30) },
  ].filter((g) => g.events.length > 0);

  return (
    <div>
      {showAdd && <AddEventModal onClose={() => setShowAdd(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['life-events'] })} />}

      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-indigo/10 text-brand-indigo border-transparent ring-1 ring-brand-indigo/20">Life OS</span>
        <span className="chip text-surface-muted">Events</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">Life Events</h1>
          <p className="text-sm text-surface-muted mt-1">{upcoming.length} upcoming · {completed.length} completed</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> Add Event
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'This Week', value: upcoming.filter((e) => daysUntil(e.event_date) <= 7 && daysUntil(e.event_date) >= 0).length, color: '#F97316' },
          { label: 'Upcoming', value: upcoming.length, color: '#4F46E5' },
          { label: 'Completed', value: completed.length, color: '#01696F' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center py-3">
            <div className="font-display font-extrabold text-2xl" style={{ color }}>{value}</div>
            <div className="text-xs text-surface-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 mb-4 bg-surface-raised rounded-xl p-1 w-fit">
        {(['upcoming', 'completed'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${view === v ? 'bg-white text-surface-ink shadow-sm' : 'text-surface-muted'}`}>{v}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-raised rounded-2xl animate-pulse" />)}</div>
      ) : view === 'upcoming' ? (
        groups.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar size={40} className="mx-auto mb-4 text-surface-muted opacity-40" />
            <p className="font-display font-bold text-surface-ink mb-1">No upcoming events</p>
            <p className="text-sm text-surface-muted mb-4">Add life events to track bills, birthdays, medical appointments, and more</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary">Add your first event</button>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs font-bold text-surface-muted uppercase tracking-widest mb-2 px-1">{group.label}</h3>
                <div className="space-y-2">
                  {group.events.map((e) => <EventCard key={e.id} event={e} onComplete={(id) => complete.mutate(id)} />)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {completed.length === 0 ? (
            <div className="card text-center py-10 text-surface-muted">
              <CheckCircle2 size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No completed events yet</p>
            </div>
          ) : completed.map((e) => <EventCard key={e.id} event={e} onComplete={(id) => complete.mutate(id)} />)}
        </div>
      )}
    </div>
  );
}
