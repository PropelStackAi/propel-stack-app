// Personal CRM shared types + constants (Session 2). Mirrors the server domain model.

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

export interface ContactWithInteractions extends Contact {
  interactions: ContactInteraction[];
}

export interface BirthdayEntry {
  contact: Contact;
  daysUntil: number;
}

/** The editable shape sent to POST/PATCH. */
export type ContactInput = Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export interface InteractionInput {
  type: InteractionType;
  occurredAt: string;
  notes: string;
  outcome: string;
}

export interface ExtractedCardFields {
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  website: string;
}

export interface ExtractBusinessCardResult {
  fields: ExtractedCardFields;
  stubbed: boolean;
  note?: string;
}

/** Tailwind accent classes per category, for chips and dots. */
export const CATEGORY_ACCENT: Record<ContactCategory, { dot: string; chip: string }> = {
  Personal: { dot: 'bg-brand-indigo', chip: 'bg-brand-indigo/10 text-brand-indigo ring-brand-indigo/20' },
  Professional: { dot: 'bg-brand-purple', chip: 'bg-brand-purple/10 text-brand-purple ring-brand-purple/20' },
  'Service/Trade': { dot: 'bg-brand-teal', chip: 'bg-brand-teal/10 text-brand-teal ring-brand-teal/20' },
  Medical: { dot: 'bg-rose-500', chip: 'bg-rose-500/10 text-rose-600 ring-rose-500/20' },
  Legal: { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-700 ring-amber-500/20' },
  Financial: { dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20' },
  Emergency: { dot: 'bg-red-600', chip: 'bg-red-600/10 text-red-700 ring-red-600/20' },
};

export function emptyContactInput(): ContactInput {
  return {
    firstName: '',
    lastName: '',
    company: '',
    title: '',
    phones: [{ label: 'Mobile', value: '' }],
    emails: [{ label: 'Personal', value: '' }],
    address: '',
    website: '',
    notes: '',
    category: 'Personal',
    contactType: 'personal',
    tags: [],
    birthday: null,
    lastContact: null,
    nextFollowUp: null,
    relationshipScore: 3,
    howMet: '',
    photo: '',
  };
}

export function toContactInput(c: Contact): ContactInput {
  const { id: _id, userId: _u, createdAt: _c, updatedAt: _up, ...rest } = c;
  return { ...rest };
}

export function displayName(c: Pick<Contact, 'firstName' | 'lastName' | 'company'>): string {
  const name = `${c.firstName} ${c.lastName}`.trim();
  return name || c.company || 'Unnamed contact';
}

export function initials(c: Pick<Contact, 'firstName' | 'lastName' | 'company'>): string {
  const a = c.firstName.trim()[0] || c.company.trim()[0] || '?';
  const b = c.lastName.trim()[0] || '';
  return (a + b).toUpperCase();
}

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  other: 'Other',
};
