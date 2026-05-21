import { useRef, useState } from 'react';
import { useUploadDocument } from '../api';
import { ACCEPT_ATTR, DOCUMENT_CATEGORIES, MAX_FILE_BYTES, humanSize, type DocumentCategory } from '../types';

const inputCls = 'w-full rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none';

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}

export function Uploader() {
  const upload = useUploadDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Other');
  const [expiry, setExpiry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function choose(f: File | undefined) {
    if (!f) return;
    setError(null);
    if (f.size > MAX_FILE_BYTES) {
      setError(`File is ${humanSize(f.size)}; the local store caps at ${humanSize(MAX_FILE_BYTES)} (raised in Session 8).`);
      return;
    }
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, ''));
    setCategory('Other');
    setExpiry('');
  }

  async function save() {
    if (!file) return;
    try {
      const data = await readBase64(file);
      upload.mutate(
        {
          title: title.trim() || file.name,
          category,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          data,
          expiryDate: expiry || null,
          tags: [],
        },
        {
          onSuccess: () => setFile(null),
          onError: (e) => setError(e instanceof Error ? e.message : 'Upload failed'),
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file');
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-brand-indigo bg-brand-indigo/[0.04]' : 'border-surface-ink/15'}`}
      >
        <p className="text-sm text-surface-muted">Drag a file here, or</p>
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary !py-2 !text-xs mt-2">Choose file</button>
        <p className="text-[11px] text-surface-muted mt-2">PDF, JPG, PNG, DOCX · up to {humanSize(MAX_FILE_BYTES)}</p>
        <input ref={fileRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {file && (
        <div className="card mt-3 space-y-2">
          <div className="text-sm font-semibold text-surface-ink truncate">{file.name} <span className="text-surface-muted font-normal">· {humanSize(file.size)}</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)} aria-label="Category">
              {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className={inputCls} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-label="Expiry date" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFile(null)} className="btn-secondary !py-1.5 !text-xs">Cancel</button>
            <button type="button" onClick={save} disabled={upload.isPending} className="btn-primary !py-1.5 !text-xs disabled:opacity-60">
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
