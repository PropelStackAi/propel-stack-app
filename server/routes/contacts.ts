import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { extractBusinessCard } from '../ai-gateway.js';
import {
  contactInputSchema,
  interactionInputSchema,
  rowToContact,
  rowToInteraction,
  suggestCategory,
  hasIdentity,
  newId,
  type ContactInput,
} from '../lib/contacts.js';

/**
 * Personal CRM API (Session 2).
 * HARD RULE #5: SQLite is synchronous -- .get()/.all()/.run(), never await.
 */
export const contactsRouter = Router();

// ---- prepared-statement helpers ----

function selectContact(id: string, userId: string) {
  return db
    .prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?')
    .get(id, userId) as Record<string, unknown> | undefined;
}

function persistContact(id: string, userId: string, input: ContactInput, isInsert: boolean): void {
  const cols = {
    first_name: input.firstName,
    last_name: input.lastName,
    company: input.company,
    title: input.title,
    phones: JSON.stringify(input.phones),
    emails: JSON.stringify(input.emails),
    address: input.address,
    website: input.website,
    notes: input.notes,
    category: input.category,
    contact_type: input.contactType,
    tags: JSON.stringify(input.tags),
    birthday: input.birthday,
    last_contact: input.lastContact,
    next_follow_up: input.nextFollowUp,
    relationship_score: input.relationshipScore,
    how_met: input.howMet,
    photo: input.photo,
  };

  if (isInsert) {
    db.prepare(
      `INSERT INTO contacts
        (id, user_id, first_name, last_name, company, title, phones, emails, address, website,
         notes, category, contact_type, tags, birthday, last_contact, next_follow_up,
         relationship_score, how_met, photo)
       VALUES
        (@id, @user_id, @first_name, @last_name, @company, @title, @phones, @emails, @address, @website,
         @notes, @category, @contact_type, @tags, @birthday, @last_contact, @next_follow_up,
         @relationship_score, @how_met, @photo)`,
    ).run({ id, user_id: userId, ...cols });
  } else {
    db.prepare(
      `UPDATE contacts SET
         first_name=@first_name, last_name=@last_name, company=@company, title=@title,
         phones=@phones, emails=@emails, address=@address, website=@website, notes=@notes,
         category=@category, contact_type=@contact_type, tags=@tags, birthday=@birthday,
         last_contact=@last_contact, next_follow_up=@next_follow_up,
         relationship_score=@relationship_score, how_met=@how_met, photo=@photo,
         updated_at=datetime('now')
       WHERE id=@id AND user_id=@user_id`,
    ).run({ id, user_id: userId, ...cols });
  }
}

function badRequest(res: Response, message: string, details?: unknown) {
  return res.status(400).json({ error: message, details });
}

// ---- collection ----

contactsRouter.get('/', (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = db
    .prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY first_name COLLATE NOCASE, last_name COLLATE NOCASE')
    .all(userId) as Record<string, unknown>[];
  res.json(rows.map((r) => rowToContact(r as never)));
});

contactsRouter.post('/', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const parsed = contactInputSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'Invalid contact', parsed.error.flatten());
  if (!hasIdentity(parsed.data)) return badRequest(res, 'A contact needs a first name, last name, or company.');

  const id = newId();
  persistContact(id, userId, parsed.data, true);
  const row = selectContact(id, userId);
  res.status(201).json(rowToContact(row as never));
});

// ---- derived / meta (must precede /:id) ----

contactsRouter.get('/meta/follow-ups', (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const today = new Date().toISOString().slice(0, 10);
  const rows = db
    .prepare(
      `SELECT * FROM contacts
       WHERE user_id = ? AND next_follow_up IS NOT NULL AND next_follow_up != ''
         AND next_follow_up <= ?
       ORDER BY next_follow_up ASC`,
    )
    .all(userId, today) as Record<string, unknown>[];
  res.json(rows.map((r) => rowToContact(r as never)));
});

contactsRouter.get('/meta/birthdays', (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = db
    .prepare(
      `SELECT * FROM contacts WHERE user_id = ? AND birthday IS NOT NULL AND birthday != ''`,
    )
    .all(userId) as Record<string, unknown>[];

  const now = new Date();
  const upcoming = rows
    .map((r) => rowToContact(r as never))
    .map((c) => ({ contact: c, daysUntil: daysUntilBirthday(c.birthday as string, now) }))
    .filter((x) => x.daysUntil !== null && x.daysUntil <= 30)
    .sort((a, b) => (a.daysUntil as number) - (b.daysUntil as number));

  res.json(upcoming);
});

function daysUntilBirthday(birthday: string, from: Date): number | null {
  // birthday is YYYY-MM-DD (year may be a placeholder); compare month/day only.
  const m = birthday.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const month = Number(m[1]) - 1;
  const day = Number(m[2]);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;

  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), month, day);
  if (next < start) next = new Date(from.getFullYear() + 1, month, day);
  return Math.round((next.getTime() - start.getTime()) / 86_400_000);
}

// ---- AI / capture helpers (must precede /:id) ----

contactsRouter.post('/extract-card', (req: Request, res: Response) => {
  const image = typeof req.body?.image === 'string' ? req.body.image : '';
  if (!image) return badRequest(res, 'No image provided.');
  const result = extractBusinessCard(image);
  res.json(result);
});

contactsRouter.post('/suggest-category', (req: Request, res: Response) => {
  const title = typeof req.body?.title === 'string' ? req.body.title : '';
  const company = typeof req.body?.company === 'string' ? req.body.company : '';
  res.json(suggestCategory(title, company));
});

contactsRouter.post('/import', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const items = Array.isArray(req.body?.contacts) ? req.body.contacts : null;
  if (!items) return badRequest(res, 'Expected { contacts: [...] }.');
  if (items.length > 2000) return badRequest(res, 'Too many rows (max 2000).');

  let imported = 0;
  const errors: Array<{ index: number; error: string }> = [];

  const tx = db.transaction(() => {
    items.forEach((item: unknown, index: number) => {
      const parsed = contactInputSchema.safeParse(item);
      if (!parsed.success || !hasIdentity(parsed.data)) {
        errors.push({ index, error: 'Invalid or empty row' });
        return;
      }
      persistContact(newId(), userId, parsed.data, true);
      imported += 1;
    });
  });
  tx();

  res.json({ imported, skipped: errors.length, errors });
});

// ---- single resource ----

contactsRouter.get('/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const row = selectContact((req.params.id as string), userId);
  if (!row) return res.status(404).json({ error: 'Contact not found' });

  const interactions = db
    .prepare('SELECT * FROM contact_interactions WHERE contact_id = ? AND user_id = ? ORDER BY occurred_at DESC')
    .all((req.params.id as string), userId) as Record<string, unknown>[];

  res.json({
    ...rowToContact(row as never),
    interactions: interactions.map((r) => rowToInteraction(r as never)),
  });
});

contactsRouter.patch('/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  if (!selectContact((req.params.id as string), userId)) return res.status(404).json({ error: 'Contact not found' });

  const parsed = contactInputSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'Invalid contact', parsed.error.flatten());
  if (!hasIdentity(parsed.data)) return badRequest(res, 'A contact needs a first name, last name, or company.');

  persistContact((req.params.id as string), userId, parsed.data, false);
  res.json(rowToContact(selectContact((req.params.id as string), userId) as never));
});

contactsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const result = db.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?').run((req.params.id as string), userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Contact not found' });
  res.status(204).end();
});

// ---- interactions ----

contactsRouter.post('/:id/interactions', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  if (!selectContact((req.params.id as string), userId)) return res.status(404).json({ error: 'Contact not found' });

  const parsed = interactionInputSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, 'Invalid interaction', parsed.error.flatten());

  const id = newId();
  db.prepare(
    `INSERT INTO contact_interactions (id, contact_id, user_id, type, occurred_at, notes, outcome)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, (req.params.id as string), userId, parsed.data.type, parsed.data.occurredAt, parsed.data.notes, parsed.data.outcome);

  // Logging an interaction also advances the contact's lastContact date.
  db.prepare("UPDATE contacts SET last_contact = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
    .run(parsed.data.occurredAt, (req.params.id as string), userId);

  const row = db.prepare('SELECT * FROM contact_interactions WHERE id = ?').get(id) as Record<string, unknown>;
  res.status(201).json(rowToInteraction(row as never));
});

contactsRouter.delete('/:id/interactions/:interactionId', (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const result = db
    .prepare('DELETE FROM contact_interactions WHERE id = ? AND contact_id = ? AND user_id = ?')
    .run((req.params.interactionId as string), (req.params.id as string), userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Interaction not found' });
  res.status(204).end();
});
