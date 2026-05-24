/**
 * Enhancement 43 — Smart Bill Negotiation & Subscription Audit
 * Propel Stack AI, LLC
 *
 * ONE-CLICK CANCEL requires explicit confirmation modal before any action.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Subscription {
  id: string;
  merchant_name: string;
  category: string;
  monthly_amount: number;
  annual_amount: number;
  status: string;
  unused_flag: boolean;
  overpaying_flag: boolean;
  savings_opportunity: number;
}

interface SavingsSummary {
  total_monthly_savings: number;
  total_annual_savings: number;
  actions_taken: number;
}

interface ScriptResult {
  scripts: Array<{ id: string; type: string; label: string; script_text: string; estimated_savings: number }>;
  provider: string;
  current_monthly: number;
  market_rate: number;
}

function statusColor(sub: Subscription) {
  if (sub.status === 'cancelled') return 'border-surface-ink/10 opacity-50';
  if (sub.unused_flag && sub.overpaying_flag) return 'border-red-400';
  if (sub.unused_flag || sub.overpaying_flag) return 'border-amber-400';
  return 'border-surface-ink/10';
}

export function BillNegotiation() {
  const qc = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ scanned: number; potential_annual_savings: number } | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [scripts, setScripts] = useState<ScriptResult | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const { data: subs = [] } = useQuery<Subscription[]>({
    queryKey: ['subscriptions'],
    queryFn: () => apiRequest<Subscription[]>('/api/bills/subscriptions'),
  });

  const { data: savings } = useQuery<SavingsSummary>({
    queryKey: ['bills-savings'],
    queryFn: () => apiRequest<SavingsSummary>('/api/bills/savings'),
  });

  async function handleScan() {
    setScanning(true);
    try {
      const r = await apiRequest<typeof scanResult>('/api/bills/scan', { method: 'POST' });
      setScanResult(r);
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['bills-savings'] });
    } finally {
      setScanning(false);
    }
  }

  async function handleGenerateScripts(sub: Subscription) {
    setSelectedSub(sub);
    setScriptLoading(true);
    setScripts(null);
    try {
      const r = await apiRequest<ScriptResult>(`/api/bills/generate-script/${sub.id}`, { method: 'POST' });
      setScripts(r);
    } finally {
      setScriptLoading(false);
    }
  }

  async function handleCancel(id: string) {
    setCancelLoading(true);
    try {
      await apiRequest(`/api/bills/cancel/${id}`, { method: 'POST', body: JSON.stringify({ confirmed: true }) });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['bills-savings'] });
      setCancelConfirmId(null);
    } finally {
      setCancelLoading(false);
    }
  }

  const activeSubs = subs.filter(s => s.status !== 'cancelled');
  const flaggedSubs = activeSubs.filter(s => s.unused_flag || s.overpaying_flag);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Bill Negotiation & Subscription Audit</h1>
          <p className="text-surface-muted text-sm mt-1">Identify unused subscriptions, benchmark against market rates, and get AI negotiation scripts.</p>
        </div>
        <button onClick={handleScan} disabled={scanning} className="btn-primary text-sm">
          {scanning ? 'Scanning…' : '🔍 Scan Subscriptions'}
        </button>
      </div>

      {/* Savings counter */}
      {savings && (savings.total_annual_savings > 0 || savings.actions_taken > 0) && (
        <div className="card bg-gradient-to-r from-brand-teal/10 to-brand-indigo/10 border-brand-teal/30">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-3xl font-bold text-brand-teal">${Math.round(savings.total_annual_savings).toLocaleString()}</div>
              <div className="text-xs text-surface-muted">Saved with Propel this year</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-surface-ink">${Math.round(savings.total_monthly_savings).toLocaleString()}</div>
              <div className="text-xs text-surface-muted">Per month saved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-surface-ink">{savings.actions_taken}</div>
              <div className="text-xs text-surface-muted">Actions taken</div>
            </div>
          </div>
        </div>
      )}

      {scanResult && (
        <div className="card border-brand-indigo/30">
          <p className="text-sm text-surface-ink">✅ Scanned {scanResult.scanned} recurring subscriptions. Potential annual savings: <strong>${Math.round(scanResult.potential_annual_savings).toLocaleString()}</strong></p>
        </div>
      )}

      {/* Flagged subscriptions */}
      {flaggedSubs.length > 0 && (
        <div>
          <h2 className="font-semibold text-surface-ink mb-3">⚠ Flagged — Action Recommended</h2>
          <div className="space-y-3">
            {flaggedSubs.map(sub => (
              <div key={sub.id} className={`card border-2 ${statusColor(sub)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-surface-ink">{sub.merchant_name}</div>
                    <div className="text-xs text-surface-muted capitalize mt-0.5">{sub.category}</div>
                    <div className="flex gap-2 mt-1.5">
                      {sub.overpaying_flag && <span className="chip bg-amber-100 text-amber-700 text-xs">Overpaying</span>}
                      {sub.unused_flag && <span className="chip bg-red-100 text-red-700 text-xs">Unused</span>}
                      {sub.savings_opportunity > 0 && <span className="chip bg-green-100 text-green-700 text-xs">Save ~${Math.round(sub.savings_opportunity)}/yr</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-surface-ink">${sub.monthly_amount}/mo</div>
                    <div className="text-xs text-surface-muted">${Math.round(sub.annual_amount)}/yr</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleGenerateScripts(sub)} disabled={scriptLoading && selectedSub?.id === sub.id} className="btn-primary text-xs py-1.5">
                    {scriptLoading && selectedSub?.id === sub.id ? 'Generating…' : '✍ Get Negotiation Scripts'}
                  </button>
                  <button onClick={() => setCancelConfirmId(sub.id)} className="btn-secondary text-xs py-1.5 text-red-600 border-red-200">
                    Cancel Subscription
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All subscriptions */}
      <div>
        <h2 className="font-semibold text-surface-ink mb-3">All Subscriptions ({activeSubs.length})</h2>
        {activeSubs.length === 0 ? (
          <div className="card text-center py-8 text-surface-muted">
            <div className="text-4xl mb-2">💳</div>
            <p>No subscriptions found. Click "Scan Subscriptions" to analyze your recurring charges via Plaid.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeSubs.map(sub => (
              <div key={sub.id} className={`card flex items-center gap-3 border ${statusColor(sub)}`}>
                <div className="flex-1">
                  <span className="font-medium text-surface-ink">{sub.merchant_name}</span>
                  <span className="text-xs text-surface-muted ml-2 capitalize">{sub.category}</span>
                </div>
                <div className="text-sm font-semibold text-surface-ink">${sub.monthly_amount}/mo</div>
                {(sub.overpaying_flag || sub.unused_flag) && (
                  <button onClick={() => handleGenerateScripts(sub)} className="text-xs text-brand-indigo hover:underline">Scripts</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Negotiation Scripts Modal */}
      {scripts && (
        <div className="card border-brand-indigo/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-ink">Negotiation Scripts — {scripts.provider}</h2>
            <button onClick={() => setScripts(null)} className="text-surface-muted hover:text-surface-ink">✕</button>
          </div>
          <div className="text-xs text-surface-muted mb-4">
            Current: ${scripts.current_monthly}/mo · Market rate: ${scripts.market_rate}/mo · Potential savings: ${Math.round((scripts.current_monthly - scripts.market_rate) * 12)}/yr
          </div>
          <div className="space-y-4">
            {scripts.scripts.map(s => (
              <div key={s.id} className="rounded-lg border border-surface-ink/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-surface-ink text-sm">{s.label}</div>
                  {s.estimated_savings > 0 && <span className="chip bg-green-100 text-green-700 text-xs">Est. save ${Math.round(s.estimated_savings)}/mo</span>}
                </div>
                <p className="text-sm text-surface-ink leading-relaxed bg-surface-sunk rounded-lg p-3 font-mono whitespace-pre-wrap">{s.script_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirmId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-raised max-w-md w-full p-6">
            <div className="text-2xl mb-3">⚠️</div>
            <h3 className="font-display font-bold text-surface-ink text-lg mb-2">Confirm Cancellation</h3>
            <p className="text-sm text-surface-muted mb-4">
              This will mark the subscription as cancelled and log your savings. You'll receive step-by-step instructions to complete the cancellation on the provider's website.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleCancel(cancelConfirmId)}
                disabled={cancelLoading}
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
              >
                {cancelLoading ? 'Processing…' : 'Yes, Cancel It'}
              </button>
              <button onClick={() => setCancelConfirmId(null)} className="btn-secondary flex-1">Go Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
