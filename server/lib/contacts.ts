import crypto from 'node:crypto';
import { z } from 'zod';

/**
 * Personal CRM domain helpers (Session 2).
 * Pure functions only -- no DB access here. Routes own the SQLite calls (synchronous).
 */

export const CONTACT_CATEGORIES = [
  'Personal',
  'Professional',
  'Service/Trade',
  'Medical',
  'Legal',
  'Financial',
  'Emergency',
] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const CONTACT_TYPES = ['personal', 'service'] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const INTERACTION_TYPES = ['call', 'email', 'meeting', 'note', 'other'] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export interface LabeledValue {
  label: string;
  value: string;
}

export interface Contact {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  phones: LabeledValue[];
  emails: LabeledValue[];
  address: string;
  website: string;
  notes: string;
  category: ContactCategory;
  contactType: ContactType;
  tags: string[];
  birthday: string | null;
  lastContact: string | null;
  nextFollowUp: string | null;
  relationshipScore: number;
  howMet: string;
  photo: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInteraction {
  id: string;
  contactId: string;
  userId: string;
  type: InteractionType;
  occurredAt: string;
  notes: string;
  outcome: string;
  createdAt: string;
}

// ---- Validation schemas ----

const labeledValue = z.object({
  label: z.string().trim().max(40).default(''),
  value: z.string().trim().min(1).max(200),
});

const isoDateOrNull = z
  .string()
  .trim()
  .max(40)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export const contactInputSchema = z.object({
  firstName: z.string().trim().max(120).default(''),
  lastName: z.string().trim().max(120).default(''),
  company: z.string().trim().max(160).default(''),
  title: z.string().trim().max(160).default(''),
  phones: z.array(labeledValue).max(10).default([]),
  emails: z.array(labeledValue).max(10).default([]),
  address: z.string().trim().max(400).default(''),
  website: z.string().trim().max(300).default(''),
  notes: z.string().max(5000).default(''),
  category: z.enum(CONTACT_CATEGORIES).default('Personal'),
  contactType: z.enum(CONTACT_TYPES).default('personal'),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  birthday: isoDateOrNull,
  lastContact: isoDateOrNull,
  nextFollowUp: isoDateOrNull,
  relationshipScore: z.number().int().min(1).max(5).default(3),
  howMet: z.string().trim().max(200).default(''),
  photo: z.string().max(3_000_000).default(''), // base64 data URL allowed (<= ~3MB)
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const interactionInputSchema = z.object({
  type: z.enum(INTERACTION_TYPES).default('note'),
  occurredAt: z.string().trim().min(1).max(40),
  notes: z.string().max(5000).default(''),
  outcome: z.string().trim().max(300).default(''),
});
export type InteractionInput = z.infer<typeof interactionInputSchema>;

// ---- Row <-> domain mapping ----

interface ContactRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  phones: string;
  emails: string;
  address: string;
  website: string;
  notes: string;
  category: string;
  contact_type: string;
  tags: string;
  birthday: string | null;
  last_contact: string | null;
  next_follow_up: string | null;
  relationship_score: number;
  how_met: string;
  photo: string;
  created_at: string;
  updated_at: string;
}

function safeParse<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    company: row.company,
    title: row.title,
    phones: safeParse<LabeledValue[]>(row.phones, []),
    emails: safeParse<LabeledValue[]>(row.emails, []),
    address: row.address,
    website: row.website,
    notes: row.notes,
    category: (CONTACT_CATEGORIES as readonly string[]).includes(row.category)
      ? (row.category as ContactCategory)
      : 'Personal',
    contactType: row.contact_type === 'service' ? 'service' : 'personal',
    tags: safeParse<string[]>(row.tags, []),
    birthday: row.birthday,
    lastContact: row.last_contact,
    nextFollowUp: row.next_follow_up,
    relationshipScore: row.relationship_score,
    howMet: row.how_met,
    photo: row.photo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface InteractionRow {
  id: string;
  contact_id: string;
  user_id: string;
  type: string;
  occurred_at: string;
  notes: string;
  outcome: string;
  created_at: string;
}

export function rowToInteraction(row: InteractionRow): ContactInteraction {
  return {
    id: row.id,
    contactId: row.contact_id,
    userId: row.user_id,
    type: (INTERACTION_TYPES as readonly string[]).includes(row.type)
      ? (row.type as InteractionType)
      : 'note',
    occurredAt: row.occurred_at,
    notes: row.notes,
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

export function newId(): string {
  return crypto.randomUUID();
}

// ---- Category suggestion (heuristic) ----
//
// Spec calls for AI-suggested categories from title/company. A deterministic keyword
// match is shipped now so the feature is genuinely functional; Session 4 can route this
// through the AI gateway for nuance. The user can always override the suggestion.

const CATEGORY_KEYWORDS: Array<{ category: ContactCategory; type: ContactType; words: string[] }> = [
  { category: 'Medical', type: 'service', words: ['doctor', ' dr ', 'dr.', 'md', 'dds', 'nurse', 'dentist', 'physician', 'clinic', 'hospital', 'pediatric', 'therapist', 'dermatolog', 'pharmacy', 'pharmacist', 'optometr', 'chiropract', 'orthodont', 'cardiolog', 'veterinar', ' vet '] },
  { category: 'Legal', type: 'service', words: ['attorney', 'lawyer', 'esq', 'law firm', ' law ', 'paralegal', 'counsel', 'notary', 'legal'] },
  { category: 'Financial', type: 'service', words: ['financial advisor', 'accountant', 'cpa', 'banker', ' bank', 'insurance', 'mortgage', 'tax ', 'bookkeep', 'wealth', 'broker', 'underwrit', 'lender'] },
  { category: 'Service/Trade', type: 'service', words: ['plumb', 'electric', 'contractor', 'hvac', 'mechanic', 'landscap', 'roofer', 'roofing', 'handyman', 'cleaner', 'cleaning', 'painter', 'painting', 'carpenter', 'locksmith', 'technician', 'repair', 'pest', 'mover', 'moving', 'flooring', 'remodel'] },
  { category: 'Emergency', type: 'service', words: ['emergency', 'fire dept', 'fire department', 'police', 'poison', '911', 'paramedic', 'ambulance'] },
  { category: 'Professional', type: 'personal', words: ['ceo', 'cto', 'cfo', 'coo', 'manager', 'director', 'engineer', 'designer', 'consultant', 'sales', 'marketing', 'founder', ' vp', 'vice president', 'president', 'officer', 'developer', 'recruiter', 'analyst', 'architect', 'product', 'partner', 'principal', 'realtor', 'agent'] },
];

export function suggestCategory(
  title: string,
  company: string,
): { category: ContactCategory; contactType: ContactType } {
  const haystack = ` ${title} ${company} `.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.words.some((w) => haystack.includes(w))) {
      return { category: entry.category, contactType: entry.type };
    }
  }
  return { category: 'Personal', contactType: 'personal' };
}

/** A contact must have at least one of: first name, last name, or company. */
export function hasIdentity(input: Pick<ContactInput, 'firstName' | 'lastName' | 'company'>): boolean {
  return Boolean(input.firstName.trim() || input.lastName.trim() || input.company.trim());
}
