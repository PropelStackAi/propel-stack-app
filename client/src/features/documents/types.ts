// Document Vault shared types + helpers (Session 7).

export const DOCUMENT_CATEGORIES = [
  'Identity',
  'Financial',
  'Medical',
  'Legal',
  'Property',
  'Vehicle',
  'Education',
  'Other',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const CATEGORY_HINTS: Record<DocumentCategory, string> = {
  Identity: 'passport, DL, SSN',
  Financial: 'tax returns, bank statements, pay stubs',
  Medical: 'insurance cards, vaccination records',
  Legal: 'contracts, will, POA',
  Property: 'mortgage, deed, lease',
  Vehicle: 'title, registration, insurance',
  Education: 'diplomas, transcripts',
  Other: 'anything else',
};

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png';

export interface DocumentMeta {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  expiryDate: string | null;
  tags: string[];
  aiSummary: string;
  createdAt: string;
}
export interface DocumentFull extends DocumentMeta {
  data: string; // base64
}

export type ExpiryTone = 'red' | 'amber' | 'green' | 'none';

export function expiryStatus(date: string | null): { tone: ExpiryTone; label: string } {
  if (!date) return { tone: 'none', label: 'No expiry' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${date}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { tone: 'red', label: `Expired ${-days}d ago` };
  if (days <= 7) return { tone: 'red', label: days === 0 ? 'Expires today' : `Expires in ${days}d` };
  if (days <= 30) return { tone: 'amber', label: `Expires in ${days}d` };
  return { tone: 'green', label: `Expires ${date}` };
}

export type FileKind = 'pdf' | 'image' | 'doc' | 'file';
export function fileKind(mime: string): FileKind {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('word')) return 'doc';
  return 'file';
}

export function dataUrl(doc: DocumentFull): string {
  return `data:${doc.fileType || 'application/octet-stream'};base64,${doc.data}`;
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
