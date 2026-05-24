/**
 * Travel & Trip Hub — Enhancement 31
 * Propel Stack AI, LLC
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Trip {
  id: string; name: string; destination: string; start_date: string | null;
  end_date: string | null; trip_type: string; travelers: string[]; created_at: string;
  itinerary?: unknown[]; packing_list?: Array<{ item: string; packed: boolean }>;
}

const TRIP_TYPES = ['leisure', 'business', 'race', 'medical', 'family'];

export function TravelHub() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', destination: '', start_date: '', end_date: '', trip_type: 'leisure' });
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [generatingPacking, setGeneratingPacking] = useState(false);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => apiRequest<Trip[]>('/api/travel/trips'),
  });

  const { data: tripDetail } = useQuery({
    queryKey: ['trip', selectedTrip?.id],
    queryFn: () => apiRequest<Trip>(`/api/travel/trips/${selectedTrip?.id}`),
    enabled: !!selectedTrip?.id && view === 'detail',
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest<{ id: string }>('/api/travel/trips', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); setShowAdd(false); setForm({ name: '', destination: '', start_date: '', end_date: '', trip_type: 'leisure' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/travel/trips/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); setView('list'); setSelectedTrip(null); },
  });

  async function generateItinerary() {
    if (!selectedTrip) return;
    setGeneratingItinerary(true);
    try {
      await apiRequest(`/api/travel/trips/${selectedTrip.id}/itinerary`, { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } });
      qc.invalidateQueries({ queryKey: ['trip', selectedTrip.id] });
    } finally { setGeneratingItinerary(false); }
  }

  async function generatePacking() {
    if (!selectedTrip) return;
    setGeneratingPacking(true);
    try {
      await apiRequest(`/api/travel/trips/${selectedTrip.id}/packing-list`, { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } });
      qc.invalidateQueries({ queryKey: ['trip', selectedTrip.id] });
    } finally { setGeneratingPacking(false); }
  }

  if (view === 'detail' && selectedTrip && tripDetail) {
    const itinerary = (tripDetail.itinerary as any[]) ?? [];
    const packingList = (tripDetail.packing_list as Array<{ item: string; packed: boolean }>) ?? [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setSelectedTrip(null); }} className="btn-ghost text-sm">← Back</button>
          <h1 className="text-2xl font-display font-bold text-surface-ink">{tripDetail.name}</h1>
          <span className="chip text-xs">{tripDetail.destination}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Itinerary */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-surface-ink">AI Itinerary</h2>
              <button className="btn-ghost text-sm" onClick={generateItinerary} disabled={generatingItinerary}>
                {generatingItinerary ? 'Generating…' : '✨ Generate'}
              </button>
            </div>
            {itinerary.length === 0 ? (
              <p className="text-sm text-surface-muted text-center py-6">No itinerary yet. Click Generate to create one.</p>
            ) : (
              <div className="space-y-3">
                {itinerary.map((day: any, i: number) => (
                  <div key={i} className="rounded-lg bg-surface-sunk p-3">
                    <p className="text-xs font-semibold text-brand-indigo mb-1">Day {day.day}{day.date ? ` — ${day.date}` : ''}</p>
                    {day.morning && <p className="text-xs text-surface-ink"><strong>Morning:</strong> {day.morning}</p>}
                    {day.afternoon && <p className="text-xs text-surface-ink mt-0.5"><strong>Afternoon:</strong> {day.afternoon}</p>}
                    {day.evening && <p className="text-xs text-surface-ink mt-0.5"><strong>Evening:</strong> {day.evening}</p>}
                    {day.notes && <p className="text-xs text-surface-muted mt-0.5 italic">{day.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Packing list */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-surface-ink">Packing List</h2>
              <button className="btn-ghost text-sm" onClick={generatePacking} disabled={generatingPacking}>
                {generatingPacking ? 'Generating…' : '✨ Generate'}
              </button>
            </div>
            {packingList.length === 0 ? (
              <p className="text-sm text-surface-muted text-center py-6">No packing list yet. Click Generate.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {packingList.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={item.packed ? 'line-through text-surface-muted' : 'text-surface-ink'}>{item.item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button className="btn-ghost text-sm text-brand-coral" onClick={() => { if (confirm('Delete this trip?')) deleteMutation.mutate(selectedTrip.id); }}>
            Delete Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Travel Hub</h1>
          <p className="text-sm text-surface-muted mt-1">Plan trips, AI itineraries, packing lists, and more.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ New Trip</button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-surface-muted animate-pulse">Loading trips…</div>
      ) : trips.length === 0 ? (
        <div className="py-16 text-center card">
          <div className="text-5xl mb-3">✈️</div>
          <p className="text-surface-muted">No trips yet. Plan your first adventure!</p>
          <button className="btn-primary mt-4" onClick={() => setShowAdd(true)}>Plan a Trip</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => { setSelectedTrip(trip); setView('detail'); }}
              className="card text-left hover:border-brand-indigo/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-surface-ink">{trip.name}</p>
                  <p className="text-sm text-surface-muted mt-0.5">📍 {trip.destination}</p>
                </div>
                <span className="chip text-xs capitalize">{trip.trip_type}</span>
              </div>
              {(trip.start_date || trip.end_date) && (
                <p className="text-xs text-surface-muted mt-2">
                  {trip.start_date && new Date(trip.start_date).toLocaleDateString()}
                  {trip.start_date && trip.end_date && ' → '}
                  {trip.end_date && new Date(trip.end_date).toLocaleDateString()}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface-raised rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-ink mb-4">New Trip</h2>
            <div className="space-y-3">
              <input className="input w-full" placeholder="Trip name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input w-full" placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="input w-full" placeholder="Start date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                <input type="date" className="input w-full" placeholder="End date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <select className="input w-full" value={form.trip_type} onChange={(e) => setForm({ ...form, trip_type: e.target.value })}>
                {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary flex-1" disabled={!form.name || !form.destination || addMutation.isPending} onClick={() => addMutation.mutate(form)}>
                {addMutation.isPending ? 'Creating…' : 'Create Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
