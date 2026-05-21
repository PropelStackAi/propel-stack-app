import crypto from 'node:crypto';
import { z } from 'zod';

/** Document Vault domain helpers (Session 7). Local base64 fallback until Session 8 (Supabase). */

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

/** Capped well under the 10mb JSON body limit (base64 inflates ~1.34x). Raised in Session 8. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

export function newId(): string {
  return crypto.randomUUID();
}
export function shareToken(): string {
  return crypto.randomBytes(18).toString('hex');
}

const isoDateOrNull = z
  .string()
  .trim()
  .max(40)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export const uploadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(DOCUMENT_CATEGORIES).default('Other'),
  fileName: z.string().trim().max(260).default(''),
  fileType: z.string().trim().max(120).default(''),
  fileSize: z.number().int().min(0).max(MAX_FILE_BYTES),
  data: z.string().min(1).max(7_500_000), // base64 (~5MB raw + margin)
  expiryDate: isoDateOrNull,
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
});

export const updateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(DOCUMENT_CATEGORIES).default('Other'),
  expiryDate: isoDateOrNull,
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
});

function parseTags(json: unknown): string[] {
  try {
    const v = JSON.parse(String(json));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Metadata only (no base64 blob) -- used for list responses. */
export function rowToDocumentMeta(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    category: r.category as string,
    fileName: r.file_name as string,
    fileType: r.file_type as string,
    fileSize: Number(r.file_size),
    expiryDate: (r.expiry_date as string | null) ?? null,
    tags: parseTags(r.tags),
    aiSummary: r.ai_summary as string,
    createdAt: r.created_at as string,
  };
}

/** Full document including the base64 data -- used for detail/view. */
export function rowToDocumentFull(r: Record<string, unknown>) {
  return { ...rowToDocumentMeta(r), data: r.data as string };
}
