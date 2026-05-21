import { emptyContactInput, type ContactInput, type LabeledValue } from './types';

/**
 * Minimal vCard (2.1 / 3.0 / 4.0) parser for the QR scanner + manual paste fallback.
 * Returns a ContactInput pre-filled from the card, or null if no vCard is found.
 */

function unescape(value: string): string {
  return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function unfold(text: string): string[] {
  // RFC: a line beginning with a space/tab is a continuation of the previous line.
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function typeLabel(params: string[], fallback: string): string {
  const typeParam = params.find((p) => p.toUpperCase().startsWith('TYPE='));
  const raw = typeParam ? typeParam.split('=')[1] : params.find((p) => !p.includes('='));
  if (!raw) return fallback;
  const first = raw.split(',')[0].toLowerCase();
  const map: Record<string, string> = {
    cell: 'Mobile',
    mobile: 'Mobile',
    home: 'Home',
    work: 'Work',
    voice: 'Phone',
    fax: 'Fax',
    main: 'Main',
  };
  return map[first] || first.charAt(0).toUpperCase() + first.slice(1);
}

function normalizeDate(value: string): string | null {
  const v = value.trim();
  const iso = v.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

export function parseVCard(text: string): ContactInput | null {
  if (!/BEGIN:VCARD/i.test(text)) return null;

  const out = emptyContactInput();
  out.phones = [];
  out.emails = [];
  let fnName = '';

  for (const line of unfold(text)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const left = line.slice(0, idx);
    const value = unescape(line.slice(idx + 1)).trim();
    if (!value) continue;

    const [rawName, ...params] = left.split(';');
    const name = rawName.toUpperCase().replace(/^ITEM\d+\./, '');

    switch (name) {
      case 'N': {
        const parts = value.split(';');
        out.lastName = (parts[0] || '').trim();
        out.firstName = (parts[1] || '').trim();
        break;
      }
      case 'FN':
        fnName = value;
        break;
      case 'ORG':
        out.company = value.split(';')[0].trim();
        break;
      case 'TITLE':
        out.title = value;
        break;
      case 'TEL':
        out.phones.push({ label: typeLabel(params, 'Phone'), value });
        break;
      case 'EMAIL':
        out.emails.push({ label: typeLabel(params, 'Email'), value });
        break;
      case 'ADR':
        out.address = value
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(', ');
        break;
      case 'URL':
        out.website = value;
        break;
      case 'BDAY': {
        const d = normalizeDate(value);
        if (d) out.birthday = d;
        break;
      }
      case 'NOTE':
        out.notes = value;
        break;
      default:
        break;
    }
  }

  if (!out.firstName && !out.lastName && fnName) {
    const parts = fnName.split(/\s+/);
    out.firstName = parts[0] || '';
    out.lastName = parts.slice(1).join(' ');
  }

  if (out.phones.length === 0) out.phones = [{ label: 'Mobile', value: '' } as LabeledValue];
  if (out.emails.length === 0) out.emails = [{ label: 'Personal', value: '' } as LabeledValue];

  return out;
}
