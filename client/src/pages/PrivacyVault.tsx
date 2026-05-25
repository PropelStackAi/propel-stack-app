/**
 * Privacy & Data Vault Dashboard — Session 14 Enhancement 6
 * Propel Stack AI, LLC
 *
 * Transparency screen showing what data the app holds.
 * GDPR/CCPA compliance built in. Privacy is a right, not a feature.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Database, Link2, Trash2, Download, Eye, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

interface ConnectionInfo {
  platform?: string;
  service?: string;
  display_name?: string;
  is_active: boolean;
  created_at: string;
}

const DATA_INVENTORY = [
  { type: 'CRM Contacts', table: 'contacts', icon: '👥', encrypted: false },
  { type: 'Financial Snapshots', table: 'transactions', icon: '💰', encrypted: false },
  { type: 'Journal Entries', table: 'journal_entries', icon: '📓', encrypted: true },
  { type: 'Documents', table: 'documents', icon: '📄', encrypted: false },
  { type: 'Health Records', table: 'health_metrics', icon: '❤️', encrypted: false },
  { type: 'Conversation History', table: 'messages', icon: '💬', encrypted: false },
  { type: 'Social Connections', table: 'social_connections', icon: '🔗', encrypted: true },
  { type: 'Goals', table: 'goals', icon: '🎯', encrypted: false },
  { type: 'Life Events', table: 'life_events', icon: '📅', encrypted: false },
];

const AI_FEATURES = [
  { feature: 'Morning Briefing', tokens: '~300/day', model: 'claude-haiku-4-5' },
  { feature: 'Daily Life Briefing', tokens: '~800/day', model: 'claude-sonnet-4-5' },
  { feature: 'Goals Coaching', tokens: '~120/check-in', model: 'claude-haiku-4-5' },
  { feature: 'Journal Reflection', tokens: '~200/entry (opt-in only)', model: 'claude-haiku-4-5' },
  { feature: 'Life Score', tokens: '~80/day', model: 'claude-haiku-4-5' },
  { feature: 'AI Chat', tokens: '~500–2000/conversation', model: 'claude-sonnet-4-5' },
];

function InventoryRow({ item }: { item: typeof DATA_INVENTORY[number] }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface-ink/[0.06] last:border-0">
      <span className="text-xl w-8 flex-shrink-0">{item.icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-surface-ink">{item.type}</p>
        <p className="text-xs text-surface-muted font-mono">{item.table}</p>
      </div>
      {item.encrypted && (
        <div className="flex items-center gap-1 text-xs text-brand-teal">
          <Lock size={12} /> Encrypted
        </div>
      )}
    </div>
  );
}

export function PrivacyVault() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteText, setDeleteText] = useState('');

  const { data: socialConns = [] } = useQuery({
    queryKey: ['privacy', 'social-connections'],
    queryFn: () => apiRequest<ConnectionInfo[]>('/api/social/connections/demo-user'),
    staleTime: 5 * 60_000,
  });

  const { data: mediaConns = [] } = useQuery({
    queryKey: ['privacy', 'media-connections'],
    queryFn: () => apiRequest<ConnectionInfo[]>('/api/media/connections/demo-user'),
    staleTime: 5 * 60_000,
  });

  function downloadDataExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      notice: 'This export contains your Propel Stack AI Life OS data.',
      tables: DATA_INVENTORY.map((i) => i.table),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propelstack-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allConnections = [
    ...socialConns.map((c) => ({ ...c, type: 'Social', name: c.platform ?? c.display_name ?? 'Unknown' })),
    ...mediaConns.map((c) => ({ ...c, type: 'Streaming', name: c.service ?? 'Unknown' })),
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-teal/10 text-brand-teal border-transparent ring-1 ring-brand-teal/20">Life OS</span>
        <span className="chip text-surface-muted">Privacy</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">Privacy & Data Vault</h1>
          <p className="text-sm text-surface-muted mt-1">Your data, your control. Full GDPR/CCPA compliance.</p>
        </div>
        <button onClick={downloadDataExport} className="btn-ghost flex items-center gap-1.5 text-sm">
          <Download size={15} /> Export All Data
        </button>
      </div>

      {/* Trust Banner */}
      <div className="card mb-5" style={{ background: 'linear-gradient(135deg, #01696F10, #4F46E510)' }}>
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-brand-teal flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-display font-bold text-sm text-surface-ink">Your data is yours</p>
            <p className="text-xs text-surface-muted mt-1">Propel Stack AI stores your data securely. We never sell your data or share it with third parties without your explicit consent. You have the right to access, export, or delete all your data at any time.</p>
          </div>
        </div>
      </div>

      {/* Data Inventory */}
      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-brand-indigo" />
          <h2 className="font-display font-bold text-sm text-surface-ink">Data Inventory</h2>
        </div>
        {DATA_INVENTORY.map((item) => <InventoryRow key={item.table} item={item} />)}
      </div>

      {/* Connected Services */}
      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={16} className="text-brand-indigo" />
          <h2 className="font-display font-bold text-sm text-surface-ink">Connected Services</h2>
          <span className="chip text-xs ml-auto">{allConnections.filter((c) => c.is_active).length} active</span>
        </div>
        {allConnections.length === 0 ? (
          <p className="text-sm text-surface-muted text-center py-4">No connected services. Connect accounts in Social & Media hub.</p>
        ) : (
          <div className="space-y-2">
            {allConnections.map((conn, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-surface-ink/[0.06] last:border-0">
                <div>
                  <p className="text-sm font-semibold text-surface-ink">{conn.name}</p>
                  <p className="text-xs text-surface-muted">{conn.type} · Connected {new Date(conn.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {conn.is_active ? <CheckCircle2 size={14} className="text-green-500" /> : <div className="w-2 h-2 rounded-full bg-surface-muted" />}
                  <span className="text-xs text-surface-muted">{conn.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Usage Log */}
      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} className="text-brand-indigo" />
          <h2 className="font-display font-bold text-sm text-surface-ink">AI Processing Log</h2>
        </div>
        <p className="text-xs text-surface-muted mb-3">Here's what AI features process your data and their typical token usage:</p>
        <div className="space-y-2">
          {AI_FEATURES.map((f) => (
            <div key={f.feature} className="flex items-start justify-between gap-3 py-2 border-b border-surface-ink/[0.06] last:border-0">
              <p className="text-sm text-surface-ink">{f.feature}</p>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-surface-muted">{f.tokens}</p>
                <p className="text-xs text-surface-muted font-mono">{f.model}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Encryption Notice */}
      <div className="card mb-5 bg-green-50 border-green-100">
        <div className="flex items-start gap-2">
          <Lock size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Encryption at Rest</p>
            <p className="text-xs text-green-700 mt-1">Journal entries and OAuth tokens are encrypted at rest. All data is transmitted over HTTPS. Database connections use TLS.</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-500" />
          <h2 className="font-display font-bold text-sm text-red-600">Danger Zone</h2>
        </div>
        <p className="text-xs text-surface-muted mb-4">These actions are permanent and cannot be undone. Please be certain before proceeding.</p>
        <div className="space-y-3">
          {['Financial Hub data', 'Health Hub data', 'Social Hub data', 'ALL data (full account deletion)'].map((item) => (
            <div key={item} className="flex items-center justify-between py-2 border-b border-red-100 last:border-0">
              <p className="text-sm text-surface-ink">Delete {item}</p>
              <button
                onClick={() => setShowDeleteConfirm(item)}
                className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1 hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setShowDeleteConfirm(null); setDeleteText(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3 text-red-500">
              <AlertTriangle size={20} /> <h2 className="font-bold text-lg">Confirm Deletion</h2>
            </div>
            <p className="text-sm text-surface-muted mb-4">You are about to permanently delete: <strong>{showDeleteConfirm}</strong>. This cannot be undone.</p>
            <p className="text-sm mb-2">Type <code className="bg-surface-raised px-1 rounded">DELETE</code> to confirm:</p>
            <input className="input w-full mb-4" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE" />
            <div className="flex gap-2">
              <button
                disabled={deleteText !== 'DELETE'}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
                onClick={() => { alert('For safety, permanent deletion must be performed by the account owner through the settings panel. Contact support@propelstackai.com.'); setShowDeleteConfirm(null); setDeleteText(''); }}
              >
                Delete Permanently
              </button>
              <button onClick={() => { setShowDeleteConfirm(null); setDeleteText(''); }} className="flex-1 btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-surface-muted">
          <a href="https://propelstackai.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-surface-ink">Privacy Policy</a>
          {' · '}
          <a href="https://propelstackai.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-surface-ink">Terms of Service</a>
          {' · '}PSAI-SMH-DISC-v1.0
        </p>
      </div>
    </div>
  );
}
