/**
 * Enhancement 37 — AI Companion Mode
 * Propel Stack AI, LLC
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface CompanionProfile {
  companion_name: string;
  personality_style: string;
}

interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const PERSONALITIES = [
  { value: 'warm', label: 'Warm & Empathetic', desc: 'Nurturing, celebrates small wins' },
  { value: 'direct', label: 'Direct & Honest', desc: 'Action-oriented, cuts to the chase' },
  { value: 'motivating', label: 'Energetic & Motivating', desc: 'Positive, helps you see your potential' },
  { value: 'gentle', label: 'Calm & Gentle', desc: 'Patient, creates a safe space' },
];

export function CompanionMode() {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [editName, setEditName] = useState('');
  const [editStyle, setEditStyle] = useState('warm');
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery<CompanionProfile>({
    queryKey: ['companion-profile'],
    queryFn: () => apiRequest<CompanionProfile>('/api/companion/profile'),
  });

  const { data: conversations = [] } = useQuery<ConversationTurn[]>({
    queryKey: ['companion-conversations'],
    queryFn: () => apiRequest<ConversationTurn[]>('/api/companion/conversations'),
  });

  const profileMutation = useMutation({
    mutationFn: (data: CompanionProfile) => apiRequest('/api/companion/profile', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companion-profile'] });
      setShowSettings(false);
    },
  });

  const checkinMutation = useMutation({
    mutationFn: () => apiRequest('/api/companion/checkin', { method: 'POST', body: JSON.stringify({ trigger_type: 'user_requested' }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companion-conversations'] }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.companion_name);
      setEditStyle(profile.personality_style);
    }
  }, [profile]);

  async function sendMessage() {
    if (!message.trim() || sending) return;
    const text = message;
    setMessage('');
    setSending(true);
    try {
      await apiRequest('/api/companion/chat', { method: 'POST', body: JSON.stringify({ message: text }) });
      qc.invalidateQueries({ queryKey: ['companion-conversations'] });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">
            {profile ? `${profile.companion_name}` : 'AI Companion'}
          </h1>
          <p className="text-surface-muted text-sm mt-1">Your personal AI companion — always here to listen and support.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => checkinMutation.mutate()}
            disabled={checkinMutation.isPending}
            className="btn-secondary text-sm"
          >
            {checkinMutation.isPending ? '…' : '✨ Check In'}
          </button>
          <button onClick={() => setShowSettings(s => !s)} className="btn-secondary text-sm">
            ⚙ Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card border-brand-indigo/30">
          <h2 className="font-semibold text-surface-ink mb-4">Companion Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Companion Name</label>
              <input
                className="input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={30}
                placeholder="Alex"
              />
            </div>
            <div>
              <label className="label">Personality Style</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {PERSONALITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setEditStyle(p.value)}
                    className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                      editStyle === p.value
                        ? 'border-brand-indigo bg-brand-indigo/5'
                        : 'border-surface-ink/10 hover:bg-surface-sunk'
                    }`}
                  >
                    <div className="text-sm font-medium text-surface-ink">{p.label}</div>
                    <div className="text-xs text-surface-muted">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => profileMutation.mutate({ companion_name: editName || 'Alex', personality_style: editStyle })}
                disabled={profileMutation.isPending}
                className="btn-primary text-sm"
              >
                {profileMutation.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setShowSettings(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className="card flex flex-col" style={{ minHeight: '480px' }}>
        <div className="flex-1 overflow-y-auto space-y-4 pb-4" style={{ maxHeight: '400px' }}>
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-surface-muted">
              <span className="text-4xl mb-2">👋</span>
              <p className="text-sm">Say hello to {profile?.companion_name ?? 'your companion'}!</p>
            </div>
          ) : (
            conversations.map(turn => (
              <div
                key={turn.id}
                className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    turn.role === 'user'
                      ? 'bg-brand-indigo text-white rounded-br-sm'
                      : 'bg-surface-sunk text-surface-ink rounded-bl-sm'
                  }`}
                >
                  {turn.content}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-surface-sunk rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-surface-muted">
                {profile?.companion_name ?? 'Companion'} is typing…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-surface-ink/[0.06] pt-4 mt-2">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder={`Message ${profile?.companion_name ?? 'your companion'}…`}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !message.trim()}
              className="btn-primary"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
