import { Pool, type QueryResult } from 'pg';

/**
 * Database layer — PostgreSQL via pg (Session 8).
 *
 * Provides a prepare().get/all/run() API that mirrors the previous sql.js surface
 * so route code only needs `await` added to each call. Named params (@col style)
 * and positional ? params are both converted to pg's $1, $2, $3 syntax.
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] pool error', err);
});

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

type Params = unknown[];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Converts sql.js-style SQL + params to pg $1,$2 format.
 * - Named params (@col or :col) with a single plain-object argument
 * - Positional ? params with array/spread arguments
 * Also replaces SQLite datetime('now') with NOW().
 */
function toPostgres(sql: string, params: Params): { text: string; values: unknown[] } {
  const s = sql.replace(/datetime\('now'\)/gi, 'NOW()');

  if (params.length === 0) return { text: s, values: [] };

  if (params.length === 1 && isPlainObject(params[0])) {
    const obj = params[0];
    const values: unknown[] = [];
    const used = new Map<string, number>();
    const text = s.replace(/[@:]([a-zA-Z_]\w*)/g, (_, name: string) => {
      if (!used.has(name)) {
        values.push(obj[name] ?? null);
        used.set(name, values.length);
      }
      return `$${used.get(name)}`;
    });
    return { text, values };
  }

  const flat = params.flat();
  let i = 0;
  const text = s.replace(/\?/g, () => `$${++i}`);
  return { text, values: flat };
}

class Statement {
  constructor(private sql: string) {}

  async get(...params: Params): Promise<Record<string, unknown> | undefined> {
    const { text, values } = toPostgres(this.sql, params);
    const result: QueryResult = await pool.query(text, values);
    return result.rows[0];
  }

  async all(...params: Params): Promise<Record<string, unknown>[]> {
    const { text, values } = toPostgres(this.sql, params);
    const result: QueryResult = await pool.query(text, values);
    return result.rows;
  }

  async run(...params: Params): Promise<RunResult> {
    const { text, values } = toPostgres(this.sql, params);
    const result: QueryResult = await pool.query(text, values);
    return { changes: result.rowCount ?? 0, lastInsertRowid: 0 };
  }
}

class Db {
  prepare(sql: string): Statement {
    return new Statement(sql);
  }

  async exec(sql: string): Promise<void> {
    await pool.query(sql);
  }
}

export const db = new Db();

export async function initDb(): Promise<void> {
  await pool.query('SELECT 1');
  console.log('[db] PostgreSQL connected');
}

const MIGRATIONS: Array<{ version: number; name: string; sql: string }> = [
  {
    version: 1,
    name: 'init_meta',
    sql: `
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `,
  },
  {
    version: 3,
    name: 'seed_demo_user',
    sql: `
      INSERT INTO users (id, email, display_name, plan_tier)
      VALUES ('demo-user', 'demo@propelstack.ai', 'Demo User', 'spark')
      ON CONFLICT DO NOTHING;
    `,
  },
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
        phones TEXT NOT NULL DEFAULT '[]',
        emails TEXT NOT NULL DEFAULT '[]',
        address TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Personal',
        contact_type TEXT NOT NULL DEFAULT 'personal',
        tags TEXT NOT NULL DEFAULT '[]',
        birthday TEXT,
        last_contact TEXT,
        next_follow_up TEXT,
        relationship_score INTEGER NOT NULL DEFAULT 3,
        how_met TEXT NOT NULL DEFAULT '',
        photo TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
        type TEXT NOT NULL DEFAULT 'note',
        occurred_at TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        outcome TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_interactions_contact ON contact_interactions(contact_id);
    `,
  },
  {
    version: 6,
    name: 'financial_disclaimer_acknowledgments',
    sql: `
      CREATE TABLE IF NOT EXISTS financial_disclaimer_acknowledgments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        version TEXT NOT NULL,
        acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        signature_name TEXT NOT NULL,
        ip_address TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_fin_disc_user ON financial_disclaimer_acknowledgments(user_id, version);
    `,
  },
  {
    version: 7,
    name: 'budget_categories',
    sql: `
      CREATE TABLE IF NOT EXISTS budget_categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'expense',
        monthly_budget REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_budget_cat_user ON budget_categories(user_id);
    `,
  },
  {
    version: 8,
    name: 'transactions',
    sql: `
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category_id TEXT,
        type TEXT NOT NULL DEFAULT 'expense',
        amount REAL NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        occurred_at TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, occurred_at);
    `,
  },
  {
    version: 9,
    name: 'bills',
    sql: `
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        due_date TEXT NOT NULL,
        recurrence TEXT NOT NULL DEFAULT 'none',
        is_paid INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id, due_date);
    `,
  },
  {
    version: 10,
    name: 'financial_goals',
    sql: `
      CREATE TABLE IF NOT EXISTS financial_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'custom',
        target_amount REAL NOT NULL DEFAULT 0,
        current_amount REAL NOT NULL DEFAULT 0,
        target_date TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_goals_user ON financial_goals(user_id);
    `,
  },
  {
    version: 11,
    name: 'net_worth_snapshots',
    sql: `
      CREATE TABLE IF NOT EXISTS net_worth_snapshots (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        assets TEXT NOT NULL DEFAULT '[]',
        liabilities TEXT NOT NULL DEFAULT '[]',
        net_worth REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_nw_user ON net_worth_snapshots(user_id, snapshot_date);
    `,
  },
  {
    version: 12,
    name: 'investments',
    sql: `
      CREATE TABLE IF NOT EXISTS investments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL DEFAULT '',
        shares REAL NOT NULL DEFAULT 0,
        cost_basis REAL NOT NULL DEFAULT 0,
        current_value REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
    `,
  },
  {
    version: 13,
    name: 'ai_conversations',
    sql: `
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New conversation',
        model TEXT NOT NULL DEFAULT 'gpt-mini',
        mode TEXT NOT NULL DEFAULT 'general',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id, updated_at);
    `,
  },
  {
    version: 14,
    name: 'ai_messages',
    sql: `
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        tokens_in INTEGER NOT NULL DEFAULT 0,
        tokens_out INTEGER NOT NULL DEFAULT 0,
        model TEXT NOT NULL DEFAULT '',
        rating INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id, created_at);
    `,
  },
  {
    version: 15,
    name: 'tasks',
    sql: `
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        due_date TEXT,
        completed_at TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, due_date);
    `,
  },
  {
    version: 16,
    name: 'habits',
    sql: `
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
    `,
  },
  {
    version: 17,
    name: 'habit_completions',
    sql: `
      CREATE TABLE IF NOT EXISTS habit_completions (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        completed_on TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (habit_id, completed_on),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_habit_comp ON habit_completions(habit_id, completed_on);
    `,
  },
  {
    version: 18,
    name: 'notes',
    sql: `
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, created_at);
    `,
  },
  {
    version: 19,
    name: 'activity_log',
    sql: `
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        summary TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at);
    `,
  },
  {
    version: 20,
    name: 'documents',
    sql: `
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Other',
        file_name TEXT NOT NULL DEFAULT '',
        file_type TEXT NOT NULL DEFAULT '',
        file_size INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL DEFAULT '',
        expiry_date TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        ai_summary TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id, category);
    `,
  },
  {
    version: 21,
    name: 'document_shares',
    sql: `
      CREATE TABLE IF NOT EXISTS document_shares (
        token TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_doc_shares_doc ON document_shares(document_id);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await pool.query('SELECT MAX(version) AS v FROM _migrations');
  const applied = Number(rows[0]?.v ?? 0);
  const pending = MIGRATIONS.filter((m) => m.version > applied);
  if (pending.length === 0) return;

  for (const migration of pending) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query('INSERT INTO _migrations (version, name) VALUES ($1, $2)', [migration.version, migration.name]);
      await client.query('COMMIT');
      console.log(`[db] applied migration ${migration.version}: ${migration.name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export function getCurrentUserId(): string {
  return 'demo-user';
}
