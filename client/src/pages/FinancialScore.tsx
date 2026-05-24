/**
 * Enhancement 46 — Financial Life Score Sub-Engine
 * Propel Stack AI, LLC
 *
 * Composite score 0–100 from 6 weighted sub-scores.
 * Weights: Net Worth 20%, DTI 20%, Savings Rate 20%, Emergency Fund 20%, Investment 15%, Bill Payment 5%.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface SubScore {
  label: string;
  score: number;
  weight: number;
  detail: string;
}

interface FinancialScore {
  composite_score: number;
  net_worth_score: number;
  dti_score: number;
  savings_rate_score: number;
  emergency_fund_score: number;
  investment_score: number;
  bill_payment_score: number;
  net_worth: number;
  monthly_income: number;
  monthly_debt_payments: number;
  monthly_savings: number;
  emergency_fund_months: number;
  computed_at: string;
}

interface HistoryPoint {
  week_of: string;
  composite_score: number;
}

interface NetWorthBreakdown {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  assets: Array<{ id: string; asset_type: string; description: string; value: number }>;
  liabilities: Array<{ id: string; liability_type: string; description: string; balance: number }>;
}

interface CoachNote {
  note: string;
  generated_at: string;
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function scoreRingColor(score: number) {
  if (score >= 75) return '#16a34a';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function scoreLabel(score: number) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Critical';
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreRingColor(score);
  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} strokeWidth="10" stroke="#e5e7eb" fill="none" />
        <circle
          cx="70" cy="70" r={r} strokeWidth="10" stroke={color} fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</div>
        <div className="text-xs text-surface-muted">{scoreLabel(score)}</div>
      </div>
    </div>
  );
}

function SubScoreBar({ label, score, weight, detail }: SubScore) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-surface-ink">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-muted">{weight}% weight</span>
          <span className={`font-bold text-sm ${scoreColor(score)}`}>{score}</span>
        </div>
      </div>
      <div className="h-2 bg-surface-sunk rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: scoreRingColor(score) }}
        />
      </div>
      <div className="text-xs text-surface-muted">{detail}</div>
    </div>
  );
}

export function FinancialScore() {
  const qc = useQueryClient();
  const [view, setView] = useState<'score' | 'networth' | 'history' | 'coach'>('score');
  const [recalculating, setRecalculating] = useState(false);

  // Add asset form
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [assetType, setAssetType] = useState('savings');
  const [assetDesc, setAssetDesc] = useState('');
  const [assetValue, setAssetValue] = useState('');

  // Add liability form
  const [showAddLiab, setShowAddLiab] = useState(false);
  const [liabType, setLiabType] = useState('mortgage');
  const [liabDesc, setLiabDesc] = useState('');
  const [liabBalance, setLiabBalance] = useState('');
  const [liabRate, setLiabRate] = useState('');

  const { data: scoreData, refetch: refetchScore } = useQuery<FinancialScore>({
    queryKey: ['financial-score'],
    queryFn: () => apiRequest<FinancialScore>('/api/finance/score'),
  });

  const { data: history = [] } = useQuery<HistoryPoint[]>({
    queryKey: ['financial-score-history'],
    queryFn: () => apiRequest<HistoryPoint[]>('/api/finance/score/history'),
    enabled: view === 'history',
  });

  const { data: netWorth } = useQuery<NetWorthBreakdown>({
    queryKey: ['financial-net-worth'],
    queryFn: () => apiRequest<NetWorthBreakdown>('/api/finance/net-worth'),
    enabled: view === 'networth',
  });

  const { data: coachNote } = useQuery<CoachNote>({
    queryKey: ['financial-coach-note'],
    queryFn: () => apiRequest<CoachNote>('/api/finance/coach-note'),
    enabled: view === 'coach',
  });

  const addAssetMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('/api/finance/assets', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-net-worth'] });
      setShowAddAsset(false);
      setAssetDesc(''); setAssetValue('');
    },
  });

  const addLiabMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest('/api/finance/liabilities', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-net-worth'] });
      setShowAddLiab(false);
      setLiabDesc(''); setLiabBalance(''); setLiabRate('');
    },
  });

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      await apiRequest('/api/finance/score/recalculate', { method: 'POST' });
      refetchScore();
      qc.invalidateQueries({ queryKey: ['financial-score-history'] });
    } finally {
      setRecalculating(false);
    }
  }

  const subScores: SubScore[] = scoreData ? [
    { label: 'Net Worth', score: scoreData.net_worth_score, weight: 20, detail: `Net worth: ${formatCurrency(scoreData.net_worth)}` },
    { label: 'Debt-to-Income Ratio', score: scoreData.dti_score, weight: 20, detail: `Monthly debt: ${formatCurrency(scoreData.monthly_debt_payments)} of ${formatCurrency(scoreData.monthly_income)} income` },
    { label: 'Savings Rate', score: scoreData.savings_rate_score, weight: 20, detail: `Saving ${formatCurrency(scoreData.monthly_savings)}/mo` },
    { label: 'Emergency Fund', score: scoreData.emergency_fund_score, weight: 20, detail: `${scoreData.emergency_fund_months.toFixed(1)} months of expenses covered` },
    { label: 'Investment Health', score: scoreData.investment_score, weight: 15, detail: 'Based on asset diversification' },
    { label: 'Bill Payment', score: scoreData.bill_payment_score, weight: 5, detail: 'On-time payment history' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-ink">Financial Life Score</h1>
          <p className="text-surface-muted text-sm mt-1">Your comprehensive financial health score across 6 key dimensions.</p>
        </div>
        <button onClick={handleRecalculate} disabled={recalculating} className="btn-primary text-sm">
          {recalculating ? 'Calculating…' : '🔄 Recalculate'}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-sunk rounded-lg p-1 w-fit">
        {([
          { key: 'score',    label: '📊 Score' },
          { key: 'networth', label: '💰 Net Worth' },
          { key: 'history',  label: '📈 History' },
          { key: 'coach',    label: '🤖 AI Coach' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === t.key ? 'bg-white shadow-sm text-surface-ink' : 'text-surface-muted hover:text-surface-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Score Tab */}
      {view === 'score' && (
        <div className="space-y-6">
          {!scoreData ? (
            <div className="card text-center py-12 text-surface-muted">
              <div className="text-4xl mb-3">💳</div>
              <p className="font-medium text-surface-ink mb-2">No score yet</p>
              <p className="text-sm">Click Recalculate to compute your Financial Life Score from your linked accounts and manual entries.</p>
            </div>
          ) : (
            <>
              {/* Composite ring */}
              <div className="card flex flex-col sm:flex-row items-center gap-6">
                <ScoreRing score={scoreData.composite_score} />
                <div className="flex-1 text-center sm:text-left">
                  <div className="text-lg font-bold text-surface-ink">Financial Life Score</div>
                  <div className={`text-4xl font-display font-extrabold ${scoreColor(scoreData.composite_score)}`}>
                    {scoreData.composite_score}<span className="text-xl text-surface-muted">/100</span>
                  </div>
                  <div className="text-sm text-surface-muted mt-1">{scoreLabel(scoreData.composite_score)}</div>
                  {scoreData.computed_at && (
                    <div className="text-xs text-surface-muted mt-2">
                      Last updated: {new Date(scoreData.computed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                  <div className="text-center bg-surface-sunk rounded-lg px-4 py-2">
                    <div className="text-lg font-bold text-surface-ink">{formatCurrency(scoreData.net_worth)}</div>
                    <div className="text-xs text-surface-muted">Net Worth</div>
                  </div>
                  <div className="text-center bg-surface-sunk rounded-lg px-4 py-2">
                    <div className="text-lg font-bold text-surface-ink">{scoreData.emergency_fund_months.toFixed(1)}mo</div>
                    <div className="text-xs text-surface-muted">Emergency Fund</div>
                  </div>
                </div>
              </div>

              {/* Sub-score breakdown */}
              <div className="card space-y-4">
                <h2 className="font-semibold text-surface-ink">Score Breakdown</h2>
                {subScores.map(s => <SubScoreBar key={s.label} {...s} />)}
              </div>

              {/* Milestone badges */}
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { threshold: 70, label: 'Financially Stable', icon: '🏅' },
                  { threshold: 80, label: 'Financially Healthy', icon: '🥈' },
                  { threshold: 90, label: 'Financially Excellent', icon: '🥇' },
                ].map(m => (
                  <div key={m.threshold} className={`card text-center transition-all ${scoreData.composite_score >= m.threshold ? 'border-amber-300 bg-amber-50' : 'opacity-40'}`}>
                    <div className="text-3xl mb-1">{m.icon}</div>
                    <div className="text-xs font-semibold text-surface-ink">{m.label}</div>
                    <div className="text-xs text-surface-muted mt-0.5">Score ≥ {m.threshold}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Net Worth Tab */}
      {view === 'networth' && (
        <div className="space-y-4">
          {netWorth && (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="card text-center">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(netWorth.total_assets)}</div>
                <div className="text-xs text-surface-muted">Total Assets</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(netWorth.total_liabilities)}</div>
                <div className="text-xs text-surface-muted">Total Liabilities</div>
              </div>
              <div className="card text-center">
                <div className={`text-2xl font-bold ${netWorth.net_worth >= 0 ? 'text-brand-indigo' : 'text-red-600'}`}>
                  {formatCurrency(netWorth.net_worth)}
                </div>
                <div className="text-xs text-surface-muted">Net Worth</div>
              </div>
            </div>
          )}

          {/* Assets */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-surface-ink">Assets</h2>
              <button onClick={() => setShowAddAsset(s => !s)} className="btn-primary text-xs py-1.5">+ Add Asset</button>
            </div>

            {showAddAsset && (
              <div className="rounded-lg bg-surface-sunk p-4 mb-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Asset Type</label>
                    <select className="input" value={assetType} onChange={e => setAssetType(e.target.value)}>
                      {['checking', 'savings', 'investment', 'retirement_401k', 'retirement_ira', 'real_estate', 'vehicle', 'crypto', 'other'].map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Value ($)</label>
                    <input className="input" type="number" min="0" value={assetValue} onChange={e => setAssetValue(e.target.value)} placeholder="50000" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Description</label>
                    <input className="input" value={assetDesc} onChange={e => setAssetDesc(e.target.value)} placeholder="e.g. Chase savings account" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addAssetMutation.mutate({ asset_type: assetType, description: assetDesc, value: Number(assetValue) })}
                    disabled={!assetValue || !assetDesc || addAssetMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    {addAssetMutation.isPending ? 'Adding…' : 'Add Asset'}
                  </button>
                  <button onClick={() => setShowAddAsset(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {netWorth && netWorth.assets.length > 0 ? (
              <div className="space-y-2">
                {netWorth.assets.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-sunk">
                    <div className="flex-1">
                      <div className="font-medium text-surface-ink text-sm">{a.description}</div>
                      <div className="text-xs text-surface-muted capitalize">{a.asset_type.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="font-semibold text-green-600 text-sm">{formatCurrency(a.value)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-muted text-center py-4">No assets added yet.</p>
            )}
          </div>

          {/* Liabilities */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-surface-ink">Liabilities</h2>
              <button onClick={() => setShowAddLiab(s => !s)} className="btn-primary text-xs py-1.5">+ Add Liability</button>
            </div>

            {showAddLiab && (
              <div className="rounded-lg bg-surface-sunk p-4 mb-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Liability Type</label>
                    <select className="input" value={liabType} onChange={e => setLiabType(e.target.value)}>
                      {['mortgage', 'auto_loan', 'student_loan', 'credit_card', 'personal_loan', 'medical', 'other'].map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Balance ($)</label>
                    <input className="input" type="number" min="0" value={liabBalance} onChange={e => setLiabBalance(e.target.value)} placeholder="25000" />
                  </div>
                  <div>
                    <label className="label">Interest Rate (%)</label>
                    <input className="input" type="number" step="0.01" min="0" value={liabRate} onChange={e => setLiabRate(e.target.value)} placeholder="6.5" />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <input className="input" value={liabDesc} onChange={e => setLiabDesc(e.target.value)} placeholder="e.g. Car loan" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addLiabMutation.mutate({ liability_type: liabType, description: liabDesc, balance: Number(liabBalance), interest_rate: Number(liabRate) })}
                    disabled={!liabBalance || !liabDesc || addLiabMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    {addLiabMutation.isPending ? 'Adding…' : 'Add Liability'}
                  </button>
                  <button onClick={() => setShowAddLiab(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {netWorth && netWorth.liabilities.length > 0 ? (
              <div className="space-y-2">
                {netWorth.liabilities.map(l => (
                  <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-sunk">
                    <div className="flex-1">
                      <div className="font-medium text-surface-ink text-sm">{l.description}</div>
                      <div className="text-xs text-surface-muted capitalize">{l.liability_type.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="font-semibold text-red-600 text-sm">{formatCurrency(l.balance)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-muted text-center py-4">No liabilities added yet.</p>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {view === 'history' && (
        <div className="card">
          <h2 className="font-semibold text-surface-ink mb-4">52-Week Score History</h2>
          {history.length === 0 ? (
            <div className="text-center py-8 text-surface-muted">
              <div className="text-4xl mb-2">📈</div>
              <p>No history yet. Recalculate your score weekly to build a trend.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...history].reverse().map((h, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-sunk">
                  <div className="text-xs text-surface-muted w-24">
                    {new Date(h.week_of).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex-1 h-2 bg-surface-ink/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${h.composite_score}%`, backgroundColor: scoreRingColor(h.composite_score) }} />
                  </div>
                  <div className={`text-sm font-bold w-8 text-right ${scoreColor(h.composite_score)}`}>{h.composite_score}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coach Tab */}
      {view === 'coach' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-surface-ink">🤖 AI Financial Coach</h2>
          <p className="text-sm text-surface-muted">Personalized financial guidance based on your score and goals.</p>
          {!coachNote ? (
            <div className="text-center py-8 text-surface-muted">Loading coach note…</div>
          ) : (
            <>
              <div className="rounded-lg bg-brand-indigo/5 border border-brand-indigo/20 p-4 text-sm text-surface-ink leading-relaxed whitespace-pre-wrap">
                {coachNote.note}
              </div>
              <div className="text-xs text-surface-muted">
                Generated: {new Date(coachNote.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg bg-surface-sunk border border-surface-ink/[0.06] px-4 py-3 text-xs text-surface-muted">
        ⚠️ <strong>Informational only.</strong> The Financial Life Score is an educational tool and does not constitute financial advice. Propel Stack AI, LLC is not a registered investment adviser. Consult a qualified financial professional for personalized guidance.
      </div>
    </div>
  );
}
