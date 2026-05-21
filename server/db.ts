import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'propel.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Performance + safety pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

/**
 * Migrations are versioned, append-only.
 * Each session adds new migrations here. Never edit a migration after it has run in production.
 */
const MIGRATIONS: Array<{ version: number; name: string; sql: string }> = [
  {
    version: 1,
    name: 'init_meta',
    sql: `
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    version: 2,
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        plan_tier TEXT NOT NULL DEFAULT 'spark',
        ai_tokens_used_this_month INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `,
  },
  {
    version: 3,
    name: 'seed_demo_user',
    sql: `
      INSERT OR IGNORE INTO users (id, email, display_name, plan_tier)
      VALUES ('demo-user', 'demo@propelstack.ai', 'Demo User', 'spark');
    `,
  },
  // ---- Session 2: Personal CRM ----
  {
    version: 4,
    name: 'contacts',
    sql: `
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        company TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        phones TEXT NOT NULL DEFAULT '[]',       -- JSON array of { label, value }
        emails TEXT NOT NULL DEFAULT '[]',       -- JSON array of { label, value }
        address TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Personal',
        contact_type TEXT NOT NULL DEFAULT 'personal',  -- 'personal' | 'service'
        tags TEXT NOT NULL DEFAULT '[]',         -- JSON array of strings
        birthday TEXT,                           -- ISO date (YYYY-MM-DD) or NULL
        last_contact TEXT,                       -- ISO date or NULL
        next_follow_up TEXT,                     -- ISO date or NULL
        relationship_score INTEGER NOT NULL DEFAULT 3,  -- 1..5
        how_met TEXT NOT NULL DEFAULT '',
        photo TEXT NOT NULL DEFAULT '',          -- base64 data URL or remote URL
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(user_id, category);
      CREATE INDEX IF NOT EXISTS idx_contacts_follow_up ON contacts(user_id, next_follow_up);
    `,
  },
  {
    version: 5,
    name: 'contact_interactions',
    sql: `
      CREATE TABLE IF NOT EXISTS contact_interactions (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'note',       -- call | email | meeting | note | other
        occurred_at TEXT NOT NULL,               -- ISO date
        notes TEXT NOT NULL DEFAULT '',
        outcome TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_interactions_contact ON contact_interactions(contact_id);
    `,
  },
];

export function runMigrations(): void {
  // Bootstrap the meta table first
  db.exec(MIGRATIONS[0].sql);

  const appliedRow = db.prepare('SELECT MAX(version) as v FROM _migrations').get() as { v: number | null };
  const applied = appliedRow?.v ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > applied);
  if (pending.length === 0) return;

  const insertMigration = db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)');

  for (const migration of pending) {
    const tx = db.transaction(() => {
      db.exec(migration.sql);
      insertMigration.run(migration.version, migration.name);
    });
    tx();
    // eslint-disable-next-line no-console
    console.log(`[db] applied migration ${migration.version}: ${migration.name}`);
  }
}

/**
 * Helper for routes: get current user.
 * Auth is stubbed for now (always returns the seeded demo user).
 * Session 8 / a future auth session will replace this with real session/JWT lookup.
 */
export function getCurrentUserId(): string {
  return 'demo-user';
}
