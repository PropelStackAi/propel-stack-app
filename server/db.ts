import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase, SqlValue, BindParams } from 'sql.js';

/**
 * Database layer (sql.js / pure-WASM SQLite).
 *
 * Why sql.js: zero native compilation — works on any Node version, any OS, with no
 * prebuilt binaries or build toolchain. The trade-off is that the engine is in-memory,
 * so we own persistence: the database image is read from disk on startup and written
 * back (debounced) after writes.
 *
 * The exported `db` keeps a SYNCHRONOUS, better-sqlite3-compatible surface
 * (prepare().get()/.all()/.run(), exec(), pragma(), transaction()) so feature/route
 * code stays unchanged and HARD RULE #5 (synchronous DB access, no await) still holds.
 * The ONLY async step is initDb(), which loads the WASM module once at boot.
 */

// Anchor module resolution to the project root. Using process.cwd() (rather than
// import.meta.url) keeps this working identically under tsx (ESM dev) and the esbuild
// CJS bundle, where import.meta is unavailable.
const requireFromRoot = createRequire(path.join(process.cwd(), 'package.json'));

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'propel.db');
const SAVE_DEBOUNCE_MS = 250;

function ensureDataDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Locate sql-wasm.wasm both under tsx (dev) and the esbuild CJS bundle (prod). */
function wasmPath(file: string): string {
  try {
    return requireFromRoot.resolve(`sql.js/dist/${file}`);
  } catch {
    return path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file);
  }
}

type Params = unknown[];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Uint8Array);
}

function toSqlValue(v: unknown): SqlValue {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number(v);
  return v as SqlValue;
}

/**
 * Map better-sqlite3-style params onto sql.js bind params.
 * - a single plain object  -> named params (@name / :name / $name)
 * - everything else        -> positional (?) params
 */
function normalizeParams(sql: string, params: Params): BindParams | undefined {
  if (params.length === 0) return undefined;
  if (params.length === 1 && isPlainObject(params[0])) {
    const obj = params[0];
    const named: Record<string, SqlValue> = {};
    const re = /[@:$]([a-zA-Z_]\w*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      named[m[0]] = toSqlValue(obj[m[1]]); // key includes prefix, e.g. '@id'
    }
    return named;
  }
  return params.map(toSqlValue);
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

class Statement {
  constructor(private owner: Db, private sql: string) {}

  run(...params: Params): RunResult {
    const sdb = this.owner.handle();
    const stmt = sdb.prepare(this.sql);
    try {
      const bound = normalizeParams(this.sql, params);
      if (bound !== undefined) stmt.bind(bound);
      stmt.step();
      const changes = sdb.getRowsModified();
      const lastInsertRowid = lastRowid(sdb);
      this.owner.markDirty();
      return { changes, lastInsertRowid };
    } finally {
      stmt.free();
    }
  }

  get(...params: Params): unknown {
    const sdb = this.owner.handle();
    const stmt = sdb.prepare(this.sql);
    try {
      const bound = normalizeParams(this.sql, params);
      if (bound !== undefined) stmt.bind(bound);
      return stmt.step() ? stmt.getAsObject() : undefined;
    } finally {
      stmt.free();
    }
  }

  all(...params: Params): unknown[] {
    const sdb = this.owner.handle();
    const stmt = sdb.prepare(this.sql);
    const rows: unknown[] = [];
    try {
      const bound = normalizeParams(this.sql, params);
      if (bound !== undefined) stmt.bind(bound);
      while (stmt.step()) rows.push(stmt.getAsObject());
    } finally {
      stmt.free();
    }
    return rows;
  }
}

function lastRowid(sdb: SqlJsDatabase): number {
  const res = sdb.exec('SELECT last_insert_rowid() AS id');
  const val = res[0]?.values?.[0]?.[0];
  return typeof val === 'number' ? val : 0;
}

class Db {
  private sql: SqlJsDatabase | null = null;
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private exitHooked = false;

  attach(sql: SqlJsDatabase): void {
    this.sql = sql;
    this.hookExit();
  }

  handle(): SqlJsDatabase {
    if (!this.sql) throw new Error('Database not initialized -- call initDb() first.');
    return this.sql;
  }

  prepare(sql: string): Statement {
    return new Statement(this, sql);
  }

  exec(sql: string): void {
    this.handle().run(sql);
    this.markDirty();
  }

  pragma(directive: string): void {
    // sql.js is in-memory: WAL/synchronous pragmas are no-ops; foreign_keys is honored.
    try {
      this.handle().run(`PRAGMA ${directive};`);
    } catch {
      /* unsupported pragma -- ignore */
    }
  }

  transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
    return (...args: A): R => {
      const sdb = this.handle();
      sdb.run('BEGIN');
      try {
        const result = fn(...args);
        sdb.run('COMMIT');
        this.markDirty();
        return result;
      } catch (err) {
        try {
          sdb.run('ROLLBACK');
        } catch {
          /* ignore rollback failure */
        }
        throw err;
      }
    };
  }

  markDirty(): void {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, SAVE_DEBOUNCE_MS);
  }

  /** Persist the in-memory image to disk atomically (tmp file + rename). */
  flush(): void {
    if (!this.sql || !this.dirty) return;
    const data = Buffer.from(this.sql.export());
    const tmp = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, DB_PATH);
    this.dirty = false;
  }

  private flushSync(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flush();
  }

  private hookExit(): void {
    if (this.exitHooked) return;
    this.exitHooked = true;
    process.once('exit', () => this.flushSync());
    process.once('SIGINT', () => {
      this.flushSync();
      process.exit(0);
    });
    process.once('SIGTERM', () => {
      this.flushSync();
      process.exit(0);
    });
  }
}

export const db = new Db();

/** Load the WASM engine and the on-disk image (if any). Call once before runMigrations(). */
export async function initDb(): Promise<void> {
  ensureDataDir();
  const SQL = await initSqlJs({ locateFile: (file) => wasmPath(file) });
  const database = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();
  db.attach(database);
}

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
  // Performance + safety pragmas (WAL/synchronous are no-ops under sql.js).
  db.pragma('foreign_keys = ON');

  // Bootstrap the meta table first
  db.exec(MIGRATIONS[0].sql);

  const appliedRow = db.prepare('SELECT MAX(version) as v FROM _migrations').get() as { v: number | null } | undefined;
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
