import {
  CONTACT_CATEGORIES,
  emptyContactInput,
  type Contact,
  type ContactCategory,
  type ContactInput,
  type LabeledValue,
} from './types';

/**
 * CSV export/import for contacts. No browser storage is used -- export is an in-memory
 * Blob download; import parses a user-selected file's text.
 */

const COLUMNS = [
  'firstName',
  'lastName',
  'company',
  'title',
  'phones',
  'emails',
  'address',
  'website',
  'category',
  'contactType',
  'tags',
  'birthday',
  'lastContact',
  'nextFollowUp',
  'relationshipScore',
  'howMet',
  'notes',
] as const;

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatLabeled(items: LabeledValue[]): string {
  return items
    .filter((i) => i.value.trim())
    .map((i) => (i.label ? `${i.label}:${i.value}` : i.value))
    .join('; ');
}

export function contactsToCsv(contacts: Contact[]): string {
  const header = COLUMNS.join(',');
  const rows = contacts.map((c) => {
    const cells: Record<(typeof COLUMNS)[number], string> = {
      firstName: c.firstName,
      lastName: c.lastName,
      company: c.company,
      title: c.title,
      phones: formatLabeled(c.phones),
      emails: formatLabeled(c.emails),
      address: c.address,
      website: c.website,
      category: c.category,
      contactType: c.contactType,
      tags: c.tags.join('; '),
      birthday: c.birthday ?? '',
      lastContact: c.lastContact ?? '',
      nextFollowUp: c.nextFollowUp ?? '',
      relationshipScore: String(c.relationshipScore),
      howMet: c.howMet,
      notes: c.notes,
    };
    return COLUMNS.map((col) => escapeCell(cells[col])).join(',');
  });
  return [header, ...rows].join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- import ----

/** Split a single CSV file into rows of string cells (handles quotes + embedded newlines). */
function parseCsvCells(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function parseLabeled(raw: string, defaultLabel: string): LabeledValue[] {
  if (!raw.trim()) return [];
  return raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colon = part.indexOf(':');
      if (colon > 0) return { label: part.slice(0, colon).trim(), value: part.slice(colon + 1).trim() };
      return { label: defaultLabel, value: part };
    });
}

function asCategory(raw: string): ContactCategory {
  return (CONTACT_CATEGORIES as readonly string[]).includes(raw) ? (raw as ContactCategory) : 'Personal';
}

export function csvToContacts(text: string): ContactInput[] {
  const rows = parseCsvCells(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim());
  const indexOf = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const col = (row: string[], name: string) => {
    const i = indexOf(name);
    return i >= 0 ? (row[i] ?? '').trim() : '';
  };

  return rows.slice(1).map((row) => {
    const base = emptyContactInput();
    base.firstName = col(row, 'firstName');
    base.lastName = col(row, 'lastName');
    base.company = col(row, 'company');
    base.title = col(row, 'title');
    base.phones = parseLabeled(col(row, 'phones'), 'Mobile');
    base.emails = parseLabeled(col(row, 'emails'), 'Personal');
    base.address = col(row, 'address');
    base.website = col(row, 'website');
    base.category = asCategory(col(row, 'category'));
    base.contactType = col(row, 'contactType') === 'service' ? 'service' : 'personal';
    base.tags = col(row, 'tags')
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean);
    base.birthday = col(row, 'birthday') || null;
    base.lastContact = col(row, 'lastContact') || null;
    base.nextFollowUp = col(row, 'nextFollowUp') || null;
    const score = Number(col(row, 'relationshipScore'));
    base.relationshipScore = score >= 1 && score <= 5 ? Math.round(score) : 3;
    base.howMet = col(row, 'howMet');
    base.notes = col(row, 'notes');
    return base;
  });
}
