/**
 * Data Processing Agreement Page — Enhancement 36
 * Propel Stack AI, LLC
 *
 * Enterprise-grade DPA viewer with digital acceptance tracking.
 * Shows current DPA text, acceptance status, and allows signing.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DpaDocument {
  version: string;
  effective_date: string;
  text: string;
}

interface DpaStatus {
  accepted: boolean;
  current_version: string;
  accepted_version: string | null;
  accepted_at: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataProcessingAgreement() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const { data: doc, isLoading: loadingDoc } = useQuery<DpaDocument>({
    queryKey: ['dpa', 'current'],
    queryFn: () => apiRequest('/api/dpa/current'),
  });

  const { data: status, isLoading: loadingStatus } = useQuery<DpaStatus>({
    queryKey: ['dpa', 'status'],
    queryFn: () => apiRequest('/api/dpa/status'),
  });

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest('/api/dpa/accept', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dpa'] });
    },
  });

  const loading = loadingDoc || loadingStatus;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-indigo/10 flex items-center justify-center">
          <FileText size={20} className="text-brand-indigo" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-surface-ink">Data Processing Agreement</h1>
          <p className="text-sm text-surface-muted">
            GDPR &amp; enterprise compliance — Propel Stack AI, LLC
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-surface-sunk" />
      ) : (
        <>
          {/* Version info */}
          <div className="rounded-xl border border-surface-ink/10 bg-surface-raised p-4 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-surface-muted">Version</span>
              <span className="ml-2 font-semibold text-surface-ink">{doc?.version}</span>
            </div>
            <div>
              <span className="text-surface-muted">Effective</span>
              <span className="ml-2 font-semibold text-surface-ink">{doc?.effective_date}</span>
            </div>
            <div>
              <span className="text-surface-muted">Current Status</span>
              {status?.accepted ? (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600 font-semibold">
                  <CheckCircle size={13} /> Accepted
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-semibold">
                  <AlertCircle size={13} /> Not yet accepted
                </span>
              )}
            </div>
            {status?.accepted_at && (
              <div>
                <span className="text-surface-muted">Accepted on</span>
                <span className="ml-2 font-semibold text-surface-ink">
                  {new Date(status.accepted_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* DPA text */}
          <div className="rounded-xl border border-surface-ink/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="w-full flex items-center justify-between px-5 py-4 bg-surface-sunk hover:bg-surface-raised transition-colors text-left"
            >
              <span className="font-semibold text-surface-ink">View Full Agreement Text</span>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expanded && (
              <div className="px-5 py-4 bg-white dark:bg-surface-ink/5 prose prose-sm max-w-none overflow-auto max-h-[60vh]">
                <pre className="whitespace-pre-wrap text-xs font-mono text-surface-ink leading-relaxed">
                  {doc?.text}
                </pre>
              </div>
            )}
          </div>

          {/* Acceptance */}
          {status?.accepted ? (
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-5 flex items-start gap-3">
              <ShieldCheck size={20} className="text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">
                  DPA v{status.accepted_version} accepted
                </p>
                <p className="text-sm text-green-600 dark:text-green-500 mt-0.5">
                  Accepted on {status.accepted_at ? new Date(status.accepted_at).toLocaleString() : '—'}.
                  Your acceptance is securely logged for compliance purposes.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-surface-ink/10 bg-surface-raised p-5 space-y-4">
              <p className="text-sm text-surface-muted">
                By accepting this DPA, you confirm that you are authorized to enter into this agreement
                on behalf of your organization, and you agree to the terms set forth above.
              </p>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-brand-indigo"
                />
                <span className="text-sm text-surface-ink">
                  I have read and agree to the Data Processing Agreement v{doc?.version}
                </span>
              </label>

              <button
                type="button"
                disabled={!agreed || acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
                className="px-5 py-2.5 rounded-lg bg-brand-indigo text-white text-sm font-semibold
                           disabled:opacity-40 hover:bg-brand-indigo/90 transition-colors"
              >
                {acceptMutation.isPending ? 'Recording…' : 'Accept DPA'}
              </button>

              {acceptMutation.isError && (
                <p className="text-sm text-red-500">Failed to record acceptance. Please try again.</p>
              )}
            </div>
          )}

          {/* Enterprise note */}
          <div className="rounded-xl border border-surface-ink/10 bg-surface-sunk p-4 text-sm text-surface-muted">
            <strong className="text-surface-ink">Enterprise customers:</strong> Your organization's DPA
            acceptance is required before accessing enterprise features such as SSO, RBAC, and white-label
            deployments. Contact{' '}
            <a href="mailto:legal@propelstackai.com" className="text-brand-indigo hover:underline">
              legal@propelstackai.com
            </a>{' '}
            for questions or custom DPA terms.
          </div>
        </>
      )}
    </div>
  );
}
