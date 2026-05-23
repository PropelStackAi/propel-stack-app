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
  // ── Session 10: Health Hub + Emergency Mode ──────────────────────────────
  {
    version: 26,
    name: 'health_profile',
    sql: `
      CREATE TABLE IF NOT EXISTS health_profile (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL DEFAULT '',
        blood_type TEXT NOT NULL DEFAULT '',
        allergies TEXT NOT NULL DEFAULT '[]',
        conditions TEXT NOT NULL DEFAULT '[]',
        emergency_contact_name TEXT NOT NULL DEFAULT '',
        emergency_contact_phone TEXT NOT NULL DEFAULT '',
        emergency_contact_relation TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_health_profile_user ON health_profile(user_id);
    `,
  },
  {
    version: 27,
    name: 'health_metrics',
    sql: `
      CREATE TABLE IF NOT EXISTS health_metrics (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        value2 REAL,
        unit TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_health_metrics_user ON health_metrics(user_id, metric_type, measured_at);
    `,
  },
  {
    version: 28,
    name: 'symptom_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS symptom_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        symptom TEXT NOT NULL,
        severity INTEGER NOT NULL DEFAULT 5,
        duration_hours REAL,
        notes TEXT NOT NULL DEFAULT '',
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_symptom_user ON symptom_logs(user_id, symptom, logged_at);
    `,
  },
  {
    version: 29,
    name: 'medication_reminders',
    sql: `
      CREATE TABLE IF NOT EXISTS medication_reminders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        dose TEXT NOT NULL DEFAULT '',
        frequency TEXT NOT NULL DEFAULT 'daily',
        reminder_times TEXT NOT NULL DEFAULT '[]',
        active INTEGER NOT NULL DEFAULT 1,
        start_date TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_meds_user ON medication_reminders(user_id, active);
    `,
  },
  {
    version: 30,
    name: 'health_appointments',
    sql: `
      CREATE TABLE IF NOT EXISTS health_appointments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        doctor_name TEXT NOT NULL,
        specialty TEXT NOT NULL DEFAULT '',
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'upcoming',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_appts_user ON health_appointments(user_id, appointment_date);
    `,
  },
  // ── Session 9: Parental Controls + Kids Zone ─────────────────────────────
  {
    version: 22,
    name: 'child_profiles',
    sql: `
      CREATE TABLE IF NOT EXISTS child_profiles (
        id TEXT PRIMARY KEY,
        parent_user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar_emoji TEXT NOT NULL DEFAULT '🧒',
        age_range TEXT NOT NULL DEFAULT 'child',
        content_filter INTEGER NOT NULL DEFAULT 1,
        ai_logging_enabled INTEGER NOT NULL DEFAULT 1,
        screen_time_limit_minutes INTEGER NOT NULL DEFAULT 60,
        app_sections_approved TEXT NOT NULL DEFAULT '["stories","homework","games"]',
        pin_hash TEXT,
        emergency_contact_name TEXT NOT NULL DEFAULT '',
        emergency_contact_phone TEXT NOT NULL DEFAULT '',
        emergency_contact_relation TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (parent_user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_child_profiles_parent ON child_profiles(parent_user_id);
    `,
  },
  {
    version: 23,
    name: 'child_screen_time',
    sql: `
      CREATE TABLE IF NOT EXISTS child_screen_time (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        session_date TEXT NOT NULL,
        minutes_used INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (child_profile_id, session_date),
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_child_time ON child_screen_time(child_profile_id, session_date);
    `,
  },
  {
    version: 24,
    name: 'kids_stars',
    sql: `
      CREATE TABLE IF NOT EXISTS kids_stars (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        total_stars INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (child_profile_id),
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 25,
    name: 'kids_ai_sessions',
    sql: `
      CREATE TABLE IF NOT EXISTS kids_ai_sessions (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        session_type TEXT NOT NULL,
        interaction_count INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_kids_ai ON kids_ai_sessions(child_profile_id, created_at);
    `,
  },

  // ── Session 12: Special Needs Family Support Hub ──────────────────────────
  {
    version: 31,
    name: 'snfs_disclaimer_acknowledgments',
    sql: `
      CREATE TABLE IF NOT EXISTS snfs_disclaimer_acknowledgments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT 'PSAI-SNFS-DISC-v1.0',
        acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, version),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },
  {
    version: 32,
    name: 'snfs_conversations',
    sql: `
      CREATE TABLE IF NOT EXISTS snfs_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New conversation',
        care_recipient_name TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_snfs_conv_user ON snfs_conversations(user_id, updated_at DESC);
    `,
  },
  {
    version: 33,
    name: 'snfs_messages',
    sql: `
      CREATE TABLE IF NOT EXISTS snfs_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user','assistant')),
        content TEXT NOT NULL,
        is_crisis INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (conversation_id) REFERENCES snfs_conversations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_snfs_msg_conv ON snfs_messages(conversation_id, created_at);
    `,
  },
  {
    version: 34,
    name: 'snfs_care_team_members',
    sql: `
      CREATE TABLE IF NOT EXISTS snfs_care_team_members (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT '',
        organization TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_snfs_team_user ON snfs_care_team_members(user_id);
    `,
  },
  {
    version: 35,
    name: 'snfs_crisis_plans',
    sql: `
      CREATE TABLE IF NOT EXISTS snfs_crisis_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        care_recipient_name TEXT NOT NULL DEFAULT '',
        triggers TEXT NOT NULL DEFAULT '[]',
        warning_signs TEXT NOT NULL DEFAULT '[]',
        calming_strategies TEXT NOT NULL DEFAULT '[]',
        escalation_steps TEXT NOT NULL DEFAULT '[]',
        emergency_contacts TEXT NOT NULL DEFAULT '[]',
        safe_person TEXT NOT NULL DEFAULT '',
        safe_place TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },
  {
    version: 36,
    name: 'snfs_progress_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS snfs_progress_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        care_recipient_name TEXT NOT NULL DEFAULT '',
        goal TEXT NOT NULL,
        log_date TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_snfs_progress_user ON snfs_progress_logs(user_id, log_date DESC);
    `,
  },

  // ── Session 13: Athlete Performance Hub ──────────────────────────────────
  {
    version: 37,
    name: 'athlete_profiles',
    sql: `
      CREATE TABLE IF NOT EXISTS athlete_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        sports TEXT NOT NULL DEFAULT '[]',
        experience TEXT NOT NULL DEFAULT 'beginner',
        primary_goal TEXT NOT NULL DEFAULT 'general_fitness',
        training_days INTEGER NOT NULL DEFAULT 3,
        session_length INTEGER NOT NULL DEFAULT 60,
        equipment TEXT NOT NULL DEFAULT '[]',
        competition_date TEXT,
        injury_history TEXT NOT NULL DEFAULT '',
        age INTEGER,
        weight REAL,
        height REAL,
        biological_sex TEXT,
        dietary_restrictions TEXT NOT NULL DEFAULT '[]',
        calorie_goal INTEGER,
        protein_target INTEGER,
        is_youth INTEGER NOT NULL DEFAULT 0,
        is_youth_under_14 INTEGER NOT NULL DEFAULT 0,
        disclaimer_dismissed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },
  {
    version: 38,
    name: 'training_plans',
    sql: `
      CREATE TABLE IF NOT EXISTS training_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sport TEXT NOT NULL DEFAULT '',
        phase TEXT NOT NULL DEFAULT 'base',
        plan_data TEXT NOT NULL DEFAULT '{}',
        is_active INTEGER NOT NULL DEFAULT 1,
        target_date TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_plans_user ON training_plans(user_id, is_active, created_at DESC);
    `,
  },
  {
    version: 39,
    name: 'training_sessions',
    sql: `
      CREATE TABLE IF NOT EXISTS training_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT,
        session_date TEXT NOT NULL,
        session_type TEXT NOT NULL DEFAULT 'strength',
        sport TEXT NOT NULL DEFAULT '',
        exercises TEXT NOT NULL DEFAULT '[]',
        duration_min INTEGER,
        rpe INTEGER,
        heart_rate_avg INTEGER,
        total_volume REAL,
        notes TEXT NOT NULL DEFAULT '',
        mood INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON training_sessions(user_id, session_date DESC);
    `,
  },
  {
    version: 40,
    name: 'nutrition_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS nutrition_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        log_date TEXT NOT NULL,
        meal_type TEXT NOT NULL DEFAULT 'meal',
        foods TEXT NOT NULL DEFAULT '[]',
        total_calories INTEGER,
        protein_g REAL,
        carbs_g REAL,
        fat_g REAL,
        water_ml INTEGER,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_nutrition_user ON nutrition_logs(user_id, log_date DESC);
    `,
  },
  {
    version: 41,
    name: 'recovery_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS recovery_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        log_date TEXT NOT NULL,
        sleep_hours REAL,
        sleep_quality INTEGER,
        hrv INTEGER,
        sore_areas TEXT NOT NULL DEFAULT '[]',
        soreness_level INTEGER,
        energy_level INTEGER,
        modalities TEXT NOT NULL DEFAULT '[]',
        readiness_score INTEGER,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_recovery_user ON recovery_logs(user_id, log_date DESC);
    `,
  },
  {
    version: 42,
    name: 'athlete_prs',
    sql: `
      CREATE TABLE IF NOT EXISTS athlete_prs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        exercise TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'lbs',
        achieved_at TEXT NOT NULL,
        session_id TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_prs_user ON athlete_prs(user_id, exercise, achieved_at DESC);
    `,
  },
  // ─── Session 14 — Social & Media Hub ───────────────────────────────────────
  {
    version: 43,
    name: 'social_connections',
    sql: `
      CREATE TABLE IF NOT EXISTS social_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        avatar_url TEXT NOT NULL DEFAULT '',
        access_token TEXT NOT NULL DEFAULT '',
        refresh_token TEXT NOT NULL DEFAULT '',
        token_expiry TIMESTAMPTZ,
        scopes TEXT NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, platform),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_social_conn_user ON social_connections(user_id);
    `,
  },
  {
    version: 44,
    name: 'media_connections',
    sql: `
      CREATE TABLE IF NOT EXISTS media_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        service TEXT NOT NULL,
        service_type TEXT NOT NULL DEFAULT 'streaming',
        deep_link_url TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, service),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_media_conn_user ON media_connections(user_id);
    `,
  },
  {
    version: 45,
    name: 'social_digests',
    sql: `
      CREATE TABLE IF NOT EXISTS social_digests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        digest_date TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '{}',
        model_used TEXT NOT NULL DEFAULT 'gpt-4o-mini',
        tokens_used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, digest_date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_digest_user ON social_digests(user_id, digest_date DESC);
    `,
  },
  {
    version: 46,
    name: 'watchlist_topics',
    sql: `
      CREATE TABLE IF NOT EXISTS watchlist_topics (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        sources TEXT NOT NULL DEFAULT '[]',
        alert_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_topics(user_id);
    `,
  },
  {
    version: 47,
    name: 'news_sources',
    sql: `
      CREATE TABLE IF NOT EXISTS news_sources (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        rss_url TEXT NOT NULL,
        bias_label TEXT NOT NULL DEFAULT 'unknown',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_news_user ON news_sources(user_id);
    `,
  },
  {
    version: 48,
    name: 'screen_time_log',
    sql: `
      CREATE TABLE IF NOT EXISTS screen_time_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        session_end TIMESTAMPTZ,
        duration_seconds INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_screen_time_user ON screen_time_log(user_id, session_start DESC);
    `,
  },
  {
    version: 49,
    name: 'scheduled_posts',
    sql: `
      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platforms TEXT NOT NULL DEFAULT '[]',
        content TEXT NOT NULL DEFAULT '',
        media_urls TEXT NOT NULL DEFAULT '[]',
        scheduled_for TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'draft',
        error_message TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_posts_user ON scheduled_posts(user_id, scheduled_for DESC);
    `,
  },
  // ─── Session 15 — AI Weekly Life Recap ─────────────────────────────────────
  {
    version: 50,
    name: 'weekly_recaps',
    sql: `
      CREATE TABLE IF NOT EXISTS weekly_recaps (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        week_start TEXT NOT NULL,
        recap_text TEXT NOT NULL DEFAULT '',
        insight_key TEXT NOT NULL DEFAULT '',
        life_score_delta REAL,
        next_week_intention TEXT NOT NULL DEFAULT '',
        next_week_habit TEXT NOT NULL DEFAULT '',
        next_week_goal TEXT NOT NULL DEFAULT '',
        opened_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, week_start),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_recap_user ON weekly_recaps(user_id, week_start DESC);
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
