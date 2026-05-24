import { useState } from 'react';
import { useDocuments } from '../features/documents/api';
import { DocumentCard } from '../features/documents/components/DocumentCard';
import { DocumentDetail } from '../features/documents/components/DocumentDetail';
import { Uploader } from '../features/documents/components/Uploader';
import { DOCUMENT_CATEGORIES, type DocumentCategory } from '../features/documents/types';
import { PendingExtractionsPanel } from '../features/docIntelligence/components/PendingExtractionsPanel';

const ALL = 'All' as const;
type Filter = typeof ALL | DocumentCategory;

export function DocumentVault() {
  const { data: docs = [], isLoading } = useDocuments();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = docs.filter((d) => {
    if (filter !== ALL && d.category !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.fileName?.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl text-surface-ink">Document Vault</h1>
        <p className="text-sm text-surface-muted mt-1">Store, organise, and share your important files — all encrypted at rest.</p>
      </div>

      <Uploader />

      <PendingExtractionsPanel />

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {([ALL, ...DOCUMENT_CATEGORIES] as Filter[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`chip transition-colors ${filter === c ? 'bg-brand-indigo text-white border-transparent' : 'text-surface-muted'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-surface-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-surface-muted">{docs.length === 0 ? 'No documents yet — upload one above.' : 'No documents match your search.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onOpen={() => setSelectedId(doc.id)} />
          ))}
        </div>
      )}

      {selectedId && (
        <DocumentDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
