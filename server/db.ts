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
