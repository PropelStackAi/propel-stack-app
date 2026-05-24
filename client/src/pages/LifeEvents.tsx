/**
 * Life Events Hub
 * Propel Stack AI, LLC
 *
 * Major life milestone tracking with AI-generated prep checklists.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface LifeEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  ai_checklist: Array<{ category: string; item: string }>;
  created_at: string;
}

const EVENT_TYPES = [
  { type: 'home_purchase', label: 'Home Purchase', icon: '🏠' },
  { type: 'marriage', label: 'Marriage', icon: '💍' },
  { type: 'new_baby', label: 'New Baby', icon: '👶' },
  { type: 'graduation', label: 'Graduation', icon: '🎓' },
  { type: 'career_change', label: 'Career Change', icon: '💼' },
  { type: 'major_move', label: 'Major Move', icon: '🌍' },
  { type: 'financial_event', label: 'Major Financial Event', icon: '🏦' },
  { type: 'estate_planning', label: 'Estate Planning', icon: '📋' },
  { type: 'health_milestone', label: 'Health Milestone', icon: '🏥' },
  { type: 'custom', label: 'Custom', icon: '⭐' },
];

const TYPE_BORDER_COLORS: Record<string, string> = {
  home_purchase: 'border-l-brand-indigo',
  marriage: 'border-l-pink-400',
  new_baby: 'border-l-sky-400',
  graduation: 'border-l-amber-400',
  career_change: 'border-l-brand-teal',
  major_move: 'border-l-green-500',
  financial_event: 'border-l-brand-purple',
  estate_planning: 'border-l-slate-500',
  health_milestone: 'border-l-red-400',
  custom: 'border-l-brand-coral',
};

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function groupByCategory(checklist: Array<{ category: string; item: string }>) {
  const groups: Record<string, string[]> = {};
  for (const entry of checklist) {
    if (!groups[entry.category]) groups[entry.category] = [];
    groups[entry.category].push(entry.item);
  }
  return groups;
}

export function LifeEvents() {
  const qc = useQueryClient();
  const [view, setView] = useState<'timeline' | 'add'>('timeline');

  // Add form state
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');

  // AI checklist cache: keyed by event id
  const [checklistCache, setChecklistCache] = useState<Record<string, Array<{ category: string; item: string }>>>({});
  const [checklistLoading, setChecklistLoading] = useState<Record<string, boolean>>({});
  const [openChecklist, setOpenChecklist] = useState<string | null>(null);

  const { data: events = [] } = useQuery<LifeEvent[]>({
    queryKey: ['life-events'],
    queryFn: () => apiRequest<LifeEvent[]>('/api/life-events'),
  });

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest<{ id: string }>('/api/life-events', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['life-events'] });
      setSelectedType('');
      setTitle('');
      setEventDate('');
      setDescription('');
      setView('timeline');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/life-events/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['life-events'] }),
  });

  async function handleAiPrep(event: LifeEvent) {
    const id = event.id;
    if (openChecklist === id) {
      setOpenChecklist(null);
      return;
    }
    setOpenChecklist(id);
    if (checklistCache[id]) return; // already cached
    setChecklistLoading(prev => ({ ...prev, [id]: true }));
    try {
      const result = await apiRequest<{ event_type: string; checklist: Array<{ category: string; item: string }> }>(
        '/api/life-events/ai-prep',
        { method: 'POST', body: JSON.stringify({ event_type: event.event_type }) }
      );
      setChecklistCache(prev => ({ ...prev, [id]: result.checklist }));
    } finally {
      setChecklistLoading(prev => ({ ...prev, [id]: false }));
    }
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this life event?')) {
      deleteMutation.mutate(id);
    }
  }

  function handleSubmit() {
    if (!selectedType || !title || !eventDate) return;
    addMutation.mutate({
      event_type: selectedType,
      title,
      event_date: eventDate,
      description: description || undefined,
    });
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Life Events</h1>
          <p className="text-surface-muted text-sm mt-1">
            Track major milestones and get AI-generated prep checklists for every life event.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-sunk rounded-lg p-1 w-fit">
        {([
          { key: 'timeline', label: '📅 Timeline' },
          { key: 'add', label: '➕ Add Event' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === t.key ? 'bg-white shadow-sm text-surface-ink' : 'text-surface-muted hover:text-surface-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Timeline Tab */}
      {view === 'timeline' && (
        <div className="space-y-4">
          {sortedEvents.length === 0 ? (
            <div className="card text-center py-12 text-surface-muted">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-medium text-surface-ink">No life events yet.</p>
              <p className="text-sm mt-1">Add your first milestone below.</p>
              <button
                onClick={() => setView('add')}
                className="btn-primary text-sm mt-4"
              >
                ➕ Add Life Event
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-surface-ink/10 ml-px" />

              <div className="space-y-4">
                {sortedEvents.map(event => {
                  const typeInfo = EVENT_TYPES.find(t => t.type === event.event_type);
                  const borderColor = TYPE_BORDER_COLORS[event.event_type] ?? 'border-l-surface-ink/20';
                  const checklist = checklistCache[event.id];
                  const isLoading = checklistLoading[event.id];
                  const isOpen = openChecklist === event.id;

                  return (
                    <div key={event.id} className="pl-10 relative">
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-brand-indigo border-2 border-white shadow-sm" />

                      <div className={`card border-l-4 ${borderColor}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl mt-0.5">{typeInfo?.icon ?? '⭐'}</span>
                            <div>
                              <div className="font-semibold text-surface-ink">{event.title}</div>
                              <div className="text-xs text-surface-muted mt-0.5">
                                {typeInfo?.label ?? event.event_type.replace(/_/g, ' ')} · {formatEventDate(event.event_date)}
                              </div>
                              {event.description && (
                                <p className="text-sm text-surface-muted mt-1 line-clamp-2">{event.description}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="text-surface-muted hover:text-red-500 transition-colors text-lg leading-none flex-shrink-0"
                            title="Delete event"
                          >
                            ×
                          </button>
                        </div>

                        {/* AI Prep Checklist button */}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleAiPrep(event)}
                            className="btn-secondary text-xs py-1.5"
                          >
                            {isOpen ? '▲ Hide Checklist' : '🤖 AI Prep Checklist'}
                          </button>
                        </div>

                        {/* Checklist panel */}
                        {isOpen && (
                          <div className="mt-3 rounded-lg bg-surface-sunk p-4">
                            {isLoading ? (
                              <div className="text-sm text-surface-muted text-center py-2">Generating checklist…</div>
                            ) : checklist && checklist.length > 0 ? (
                              <div className="space-y-3">
                                {Object.entries(groupByCategory(checklist)).map(([category, items]) => (
                                  <div key={category}>
                                    <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-1">
                                      {category}
                                    </div>
                                    <ul className="space-y-1">
                                      {items.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-surface-ink">
                                          <span className="text-brand-indigo mt-0.5">✓</span>
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-surface-muted text-center py-2">No checklist data.</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Event Tab */}
      {view === 'add' && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-surface-ink">Log a Life Event</h2>

          {/* Event type grid */}
          <div>
            <label className="label mb-2">Event Type *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {EVENT_TYPES.map(et => (
                <button
                  key={et.type}
                  onClick={() => setSelectedType(et.type)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all text-sm ${
                    selectedType === et.type
                      ? 'ring-2 ring-brand-indigo border-brand-indigo bg-brand-indigo/5 font-medium text-surface-ink'
                      : 'border-surface-ink/10 text-surface-muted hover:border-brand-indigo/40 hover:text-surface-ink'
                  }`}
                >
                  <span className="text-2xl">{et.icon}</span>
                  <span className="leading-tight">{et.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input
                className="input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Closed on our first home"
              />
            </div>
            <div>
              <label className="label">Event Date *</label>
              <input
                className="input"
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description (optional)</label>
              <textarea
                className="input"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add any notes about this milestone…"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!selectedType || !title || !eventDate || addMutation.isPending}
              className="btn-primary text-sm"
            >
              {addMutation.isPending ? 'Saving…' : 'Log Life Event'}
            </button>
            <button onClick={() => setView('timeline')} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
