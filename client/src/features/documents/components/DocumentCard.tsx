import { fileKind, humanSize, type DocumentMeta, type FileKind } from '../types';
import { ExpiryChip } from './ExpiryChip';

const KIND_STYLE: Record<FileKind, { label: string; cls: string }> = {
  pdf: { label: 'PDF', cls: 'bg-red-500/10 text-red-600' },
  image: { label: 'IMG', cls: 'bg-brand-teal/10 text-brand-teal' },
  doc: { label: 'DOC', cls: 'bg-brand-indigo/10 text-brand-indigo' },
  file: { label: 'FILE', cls: 'bg-surface-sunk text-surface-muted' },
};

export function DocumentCard({ doc, onOpen }: { doc: DocumentMeta; onOpen: () => void }) {
  const kind = KIND_STYLE[fileKind(doc.fileType)];
  return (
    <button type="button" onClick={onOpen} className="card text-left hover:shadow-raised transition-shadow flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`grid place-items-center w-12 h-12 rounded-lg font-display font-bold text-xs ${kind.cls}`} aria-hidden>
          {kind.label}
        </span>
        <span className="chip text-surface-muted">{doc.category}</span>
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm text-surface-ink truncate">{doc.title}</div>
        <div className="text-xs text-surface-muted truncate">{doc.fileName || '—'} · {humanSize(doc.fileSize)}</div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <ExpiryChip date={doc.expiryDate} />
        {doc.aiSummary && <span className="chip text-surface-muted">AI summary</span>}
      </div>
    </button>
  );
}
