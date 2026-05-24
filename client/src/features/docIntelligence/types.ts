// ─── Smart Document Intelligence Types ───────────────────────────────────────
// Enhancement 23 — Propel Stack AI, LLC

export type DocExtractionType =
  | 'insurance_policy'
  | 'lease_agreement'
  | 'vehicle_service'
  | 'medical_lab'
  | 'warranty_card'
  | 'prescription'
  | 'bill_invoice'
  | 'contract'
  | 'unknown';

export interface DocExtraction {
  id: string;
  userId: string;
  vaultFileId: string;
  docType: DocExtractionType;
  fields: Record<string, unknown>;
  confidence: number;
  confirmedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  // Joined from documents table
  docTitle: string | null;
  docCategory: string | null;
  docFileName: string | null;
}

export const DOC_TYPE_META: Record<DocExtractionType, { label: string; emoji: string; hub: string }> = {
  insurance_policy: { label: 'Insurance Policy',    emoji: '🏠', hub: 'Insurance Vault'     },
  lease_agreement:  { label: 'Lease Agreement',     emoji: '🔑', hub: 'Rental Manager'      },
  vehicle_service:  { label: 'Vehicle Service',     emoji: '🚗', hub: 'Vehicle Log'          },
  medical_lab:      { label: 'Medical Lab Results', emoji: '🔬', hub: 'Your Private Record'  },
  warranty_card:    { label: 'Warranty / Receipt',  emoji: '📦', hub: 'Appliance Tracker'    },
  prescription:     { label: 'Prescription',        emoji: '💊', hub: 'Your Private Record'  },
  bill_invoice:     { label: 'Bill / Invoice',      emoji: '📄', hub: 'Bill Tracker'         },
  contract:         { label: 'Contract',            emoji: '📋', hub: 'Document Vault'       },
  unknown:          { label: 'Unknown Document',    emoji: '❓', hub: 'Saved for review'     },
};

export function confidenceLabel(score: number): { label: string; colorClass: string } {
  if (score >= 0.75) return { label: 'High confidence',                    colorClass: 'text-green-600' };
  if (score >= 0.45) return { label: 'Medium confidence — review fields',  colorClass: 'text-yellow-600' };
  return               { label: 'Low confidence — review carefully',       colorClass: 'text-red-500' };
}

export function formatFieldKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
