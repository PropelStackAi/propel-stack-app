/**
 * Enhancement 38 — Pet Hub
 * Propel Stack AI, LLC
 *
 * AI Vet Advisor ALWAYS includes mandatory disclaimer.
 * Triage: MONITOR AT HOME / SEE VET WITHIN 24-48 HRS / EMERGENCY — GO NOW
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  dob?: string;
  weight_lbs?: number;
  vet_name?: string;
  vet_phone?: string;
  insurance_provider?: string;
}

interface HealthRecord {
  id: string;
  record_type: string;
  title: string;
  notes?: string;
  date: string;
  next_due_date?: string;
}

interface Reminder {
  id: string;
  pet_name: string;
  species: string;
  title: string;
  next_due_date: string;
  record_type: string;
}

const RECORD_TYPES = ['checkup', 'vaccination', 'medication', 'surgery', 'dental', 'grooming', 'other'];

export function PetHub() {
  const qc = useQueryClient();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [view, setView] = useState<'pets' | 'records' | 'vet' | 'reminders'>('pets');
  const [showAddPet, setShowAddPet] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [vetSymptoms, setVetSymptoms] = useState('');
  const [vetResult, setVetResult] = useState('');
  const [vetLoading, setVetLoading] = useState(false);

  // Pet form state
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('dog');
  const [petBreed, setPetBreed] = useState('');
  const [petDob, setPetDob] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [petVetName, setPetVetName] = useState('');
  const [petVetPhone, setPetVetPhone] = useState('');
  const [petInsurance, setPetInsurance] = useState('');

  // Record form
  const [recType, setRecType] = useState('checkup');
  const [recTitle, setRecTitle] = useState('');
  const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0]);
  const [recNotes, setRecNotes] = useState('');
  const [recNextDue, setRecNextDue] = useState('');

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ['pets'],
    queryFn: () => apiRequest<Pet[]>('/api/pets'),
  });

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ['pet-reminders'],
    queryFn: () => apiRequest<Reminder[]>('/api/pets/upcoming-reminders'),
  });

  const { data: records = [] } = useQuery<HealthRecord[]>({
    queryKey: ['pet-records', selectedPetId],
    queryFn: () => apiRequest<HealthRecord[]>(`/api/pets/${selectedPetId}/records`),
    enabled: !!selectedPetId,
  });

  const addPetMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('/api/pets', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pets'] });
      setShowAddPet(false);
      setPetName(''); setPetSpecies('dog'); setPetBreed(''); setPetDob('');
      setPetWeight(''); setPetVetName(''); setPetVetPhone(''); setPetInsurance('');
    },
  });

  const deletePetMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/pets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pets'] });
      if (selectedPetId) setSelectedPetId(null);
    },
  });

  const addRecordMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest(`/api/pets/${selectedPetId}/records`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet-records', selectedPetId] });
      setShowAddRecord(false);
      setRecTitle(''); setRecNotes(''); setRecNextDue('');
    },
  });

  async function handleVetChat() {
    if (!vetSymptoms.trim()) return;
    setVetLoading(true);
    setVetResult('');
    try {
      const selectedPet = pets.find(p => p.id === selectedPetId);
      const r = await apiRequest<{ response: string }>('/api/pets/vet-chat', {
        method: 'POST',
        body: JSON.stringify({
          pet_id: selectedPetId ?? undefined,
          symptoms: vetSymptoms,
          pet_name: selectedPet?.name ?? 'my pet',
          species: selectedPet?.species ?? 'dog',
          breed: selectedPet?.breed,
        }),
      });
      setVetResult(r.response);
    } finally {
      setVetLoading(false);
    }
  }

  const selectedPet = pets.find(p => p.id === selectedPetId);

  function triageColor(text: string) {
    if (text.includes('EMERGENCY')) return 'border-red-400 bg-red-50';
    if (text.includes('SEE VET WITHIN')) return 'border-amber-400 bg-amber-50';
    return 'border-green-400 bg-green-50';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Pet Hub</h1>
          <p className="text-surface-muted text-sm mt-1">Pet profiles, health records, and AI vet advisor.</p>
        </div>
        {reminders.length > 0 && (
          <span className="chip bg-amber-100 text-amber-700 font-semibold">{reminders.length} upcoming reminder{reminders.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-sunk rounded-lg p-1 w-fit">
        {(['pets', 'records', 'vet', 'reminders'] as const).map(t => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === t ? 'bg-white shadow-sm text-surface-ink' : 'text-surface-muted hover:text-surface-ink'}`}
          >
            {t === 'pets' ? '🐾 Pets' : t === 'records' ? '📋 Records' : t === 'vet' ? '🩺 Vet Chat' : '🔔 Reminders'}
          </button>
        ))}
      </div>

      {/* Pets Tab */}
      {view === 'pets' && (
        <div className="space-y-4">
          <button onClick={() => setShowAddPet(s => !s)} className="btn-primary text-sm">+ Add Pet</button>

          {showAddPet && (
            <div className="card border-brand-teal/30">
              <h3 className="font-semibold text-surface-ink mb-4">New Pet Profile</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="label">Name *</label><input className="input" value={petName} onChange={e => setPetName(e.target.value)} placeholder="Buddy" /></div>
                <div><label className="label">Species</label>
                  <select className="input" value={petSpecies} onChange={e => setPetSpecies(e.target.value)}>
                    {['dog','cat','bird','rabbit','fish','reptile','other'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="label">Breed</label><input className="input" value={petBreed} onChange={e => setPetBreed(e.target.value)} /></div>
                <div><label className="label">Date of Birth</label><input className="input" type="date" value={petDob} onChange={e => setPetDob(e.target.value)} /></div>
                <div><label className="label">Weight (lbs)</label><input className="input" type="number" step="0.1" value={petWeight} onChange={e => setPetWeight(e.target.value)} /></div>
                <div><label className="label">Insurance Provider</label><input className="input" value={petInsurance} onChange={e => setPetInsurance(e.target.value)} /></div>
                <div><label className="label">Vet Name</label><input className="input" value={petVetName} onChange={e => setPetVetName(e.target.value)} /></div>
                <div><label className="label">Vet Phone</label><input className="input" value={petVetPhone} onChange={e => setPetVetPhone(e.target.value)} /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => addPetMutation.mutate({ name: petName, species: petSpecies, breed: petBreed || undefined, dob: petDob || undefined, weight_lbs: petWeight ? Number(petWeight) : undefined, vet_name: petVetName || undefined, vet_phone: petVetPhone || undefined, insurance_provider: petInsurance || undefined })}
                  disabled={!petName || addPetMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {addPetMutation.isPending ? 'Adding…' : 'Add Pet'}
                </button>
                <button onClick={() => setShowAddPet(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map(pet => (
              <div key={pet.id} className={`card cursor-pointer transition-all hover:shadow-raised ${selectedPetId === pet.id ? 'ring-2 ring-brand-teal' : ''}`} onClick={() => setSelectedPetId(pet.id)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-4xl mb-2">
                      {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : pet.species === 'bird' ? '🐦' : pet.species === 'rabbit' ? '🐇' : pet.species === 'fish' ? '🐟' : '🐾'}
                    </div>
                    <div className="font-semibold text-surface-ink">{pet.name}</div>
                    <div className="text-xs text-surface-muted capitalize">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</div>
                    {pet.weight_lbs && <div className="text-xs text-surface-muted">{pet.weight_lbs} lbs</div>}
                    {pet.vet_name && <div className="text-xs text-surface-muted mt-1">Vet: {pet.vet_name}</div>}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deletePetMutation.mutate(pet.id); }}
                    className="text-xs text-red-400 hover:text-red-600"
                  >✕</button>
                </div>
                {selectedPetId === pet.id && (
                  <div className="mt-3 flex gap-1">
                    <button onClick={() => setView('records')} className="text-xs btn-secondary py-1">Records</button>
                    <button onClick={() => setView('vet')} className="text-xs btn-secondary py-1">Vet Chat</button>
                  </div>
                )}
              </div>
            ))}
            {pets.length === 0 && (
              <div className="col-span-3 text-center py-12 text-surface-muted">
                <div className="text-5xl mb-3">🐾</div>
                <p>No pets yet. Add your first pet to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Records Tab */}
      {view === 'records' && (
        <div className="space-y-4">
          {!selectedPetId ? (
            <div className="card text-center py-8 text-surface-muted">Select a pet from the Pets tab first.</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-surface-ink">Health Records — {selectedPet?.name}</h2>
                <button onClick={() => setShowAddRecord(s => !s)} className="btn-primary text-sm">+ Add Record</button>
              </div>

              {showAddRecord && (
                <div className="card border-brand-indigo/30">
                  <h3 className="font-semibold text-surface-ink mb-3">New Health Record</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><label className="label">Type</label>
                      <select className="input" value={recType} onChange={e => setRecType(e.target.value)}>
                        {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><label className="label">Title *</label><input className="input" value={recTitle} onChange={e => setRecTitle(e.target.value)} placeholder="Annual checkup" /></div>
                    <div><label className="label">Date *</label><input className="input" type="date" value={recDate} onChange={e => setRecDate(e.target.value)} /></div>
                    <div><label className="label">Next Due Date</label><input className="input" type="date" value={recNextDue} onChange={e => setRecNextDue(e.target.value)} /></div>
                    <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={recNotes} onChange={e => setRecNotes(e.target.value)} /></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => addRecordMutation.mutate({ record_type: recType, title: recTitle, date: recDate, notes: recNotes || undefined, next_due_date: recNextDue || undefined })}
                      disabled={!recTitle || !recDate || addRecordMutation.isPending}
                      className="btn-primary text-sm"
                    >
                      {addRecordMutation.isPending ? 'Adding…' : 'Add Record'}
                    </button>
                    <button onClick={() => setShowAddRecord(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {records.map(r => (
                  <div key={r.id} className="card flex items-start justify-between gap-3">
                    <div>
                      <span className="chip text-xs mr-2 capitalize">{r.record_type}</span>
                      <span className="font-medium text-surface-ink">{r.title}</span>
                      <div className="text-xs text-surface-muted mt-1">{r.date}{r.next_due_date ? ` · Next due: ${r.next_due_date}` : ''}</div>
                      {r.notes && <div className="text-xs text-surface-muted mt-1">{r.notes}</div>}
                    </div>
                  </div>
                ))}
                {records.length === 0 && <div className="text-center py-8 text-surface-muted">No records yet.</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* Vet Chat Tab */}
      {view === 'vet' && (
        <div className="space-y-4">
          <div className="card border-amber-200 bg-amber-50">
            <p className="text-xs text-amber-800 font-medium">⚠ AI Vet Advisor — for general guidance only. Always consult a licensed veterinarian for diagnosis and treatment.</p>
          </div>

          {pets.length > 0 && (
            <div>
              <label className="label">Select Pet (optional)</label>
              <select className="input" value={selectedPetId ?? ''} onChange={e => setSelectedPetId(e.target.value || null)}>
                <option value="">No pet selected</option>
                {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
              </select>
            </div>
          )}

          <div className="card">
            <label className="label">Describe Symptoms</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Describe what you're observing — behavior changes, physical symptoms, when it started, etc."
              value={vetSymptoms}
              onChange={e => setVetSymptoms(e.target.value)}
            />
            <button
              onClick={handleVetChat}
              disabled={!vetSymptoms.trim() || vetLoading}
              className="btn-primary mt-3 text-sm"
            >
              {vetLoading ? 'Consulting…' : 'Get Guidance'}
            </button>
          </div>

          {vetResult && (
            <div className={`card border-2 ${triageColor(vetResult)}`}>
              <div className="whitespace-pre-wrap text-sm text-surface-ink leading-relaxed">{vetResult}</div>
            </div>
          )}
        </div>
      )}

      {/* Reminders Tab */}
      {view === 'reminders' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-surface-ink">Upcoming in Next 14 Days</h2>
          {reminders.length === 0 ? (
            <div className="card text-center py-8 text-surface-muted">No upcoming reminders. Add health records with due dates to see them here.</div>
          ) : (
            reminders.map(r => (
              <div key={r.id} className="card flex items-center gap-4">
                <div className="text-2xl">{r.species === 'dog' ? '🐕' : r.species === 'cat' ? '🐈' : '🐾'}</div>
                <div className="flex-1">
                  <div className="font-medium text-surface-ink">{r.pet_name} — {r.title}</div>
                  <div className="text-xs text-surface-muted capitalize">{r.record_type} · Due: {r.next_due_date}</div>
                </div>
                <span className="chip bg-amber-100 text-amber-700 text-xs">{r.next_due_date}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
