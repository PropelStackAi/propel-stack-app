/**
 * Enhancement 40 — Consumer Legal Hub
 * Propel Stack AI, LLC
 *
 * MANDATORY disclaimer on EVERY AI response — cannot be dismissed or hidden.
 * Disclaimer gate: PSAI-LEGAL-DISC-v1.0 must be acknowledged before access.
 * NOT a law firm. NOT legal advice. General legal information only.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

const DISCLAIMER_VERSION = 'PSAI-LEGAL-DISC-v1.0';
const LEGAL_DISCLAIMER = 'This is general legal information, not legal advice. Consult a licensed attorney for advice specific to your situation.';

interface DisclaimerStatus {
  acknowledged: boolean;
  version: string;
}

interface LegalDoc {
  id: string;
  document_name: string;
  document_type: string;
  ai_summary: string;
  created_at: string;
}

interface ReviewResult {
  summary: string;
  risks: string[];
  missing_protections: string[];
  key_terms: string[];
}

export function LegalHub() {
  const qc = useQueryClient();
  const [view, setView] = useState<'chat' | 'demand' | 'dispute' | 'claims' | 'review' | 'docs'>('chat');
  const [question, setQuestion] = useState('');
  const [chatResult, setChatResult] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [situation, setSituation] = useState('');
  const [amountOwed, setAmountOwed] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('14');
  const [demandResult, setDemandResult] = useState('');
  const [demandLoading, setDemandLoading] = useState(false);
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeType, setDisputeType] = useState('general');
  const [disputeResult, setDisputeResult] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [state, setState] = useState('');
  const [claimsResult, setClaimsResult] = useState('');
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [docText, setDocText] = useState('');
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('contract');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const { data: disclaimerStatus } = useQuery<DisclaimerStatus>({
    queryKey: ['legal-disclaimer'],
    queryFn: () => apiRequest<DisclaimerStatus>('/api/legal/disclaimer'),
  });

  const { data: docs = [] } = useQuery<LegalDoc[]>({
    queryKey: ['legal-docs'],
    queryFn: () => apiRequest<LegalDoc[]>('/api/legal/documents'),
    enabled: disclaimerStatus?.acknowledged === true,
  });

  const ackMutation = useMutation({
    mutationFn: () => apiRequest('/api/legal/disclaimer', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal-disclaimer'] }),
  });

  // Disclaimer gate
  if (!disclaimerStatus) {
    return (
      <div className="max-w-lg mx-auto mt-12 card text-center">
        <div className="text-3xl mb-3">⚖️</div>
        <p className="text-sm text-surface-muted">Loading…</p>
      </div>
    );
  }

  if (!disclaimerStatus.acknowledged) {
    return (
      <div className="max-w-xl mx-auto mt-8">
        <div className="card border-amber-300">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">⚖️</div>
            <h1 className="text-xl font-display font-bold text-surface-ink">Consumer Legal Hub</h1>
            <p className="text-sm text-surface-muted mt-1">Before you continue, please read and acknowledge the following.</p>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-6 space-y-3">
            <p className="font-semibold text-amber-900 text-sm">Important Disclaimer</p>
            <p className="text-sm text-amber-800">{LEGAL_DISCLAIMER}</p>
            <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
              <li>Propel Stack AI is <strong>not a law firm</strong></li>
              <li>This tool provides <strong>general information only</strong>, not legal advice</li>
              <li>Do not rely on this for specific legal decisions without consulting an attorney</li>
              <li>In a legal emergency, contact an attorney or your local legal aid immediately</li>
            </ul>
            <p className="text-xs text-amber-700 font-mono">{DISCLAIMER_VERSION}</p>
          </div>

          <button
            onClick={() => ackMutation.mutate()}
            disabled={ackMutation.isPending}
            className="btn-primary w-full"
          >
            {ackMutation.isPending ? 'Acknowledging…' : 'I Understand — Continue'}
          </button>
        </div>
      </div>
    );
  }

  async function handleChat() {
    if (!question.trim()) return;
    setChatLoading(true);
    setChatResult('');
    try {
      const r = await apiRequest<{ answer: string }>('/api/legal/chat', {
        method: 'POST',
        body: JSON.stringify({ question }),
      });
      setChatResult(r.answer);
    } catch {
      setChatResult('Error — please try again.');
    } finally {
      setChatLoading(false);
    }
  }

  async function handleDemandLetter() {
    if (!situation.trim()) return;
    setDemandLoading(true);
    setDemandResult('');
    try {
      const r = await apiRequest<{ letter: string }>('/api/legal/demand-letter', {
        method: 'POST',
        body: JSON.stringify({
          situation,
          amount_owed: amountOwed ? Number(amountOwed) : undefined,
          recipient_name: recipientName || undefined,
          deadline_days: Number(deadlineDays),
        }),
      });
      setDemandResult(r.letter);
    } catch {
      setDemandResult('Error generating letter.');
    } finally {
      setDemandLoading(false);
    }
  }

  async function handleDispute() {
    if (!disputeDesc.trim()) return;
    setDisputeLoading(true);
    setDisputeResult('');
    try {
      const r = await apiRequest<{ response: string }>('/api/legal/dispute-response', {
        method: 'POST',
        body: JSON.stringify({ description: disputeDesc, dispute_type: disputeType }),
      });
      setDisputeResult(r.response);
    } catch {
      setDisputeResult('Error generating response.');
    } finally {
      setDisputeLoading(false);
    }
  }

  async function handleSmallClaims() {
    if (!state.trim()) return;
    setClaimsLoading(true);
    setClaimsResult('');
    try {
      const r = await apiRequest<{ guide: string }>(`/api/legal/small-claims/${encodeURIComponent(state)}`);
      setClaimsResult(r.guide);
    } catch {
      setClaimsResult('Error loading guide.');
    } finally {
      setClaimsLoading(false);
    }
  }

  async function handleReview() {
    if (!docText.trim()) return;
    setReviewLoading(true);
    setReviewResult(null);
    try {
      const r = await apiRequest<{ review: ReviewResult }>('/api/legal/review', {
        method: 'POST',
        body: JSON.stringify({ document_text: docText, document_name: docName || 'Document', document_type: docType }),
      });
      setReviewResult(r.review);
      qc.invalidateQueries({ queryKey: ['legal-docs'] });
    } catch {
      // silent
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-surface-ink">Consumer Legal Hub</h1>
        <p className="text-surface-muted text-sm mt-1">General legal information, demand letters, dispute responses, and document review.</p>
      </div>

      {/* Persistent disclaimer banner */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800 font-medium">
        ⚖️ {LEGAL_DISCLAIMER}
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-surface-sunk rounded-lg p-1">
        {[
          { key: 'chat', label: '💬 Q&A' },
          { key: 'demand', label: '📩 Demand Letter' },
          { key: 'dispute', label: '📋 Dispute Response' },
          { key: 'claims', label: '🏛 Small Claims' },
          { key: 'review', label: '🔍 Doc Review' },
          { key: 'docs', label: '📁 My Docs' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key as typeof view)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === t.key ? 'bg-white shadow-sm text-surface-ink' : 'text-surface-muted hover:text-surface-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Q&A Chat */}
      {view === 'chat' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-surface-ink">Legal Q&A — Know Your Rights</h2>
          <p className="text-xs text-surface-muted">Covers: tenant rights, employee rights, consumer protection, FDCPA, small claims, contract basics.</p>
          <div className="flex gap-2">
            <textarea
              className="input flex-1"
              rows={3}
              placeholder="e.g. My landlord hasn't returned my security deposit after 30 days. What are my rights?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
          </div>
          <button onClick={handleChat} disabled={!question.trim() || chatLoading} className="btn-primary text-sm">
            {chatLoading ? 'Researching…' : 'Ask'}
          </button>
          {chatResult && (
            <div className="rounded-lg bg-surface-sunk border border-surface-ink/10 p-4 text-sm text-surface-ink leading-relaxed whitespace-pre-wrap">
              {chatResult}
            </div>
          )}
        </div>
      )}

      {/* Demand Letter */}
      {view === 'demand' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-surface-ink">Demand Letter Generator</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className="label">Situation *</label><textarea className="input" rows={3} placeholder="Describe the situation and what you are owed…" value={situation} onChange={e => setSituation(e.target.value)} /></div>
            <div><label className="label">Amount Owed ($)</label><input className="input" type="number" step="0.01" value={amountOwed} onChange={e => setAmountOwed(e.target.value)} placeholder="500" /></div>
            <div><label className="label">Recipient Name</label><input className="input" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Business or person name" /></div>
            <div><label className="label">Response Deadline (days)</label><input className="input" type="number" min="1" value={deadlineDays} onChange={e => setDeadlineDays(e.target.value)} /></div>
          </div>
          <button onClick={handleDemandLetter} disabled={!situation.trim() || demandLoading} className="btn-primary text-sm">
            {demandLoading ? 'Generating…' : 'Generate Letter'}
          </button>
          {demandResult && (
            <div className="rounded-lg bg-surface-sunk border border-surface-ink/10 p-4 text-sm text-surface-ink leading-relaxed font-mono whitespace-pre-wrap">
              {demandResult}
            </div>
          )}
        </div>
      )}

      {/* Dispute Response */}
      {view === 'dispute' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-surface-ink">Dispute Response Generator</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Dispute Type</label>
              <select className="input" value={disputeType} onChange={e => setDisputeType(e.target.value)}>
                {['general','debt_collection','credit_report','billing','landlord','employer','consumer'].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Describe the Dispute *</label>
              <textarea className="input" rows={4} placeholder="Describe the dispute — what happened, what was claimed, what you dispute…" value={disputeDesc} onChange={e => setDisputeDesc(e.target.value)} />
            </div>
          </div>
          <button onClick={handleDispute} disabled={!disputeDesc.trim() || disputeLoading} className="btn-primary text-sm">
            {disputeLoading ? 'Generating…' : 'Generate Response'}
          </button>
          {disputeResult && (
            <div className="rounded-lg bg-surface-sunk border border-surface-ink/10 p-4 text-sm text-surface-ink leading-relaxed whitespace-pre-wrap">
              {disputeResult}
            </div>
          )}
        </div>
      )}

      {/* Small Claims Guide */}
      {view === 'claims' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-surface-ink">Small Claims Court Guide</h2>
          <div className="flex gap-2">
            <input
              className="input w-32 uppercase"
              placeholder="State (e.g. CA)"
              value={state}
              onChange={e => setState(e.target.value.toUpperCase())}
              maxLength={2}
            />
            <button onClick={handleSmallClaims} disabled={state.length < 2 || claimsLoading} className="btn-primary text-sm">
              {claimsLoading ? 'Loading…' : 'Get Guide'}
            </button>
          </div>
          {claimsResult && (
            <div className="rounded-lg bg-surface-sunk border border-surface-ink/10 p-4 text-sm text-surface-ink leading-relaxed whitespace-pre-wrap">
              {claimsResult}
            </div>
          )}
        </div>
      )}

      {/* Document Review */}
      {view === 'review' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-surface-ink">AI Document Review</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Document Name</label><input className="input" value={docName} onChange={e => setDocName(e.target.value)} placeholder="My Lease Agreement" /></div>
            <div>
              <label className="label">Document Type</label>
              <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
                {['contract','lease','employment','NDA','purchase','service','other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Paste Document Text *</label>
              <textarea className="input" rows={8} placeholder="Paste the document text here (first 3,000 characters will be analyzed)…" value={docText} onChange={e => setDocText(e.target.value)} />
            </div>
          </div>
          <button onClick={handleReview} disabled={!docText.trim() || reviewLoading} className="btn-primary text-sm">
            {reviewLoading ? 'Reviewing…' : 'Analyze Document'}
          </button>

          {reviewResult && (
            <div className="space-y-4">
              {reviewResult.summary && (
                <div className="rounded-lg bg-surface-sunk p-4">
                  <div className="text-xs font-semibold text-surface-muted uppercase tracking-wide mb-2">Summary</div>
                  <p className="text-sm text-surface-ink">{reviewResult.summary}</p>
                </div>
              )}
              {reviewResult.risks?.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <div className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-2">⚠ Risks & Unfavorable Clauses</div>
                  <ul className="space-y-1">
                    {reviewResult.risks.map((r, i) => <li key={i} className="text-sm text-red-700 flex gap-2"><span>•</span>{r}</li>)}
                  </ul>
                </div>
              )}
              {reviewResult.missing_protections?.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Missing Protections</div>
                  <ul className="space-y-1">
                    {reviewResult.missing_protections.map((p, i) => <li key={i} className="text-sm text-amber-700 flex gap-2"><span>•</span>{p}</li>)}
                  </ul>
                </div>
              )}
              {reviewResult.key_terms?.length > 0 && (
                <div className="rounded-lg bg-brand-indigo/5 border border-brand-indigo/20 p-4">
                  <div className="text-xs font-semibold text-brand-indigo uppercase tracking-wide mb-2">Key Terms</div>
                  <ul className="space-y-1">
                    {reviewResult.key_terms.map((t, i) => <li key={i} className="text-sm text-surface-ink flex gap-2"><span>•</span>{t}</li>)}
                  </ul>
                </div>
              )}
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {LEGAL_DISCLAIMER}
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Docs */}
      {view === 'docs' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-surface-ink">Reviewed Documents</h2>
          {docs.length === 0 ? (
            <div className="card text-center py-8 text-surface-muted">No reviewed documents yet. Use the Doc Review tab to analyze a document.</div>
          ) : (
            docs.map(doc => (
              <div key={doc.id} className="card flex items-start gap-3">
                <div className="text-2xl">📄</div>
                <div className="flex-1">
                  <div className="font-medium text-surface-ink">{doc.document_name}</div>
                  <div className="text-xs text-surface-muted capitalize">{doc.document_type} · {new Date(doc.created_at).toLocaleDateString()}</div>
                  {doc.ai_summary && <div className="text-xs text-surface-muted mt-1 line-clamp-2">{doc.ai_summary}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
