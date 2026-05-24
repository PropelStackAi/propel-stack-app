import { useEffect, useState } from 'react';
import { useDeleteDocument, useDocument, useShareDocument, useSummarize, useUpdateDocument } from '../api';
import { DOCUMENT_CATEGORIES, dataUrl, fileKind, humanSize, type DocumentCategory } from '../types';
import { useAnalyzeDocument, usePendingExtractions } from '../../docIntelligence/api';
import { DOC_TYPE_META } from '../../docIntelligence/types';

const inputCls = 'w-full rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none';

export function DocumentDetail({ id, onClose, onDeleted }: { id: string; onClose: () => void; onDeleted: () => void }) {
  const { data: doc, isLoading } = useDocument(id);
  const update = useUpdateDocument();
  const del = useDeleteDocument();
  const summarize = useSummarize(id);
  const share = useShareDocument(id);
  const analyze = useAnalyzeDocument();
  const { data: pending = [] } = usePendingExtractions();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Other');
  const [expiry, setExpiry] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setCategory((doc.category as DocumentCategory) ?? 'Other');
      setExpiry(doc.expiryDate ?? '');
    }
  }, [doc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function save() {
    update.mutate({ id, body: { title: title.trim() || 'Untitled', category, expiryDate: expiry || null, tags: doc?.tags ?? [] } });
  }
  function createShare() {
    share.mutate(undefined, { onSuccess: (r) => setShareUrl(`${window.location.origin}${r.path}`) });
  }
  async function copyShare() {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* no clipboard */ }
  }

  const kind = doc ? fileKind(doc.fileType) : 'file';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-surface-ink/40 backdrop-blur-sm p-4" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Document">
      <div className="card my-8 w-full max-w-3xl" onMouseDown={(e) => e.stopPropagation()}>
        {isLoading || !doc ? (
          <p className="text-sm text-surface-muted">Loading…</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="font-display font-extrabold text-xl text-surface-ink truncate">{doc.title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="text-surface-muted hover:text-surface-ink">✕</button>
            </div>

            <div className="rounded-xl bg-surface-sunk/50 overflow-hidden mb-4 grid place-items-center" style={{ minHeight: '12rem' }}>
              {kind === 'image' ? (
                <img src={dataUrl(doc)} alt={doc.title} className="max-h-96 object-contain" />
              ) : kind === 'pdf' ? (
                <iframe title={doc.title} src={dataUrl(doc)} className="w-full h-96" />
              ) : (
                <div className="text-center p-8">
                  <div className="font-display font-bold text-surface-muted">No inline preview</div>
                  <a href={dataUrl(doc)} download={doc.fileName} className="btn-secondary !py-1.5 !text-xs mt-3 inline-flex">Download to view</a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)} aria-label="Category">
                {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className={inputCls} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-label="Expiry date" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-surface-muted">
              <span>{doc.fileName} · {humanSize(doc.fileSize)}</span>
              <button type="button" onClick={save} disabled={update.isPending} className="btn-secondary !py-1.5 !text-xs">{update.isPending ? 'Saving…' : 'Save changes'}</button>
            </div>

            <div className="card mt-4 bg-surface-sunk/40">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-bold text-sm text-surface-ink">AI summary</h3>
                <button type="button" onClick={() => summarize.mutate()} disabled={summarize.isPending} className="btn-secondary !py-1.5 !text-xs">
                  {summarize.isPending ? 'Summarizing…' : doc.aiSummary ? 'Re-summarize' : 'Summarize with AI'}
                </button>
              </div>
              {doc.aiSummary ? <p className="text-sm text-surface-ink mt-2">{doc.aiSummary}</p> : <p className="text-sm text-surface-muted mt-2">No summary yet.</p>}
              {summarize.data?.stub && <p className="text-[11px] text-surface-muted mt-1">Demo summary — real PDF analysis arrives with provider wiring.</p>}
            </div>

            {/* Smart Document Intelligence */}
            {(() => {
              const existing = pending.find((e) => e.vaultFileId === id);
              const extractionDone = existing && (existing.confirmedAt || existing.dismissedAt);
              return (
                <div className="card mt-4 bg-surface-sunk/40">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-sm text-surface-ink">✨ Smart Extraction</h3>
                      <p className="text-xs text-surface-muted mt-0.5">
                        AI reads the document, extracts key fields, and populates the right hub.
                      </p>
                    </div>
                    {!existing && (
                      <button
                        type="button"
                        onClick={() => analyze.mutate(id)}
                        disabled={analyze.isPending}
                        className="btn-secondary !py-1.5 !text-xs flex-shrink-0"
                      >
                        {analyze.isPending ? 'Analyzing…' : 'Extract with AI'}
                      </button>
                    )}
                  </div>
                  {analyze.isSuccess && !existing && (
                    <p className="text-xs text-green-600 mt-2">✓ Extraction complete — review it in the panel above the document list.</p>
                  )}
                  {analyze.isError && (
                    <p className="text-xs text-red-500 mt-2">Extraction failed. Please try again.</p>
                  )}
                  {existing && !extractionDone && (
                    <div className="mt-2 rounded-lg bg-brand-indigo/[0.06] px-3 py-2">
                      <p className="text-xs text-brand-indigo font-semibold">
                        {DOC_TYPE_META[existing.docType].emoji} {DOC_TYPE_META[existing.docType].label} extraction pending review
                      </p>
                      <p className="text-[10px] text-surface-muted mt-0.5">Confirm or dismiss in the review panel at the top of the vault.</p>
                    </div>
                  )}
                  {existing && existing.confirmedAt && (
                    <p className="text-xs text-green-600 mt-2">✓ Data extracted and saved to {DOC_TYPE_META[existing.docType].hub}.</p>
                  )}
                  <p className="text-[10px] text-surface-muted mt-3">
                    🔒 Account numbers and SSNs are masked before AI analysis. Nothing is saved until you confirm.
                  </p>
                </div>
              );
            })()}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a href={dataUrl(doc)} download={doc.fileName} className="btn-secondary !py-1.5 !text-xs">Download</a>
              <button type="button" onClick={createShare} disabled={share.isPending} className="btn-secondary !py-1.5 !text-xs">{share.isPending ? 'Creating…' : 'Share (24h link)'}</button>
              {confirming ? (
                <span className="flex items-center gap-1 ml-auto">
                  <button type="button" onClick={() => del.mutate(id, { onSuccess: onDeleted })} className="btn-accent !py-1.5 !px-3 !text-xs bg-red-600">Confirm delete</button>
                  <button type="button" onClick={() => setConfirming(false)} className="btn-secondary !py-1.5 !px-3 !text-xs">No</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="text-xs text-surface-muted hover:text-red-600 ml-auto">Delete</button>
              )}
            </div>

            {shareUrl && (
              <div className="mt-3 rounded-lg bg-brand-indigo/[0.06] p-3 text-xs">
                <p className="text-surface-muted mb-1">Anyone with this link can view the file for 24 hours:</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={shareUrl} className="flex-1 rounded border border-surface-ink/10 bg-surface-raised px-2 py-1 font-mono text-[11px]" />
                  <button type="button" onClick={copyShare} className="btn-secondary !py-1 !px-2 !text-xs">{copied ? 'Copied' : 'Copy'}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
