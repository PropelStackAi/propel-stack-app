/**
 * Network Hub — Professional & Personal Contacts
 * Propel Stack AI, LLC
 *
 * Relationship tracking, follow-up queue, and network wins.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface NetworkContact {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  relationship_type: string;
  last_contact_date: string | null;
  follow_up_date: string | null;
  created_at: string;
}

interface FollowUpContact {
  id: string;
  name: string;
  company: string | null;
  days_since_contact: number | null;
  follow_up_date: string | null;
}

interface NetworkWin {
  id: string;
  title: string;
  description: string | null;
  contact_id: string | null;
  created_at: string;
}

const RELATIONSHIP_TYPES = ['mentor', 'colleague', 'friend', 'client', 'vendor', 'partner', 'contact'];

function lastContactColor(dateStr: string | null): string {
  if (!dateStr) return 'text-red-600';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30) return 'text-green-600';
  if (days <= 90) return 'text-amber-600';
  return 'text-red-600';
}

function lastContactDot(dateStr: string | null): string {
  if (!dateStr) return 'bg-red-500';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30) return 'bg-green-500';
  if (days <= 90) return 'bg-amber-500';
  return 'bg-red-500';
}

function daysSinceColor(days: number | null): string {
  if (days === null) return 'text-red-600';
  if (days <= 30) return 'text-green-600';
  if (days <= 90) return 'text-amber-600';
  return 'text-red-600';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FamilyNetwork() {
  const qc = useQueryClient();
  const [view, setView] = useState<'contacts' | 'followup' | 'wins'>('contacts');

  // Contacts
  const [search, setSearch] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [cName, setCName] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cRole, setCRole] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cRelType, setCRelType] = useState('contact');

  // Wins
  const [showAddWin, setShowAddWin] = useState(false);
  const [winTitle, setWinTitle] = useState('');
  const [winDesc, setWinDesc] = useState('');
  const [winContactId, setWinContactId] = useState('');

  // AI Coach modal
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachSuggestions, setCoachSuggestions] = useState<Array<{ name: string; company: string; days_since: number; reason: string }>>([]);
  const [coachLoading, setCoachLoading] = useState(false);

  const { data: contacts = [] } = useQuery<NetworkContact[]>({
    queryKey: ['network-contacts'],
    queryFn: () => apiRequest<NetworkContact[]>('/api/network/contacts'),
  });

  const { data: followUps = [] } = useQuery<FollowUpContact[]>({
    queryKey: ['network-follow-up-queue'],
    queryFn: () => apiRequest<FollowUpContact[]>('/api/network/follow-up-queue'),
    enabled: view === 'followup',
  });

  const { data: wins = [] } = useQuery<NetworkWin[]>({
    queryKey: ['network-wins'],
    queryFn: () => apiRequest<NetworkWin[]>('/api/network/wins'),
    enabled: view === 'wins',
  });

  const addContactMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest<{ id: string }>('/api/network/contacts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network-contacts'] });
      setShowAddContact(false);
      setCName(''); setCCompany(''); setCRole(''); setCEmail(''); setCPhone(''); setCRelType('contact');
    },
  });

  const touchMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/network/contacts/${id}/touch`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network-contacts'] });
      qc.invalidateQueries({ queryKey: ['network-follow-up-queue'] });
    },
  });

  const addWinMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest<{ id: string }>('/api/network/wins', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network-wins'] });
      setShowAddWin(false);
      setWinTitle(''); setWinDesc(''); setWinContactId('');
    },
  });

  async function handleAiCoach() {
    setCoachLoading(true);
    setShowCoachModal(true);
    try {
      const result = await apiRequest<{ suggestions: Array<{ name: string; company: string; days_since: number; reason: string }> }>(
        '/api/network/ai-coach',
        { method: 'POST' }
      );
      setCoachSuggestions(result.suggestions);
    } finally {
      setCoachLoading(false);
    }
  }

  const sortedContacts = [...contacts].sort((a, b) => {
    const aDate = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0;
    const bDate = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0;
    return aDate - bDate;
  });

  const filteredContacts = sortedContacts.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Network Hub</h1>
          <p className="text-surface-muted text-sm mt-1">
            Manage your professional and personal relationships — track contacts, follow-ups, and wins.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-sunk rounded-lg p-1 w-fit">
        {([
          { key: 'contacts', label: '👥 Contacts' },
          { key: 'followup', label: '📋 Follow-Up Queue' },
          { key: 'wins', label: '🏆 Network Wins' },
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

      {/* Contacts Tab */}
      {view === 'contacts' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input
              className="input flex-1 min-w-48"
              placeholder="Search by name or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={() => setShowAddContact(s => !s)}
              className="btn-primary text-sm"
            >
              + Add Contact
            </button>
          </div>

          {showAddContact && (
            <div className="card border-brand-indigo/30 space-y-3">
              <h3 className="font-semibold text-surface-ink">Add Contact</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Name *</label>
                  <input className="input" value={cName} onChange={e => setCName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="label">Company</label>
                  <input className="input" value={cCompany} onChange={e => setCCompany(e.target.value)} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <input className="input" value={cRole} onChange={e => setCRole(e.target.value)} placeholder="VP of Product" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="jane@acme.com" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" type="tel" value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="+1 555-000-0000" />
                </div>
                <div>
                  <label className="label">Relationship Type</label>
                  <select className="input" value={cRelType} onChange={e => setCRelType(e.target.value)}>
                    {RELATIONSHIP_TYPES.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addContactMutation.mutate({
                    name: cName,
                    company: cCompany || undefined,
                    role: cRole || undefined,
                    email: cEmail || undefined,
                    phone: cPhone || undefined,
                    relationship_type: cRelType,
                  })}
                  disabled={!cName || addContactMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {addContactMutation.isPending ? 'Saving…' : 'Add Contact'}
                </button>
                <button onClick={() => setShowAddContact(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}

          {filteredContacts.length === 0 ? (
            <div className="card text-center py-10 text-surface-muted">
              <div className="text-4xl mb-2">👥</div>
              <p>{search ? 'No contacts match your search.' : 'No contacts yet. Add your first contact above.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map(contact => (
                <div key={contact.id} className="card flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-surface-ink">{contact.name}</span>
                      <span className="chip text-xs capitalize">{contact.relationship_type}</span>
                    </div>
                    {(contact.company || contact.role) && (
                      <div className="text-xs text-surface-muted mt-0.5">
                        {[contact.role, contact.company].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 mt-1 text-xs font-medium ${lastContactColor(contact.last_contact_date)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${lastContactDot(contact.last_contact_date)}`} />
                      {contact.last_contact_date
                        ? `Last contact: ${formatDate(contact.last_contact_date)}`
                        : 'Never contacted'}
                    </div>
                  </div>
                  <button
                    onClick={() => touchMutation.mutate(contact.id)}
                    disabled={touchMutation.isPending}
                    className="btn-secondary text-xs py-1.5 flex-shrink-0"
                  >
                    👋 Log Touch
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Follow-Up Queue Tab */}
      {view === 'followup' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleAiCoach} className="btn-primary text-sm">
              🤖 AI Coach
            </button>
          </div>

          {followUps.length === 0 ? (
            <div className="card text-center py-10 text-surface-muted">
              <div className="text-4xl mb-2">✅</div>
              <p>No overdue follow-ups — you're on top of your network!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {followUps.map(fu => (
                <div key={fu.id} className="card flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-surface-ink">{fu.name}</div>
                    {fu.company && <div className="text-xs text-surface-muted">{fu.company}</div>}
                    <div className={`text-xs font-medium mt-0.5 ${daysSinceColor(fu.days_since_contact)}`}>
                      {fu.days_since_contact !== null
                        ? `${fu.days_since_contact} days since last contact`
                        : 'Never contacted'}
                    </div>
                  </div>
                  <button
                    onClick={() => touchMutation.mutate(fu.id)}
                    disabled={touchMutation.isPending}
                    className="btn-secondary text-xs py-1.5 flex-shrink-0"
                  >
                    👋 Log Touch
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* AI Coach Modal */}
          {showCoachModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-surface-ink">🤖 AI Coach Suggestions</h2>
                  <button onClick={() => setShowCoachModal(false)} className="text-surface-muted hover:text-surface-ink text-xl">×</button>
                </div>

                {coachLoading ? (
                  <div className="text-center py-8 text-surface-muted">Analyzing your network…</div>
                ) : coachSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-surface-muted">No suggestions at this time.</div>
                ) : (
                  <div className="space-y-3">
                    {coachSuggestions.map((s, i) => (
                      <div key={i} className="rounded-lg bg-surface-sunk p-4">
                        <div className="font-semibold text-surface-ink">{s.name}</div>
                        {s.company && <div className="text-xs text-surface-muted">{s.company}</div>}
                        <div className="text-xs text-amber-600 mt-1">{s.days_since} days since contact</div>
                        <div className="text-sm text-surface-ink mt-2 italic">"{s.reason}"</div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setShowCoachModal(false)} className="btn-secondary w-full text-sm">Close</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Network Wins Tab */}
      {view === 'wins' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddWin(s => !s)} className="btn-primary text-sm">
              + Log Win
            </button>
          </div>

          {showAddWin && (
            <div className="card border-brand-indigo/30 space-y-3">
              <h3 className="font-semibold text-surface-ink">Log a Network Win</h3>
              <div>
                <label className="label">Title *</label>
                <input
                  className="input"
                  value={winTitle}
                  onChange={e => setWinTitle(e.target.value)}
                  placeholder="e.g. Got introduced to the CTO at Acme"
                />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={winDesc}
                  onChange={e => setWinDesc(e.target.value)}
                  placeholder="Add more context about this win…"
                />
              </div>
              <div>
                <label className="label">Related Contact (optional)</label>
                <select className="input" value={winContactId} onChange={e => setWinContactId(e.target.value)}>
                  <option value="">— None —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addWinMutation.mutate({
                    title: winTitle,
                    description: winDesc || undefined,
                    contact_id: winContactId || undefined,
                  })}
                  disabled={!winTitle || addWinMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {addWinMutation.isPending ? 'Saving…' : 'Log Win'}
                </button>
                <button onClick={() => setShowAddWin(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}

          {wins.length === 0 ? (
            <div className="card text-center py-10 text-surface-muted">
              <div className="text-4xl mb-2">🏆</div>
              <p>Log your first network win!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {wins.map(win => (
                <div key={win.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-surface-ink">{win.title}</div>
                      {win.description && (
                        <p className="text-sm text-surface-muted mt-1">{win.description}</p>
                      )}
                      <div className="text-xs text-surface-muted mt-1">{formatDate(win.created_at)}</div>
                    </div>
                    <span className="text-2xl">🏆</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
