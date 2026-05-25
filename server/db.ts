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
  // ─── Session 16 — Streaks & Life Wins ──────────────────────────────────────
  {
    version: 51,
    name: 'streaks_and_life_wins',
    sql: `
      CREATE TABLE IF NOT EXISTS streaks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        streak_type TEXT NOT NULL,
        habit_id TEXT NOT NULL DEFAULT '',
        current_len INTEGER NOT NULL DEFAULT 0,
        longest_ever INTEGER NOT NULL DEFAULT 0,
        last_logged TEXT,
        grace_used INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, streak_type, habit_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id, streak_type);

      CREATE TABLE IF NOT EXISTS life_wins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        win_type TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        source_hub TEXT NOT NULL DEFAULT '',
        is_shared INTEGER NOT NULL DEFAULT 0,
        occurred_on TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_life_wins_user ON life_wins(user_id, occurred_on DESC);
    `,
  },
  // ─── Session 14 Bug Fix — Student Mode ────────────────────────────────────────
  {
    version: 52,
    name: 'student_mode',
    sql: `
      CREATE TABLE IF NOT EXISTS student_courses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL DEFAULT '',
        instructor TEXT NOT NULL DEFAULT '',
        credits INTEGER NOT NULL DEFAULT 3,
        status TEXT NOT NULL DEFAULT 'active',
        grade TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#4F35C2',
        notes TEXT NOT NULL DEFAULT '',
        start_date TEXT,
        end_date TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_courses_user ON student_courses(user_id, status);

      CREATE TABLE IF NOT EXISTS flashcard_decks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        subject TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_decks_user ON flashcard_decks(user_id);

      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY,
        deck_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        ease_factor REAL NOT NULL DEFAULT 2.5,
        interval_days INTEGER NOT NULL DEFAULT 0,
        repetitions INTEGER NOT NULL DEFAULT 0,
        next_due TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_cards_deck ON flashcards(deck_id, next_due);
      CREATE INDEX IF NOT EXISTS idx_cards_due ON flashcards(user_id, next_due);

      CREATE TABLE IF NOT EXISTS student_notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        doc_type TEXT NOT NULL DEFAULT 'notes',
        course_id TEXT,
        word_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_student_notes_user ON student_notes(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS student_resources (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL DEFAULT '',
        authors TEXT NOT NULL DEFAULT '',
        year TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        source_type TEXT NOT NULL DEFAULT 'article',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_resources_user ON student_resources(user_id, created_at DESC);
    `,
  },

  // ─── Session 15 — Business Hub ────────────────────────────────────────────────
  {
    version: 53,
    name: 'business_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS business_clients (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_biz_clients_user ON business_clients(user_id, status);

      CREATE TABLE IF NOT EXISTS business_projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        client_id TEXT,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        budget REAL,
        deadline TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (client_id) REFERENCES business_clients(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_biz_projects_user ON business_projects(user_id, status);

      CREATE TABLE IF NOT EXISTS business_invoices (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        client_id TEXT,
        project_id TEXT,
        invoice_number TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        issue_date TEXT NOT NULL,
        due_date TEXT,
        notes TEXT NOT NULL DEFAULT '',
        tax_rate REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (client_id) REFERENCES business_clients(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_biz_invoices_user ON business_invoices(user_id, status);

      CREATE TABLE IF NOT EXISTS business_invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        quantity REAL NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL DEFAULT 0,
        amount REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (invoice_id) REFERENCES business_invoices(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_biz_inv_items ON business_invoice_items(invoice_id);

      CREATE TABLE IF NOT EXISTS business_expenses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_id TEXT,
        category TEXT NOT NULL DEFAULT 'Other',
        description TEXT NOT NULL DEFAULT '',
        amount REAL NOT NULL DEFAULT 0,
        expense_date TEXT NOT NULL,
        is_billable INTEGER NOT NULL DEFAULT 0,
        receipt_note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_biz_expenses_user ON business_expenses(user_id, expense_date DESC);
    `,
  },

  // ─── Enhancement 19 — Relationships & People Hub ─────────────────────────────
  {
    version: 56,
    name: 'relationships_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS relationship_contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        relationship TEXT NOT NULL DEFAULT 'friend',
        birthday TEXT,
        anniversary TEXT,
        checkin_cadence TEXT NOT NULL DEFAULT 'monthly',
        cadence_days INTEGER NOT NULL DEFAULT 30,
        last_contact TEXT,
        contact_method TEXT NOT NULL DEFAULT 'text',
        photo_emoji TEXT NOT NULL DEFAULT '👤',
        notes TEXT NOT NULL DEFAULT '',
        is_private INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_rel_contacts_user ON relationship_contacts(user_id, last_contact DESC);
      CREATE INDEX IF NOT EXISTS idx_rel_contacts_cadence ON relationship_contacts(user_id, checkin_cadence);

      CREATE TABLE IF NOT EXISTS relationship_interactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'text',
        note TEXT NOT NULL DEFAULT '',
        occurred_on TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (contact_id) REFERENCES relationship_contacts(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rel_interactions_contact ON relationship_interactions(contact_id, occurred_on DESC);
      CREATE INDEX IF NOT EXISTS idx_rel_interactions_user ON relationship_interactions(user_id, occurred_on DESC);
    `,
  },

  // ─── Enhancement 18 — Personal Finance Hub ───────────────────────────────────
  {
    version: 55,
    name: 'personal_finance_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS finance_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plaid_item_id TEXT NOT NULL DEFAULT '',
        plaid_acct_id TEXT NOT NULL DEFAULT '',
        account_type TEXT NOT NULL DEFAULT 'checking',
        display_name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        balance_date TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_fin_accts_user ON finance_accounts(user_id, is_active);

      CREATE TABLE IF NOT EXISTS finance_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        account_id TEXT,
        plaid_txn_id TEXT NOT NULL DEFAULT '',
        amount REAL NOT NULL DEFAULT 0,
        category TEXT NOT NULL DEFAULT 'Other',
        user_category TEXT NOT NULL DEFAULT '',
        merchant_name TEXT NOT NULL DEFAULT '',
        txn_date TEXT NOT NULL,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (account_id) REFERENCES finance_accounts(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_fin_txns_user ON finance_transactions(user_id, txn_date DESC);
      CREATE INDEX IF NOT EXISTS idx_fin_txns_cat ON finance_transactions(user_id, category, txn_date DESC);

      CREATE TABLE IF NOT EXISTS finance_budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        monthly_amt REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, category),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_fin_budgets_user ON finance_budgets(user_id);

      CREATE TABLE IF NOT EXISTS finance_bills (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        due_day INTEGER NOT NULL DEFAULT 1,
        recurrence TEXT NOT NULL DEFAULT 'monthly',
        is_autopay INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        category TEXT NOT NULL DEFAULT 'Bills & Utilities',
        last_paid_date TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_fin_bills_user ON finance_bills(user_id, is_active);

      CREATE TABLE IF NOT EXISTS finance_savings_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL DEFAULT 0,
        current_amount REAL NOT NULL DEFAULT 0,
        target_date TEXT NOT NULL DEFAULT '',
        emoji TEXT NOT NULL DEFAULT '💰',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_fin_goals_user ON finance_savings_goals(user_id);

      CREATE TABLE IF NOT EXISTS finance_net_worth_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        item_type TEXT NOT NULL DEFAULT 'asset',
        amount REAL NOT NULL DEFAULT 0,
        category TEXT NOT NULL DEFAULT 'Other',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_fin_nw_user ON finance_net_worth_items(user_id, item_type);
    `,
  },

  // ─── Enhancement 17 — Smart Notification Intelligence ────────────────────────
  {
    version: 54,
    name: 'notification_intelligence',
    sql: `
      CREATE TABLE IF NOT EXISTS notification_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        notif_type TEXT NOT NULL,
        trigger_key TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        opened_at TIMESTAMPTZ,
        hour_of_day INTEGER NOT NULL DEFAULT 0,
        day_of_week INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notification_events(user_id, sent_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notif_trigger ON notification_events(user_id, trigger_key, sent_at DESC);

      CREATE TABLE IF NOT EXISTS notification_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        trigger_key TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, trigger_key),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);
    `,
  },

  // ─── Enhancement 21 — Home & Property Hub ────────────────────────────────────
  {
    version: 58,
    name: 'home_property_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'primary',
        address TEXT NOT NULL DEFAULT '',
        purchase_date TEXT,
        estimated_value INTEGER,
        mortgage_amount INTEGER,
        mortgage_rate REAL,
        rent_amount INTEGER,
        zillow_url TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_properties_user ON properties(user_id);

      CREATE TABLE IF NOT EXISTS maintenance_tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        task_name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        frequency_days INTEGER NOT NULL DEFAULT 90,
        last_done TEXT,
        next_due TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_maintenance_user ON maintenance_tasks(user_id, next_due ASC);

      CREATE TABLE IF NOT EXISTS appliances (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT,
        name TEXT NOT NULL,
        brand TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        serial_number TEXT NOT NULL DEFAULT '',
        purchase_date TEXT,
        warranty_expiry TEXT,
        purchase_price INTEGER,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_appliances_user ON appliances(user_id, warranty_expiry ASC);

      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        color TEXT NOT NULL DEFAULT '',
        license_plate TEXT NOT NULL DEFAULT '',
        current_mileage INTEGER NOT NULL DEFAULT 0,
        registration_renewal TEXT,
        inspection_due TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);

      CREATE TABLE IF NOT EXISTS vehicle_service_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        vehicle_id TEXT NOT NULL,
        service_type TEXT NOT NULL DEFAULT 'other',
        service_date TEXT NOT NULL,
        mileage INTEGER,
        cost_cents INTEGER,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_service_log_vehicle ON vehicle_service_log(vehicle_id, service_date DESC);

      CREATE TABLE IF NOT EXISTS insurance_policies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        policy_type TEXT NOT NULL DEFAULT 'home',
        carrier TEXT NOT NULL,
        policy_number TEXT NOT NULL DEFAULT '',
        agent_name TEXT NOT NULL DEFAULT '',
        agent_contact TEXT NOT NULL DEFAULT '',
        premium_cents INTEGER,
        renewal_date TEXT,
        property_id TEXT,
        vehicle_id TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_insurance_user ON insurance_policies(user_id, renewal_date ASC);

      CREATE TABLE IF NOT EXISTS utility_bills (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT,
        utility_type TEXT NOT NULL DEFAULT 'electric',
        bill_month TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_utility_user ON utility_bills(user_id, utility_type, bill_month DESC);

      CREATE TABLE IF NOT EXISTS rental_ledger (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        tenant_name TEXT NOT NULL,
        lease_start TEXT NOT NULL,
        lease_end TEXT NOT NULL,
        rent_cents INTEGER NOT NULL,
        due_day INTEGER NOT NULL DEFAULT 1,
        security_deposit_cents INTEGER,
        last_payment_date TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rental_user ON rental_ledger(user_id);
    `,
  },

  // ─── Enhancement 20 — Learning Hub ──────────────────────────────────────────
  {
    version: 57,
    name: 'learning_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS learning_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'book',
        title TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT '',
        platform TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'to-read',
        progress INTEGER NOT NULL DEFAULT 0,
        total_pages INTEGER,
        tags TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        key_takeaway TEXT NOT NULL DEFAULT '',
        exam_date TEXT,
        study_hours_logged REAL NOT NULL DEFAULT 0,
        pass_fail TEXT,
        completed_at TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_learning_items_user ON learning_items(user_id, type, status);

      CREATE TABLE IF NOT EXISTS learning_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 0,
        pages_read INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        logged_date TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (item_id) REFERENCES learning_items(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_learning_logs_user ON learning_logs(user_id, logged_date DESC);
    `,
  },

  // ─── Enhancement 41 — Security & Compliance Hardening ───────────────────────
  {
    version: 63,
    name: 'user_privacy_settings',
    sql: `
      CREATE TABLE IF NOT EXISTS user_privacy_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        send_health_to_ai BOOLEAN NOT NULL DEFAULT true,
        send_finance_to_ai BOOLEAN NOT NULL DEFAULT true,
        send_mood_to_ai BOOLEAN NOT NULL DEFAULT true,
        send_relationships_to_ai BOOLEAN NOT NULL DEFAULT true,
        send_goals_to_ai BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },
  {
    version: 62,
    name: 'token_revocations',
    sql: `
      CREATE TABLE IF NOT EXISTS token_revocations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_jti TEXT NOT NULL UNIQUE,
        revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_token_revocations_jti ON token_revocations(token_jti);
      CREATE INDEX IF NOT EXISTS idx_token_revocations_user ON token_revocations(user_id);
    `,
  },
  {
    version: 61,
    name: 'audit_log',
    sql: `
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
    `,
  },

  // ─── Enhancement 23 — Smart Document Intelligence ────────────────────────────
  {
    version: 60,
    name: 'doc_extractions',
    sql: `
      CREATE TABLE IF NOT EXISTS doc_extractions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        vault_file_id TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        extracted_json TEXT NOT NULL DEFAULT '{}',
        confidence REAL NOT NULL DEFAULT 0.0,
        confirmed_at TIMESTAMPTZ,
        dismissed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_doc_extractions_user ON doc_extractions(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_doc_extractions_vault ON doc_extractions(vault_file_id);
    `,
  },

  // ─── Enhancement 22 — AI Life Coach Mode ─────────────────────────────────────
  {
    version: 59,
    name: 'ai_life_coach',
    sql: `
      CREATE TABLE IF NOT EXISTS coaching_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        ai_coach_enabled INTEGER NOT NULL DEFAULT 1,
        mental_health_enabled INTEGER NOT NULL DEFAULT 0,
        last_generated TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS coaching_insights (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        insight_type TEXT NOT NULL,
        insight_text TEXT NOT NULL,
        hubs_used TEXT NOT NULL DEFAULT '',
        dismissed INTEGER NOT NULL DEFAULT 0,
        dismiss_type TEXT,
        delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        opened_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_coaching_user ON coaching_insights(user_id, created_at DESC);
    `,
  },

  // ─── Enhancement 31 — Travel & Trip Hub ─────────────────────────────────────
  {
    version: 69,
    name: 'trips',
    sql: `
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        destination TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        trip_type TEXT NOT NULL DEFAULT 'leisure',
        travelers JSONB DEFAULT '[]',
        itinerary JSONB DEFAULT '{}',
        packing_list JSONB DEFAULT '[]',
        documents JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id, start_date DESC);
    `,
  },

  // ─── Enhancement 32 — Grocery & Meal Intelligence ────────────────────────────
  {
    version: 70,
    name: 'grocery_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS pantry_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        quantity REAL,
        unit TEXT,
        barcode TEXT,
        expiry_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_pantry_user ON pantry_items(user_id, category);

      CREATE TABLE IF NOT EXISTS grocery_lists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        week_start DATE,
        items JSONB DEFAULT '[]',
        estimated_total REAL,
        actual_total REAL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_grocery_user ON grocery_lists(user_id, week_start DESC);
    `,
  },

  // ─── Enhancement 33 — Career & Professional Growth Hub ───────────────────────
  {
    version: 71,
    name: 'career_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS career_licenses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        license_name TEXT NOT NULL,
        license_number TEXT,
        issuing_body TEXT,
        issue_date DATE,
        expiry_date DATE,
        ce_credits_required INTEGER NOT NULL DEFAULT 0,
        ce_credits_earned INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_career_licenses_user ON career_licenses(user_id, expiry_date);

      CREATE TABLE IF NOT EXISTS career_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'applied',
        applied_date DATE,
        notes TEXT,
        contacts JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_career_jobs_user ON career_jobs(user_id, status);

      CREATE TABLE IF NOT EXISTS career_ce_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        license_id TEXT NOT NULL,
        course_name TEXT NOT NULL,
        provider TEXT,
        credits REAL NOT NULL DEFAULT 0,
        completed_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (license_id) REFERENCES career_licenses(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ce_log_license ON career_ce_log(license_id, completed_date DESC);
    `,
  },

  // ─── Enhancement 34 — Predictive Life Insights Engine ────────────────────────
  {
    version: 72,
    name: 'life_predictions',
    sql: `
      CREATE TABLE IF NOT EXISTS life_predictions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        prediction_type TEXT NOT NULL,
        prediction_text TEXT NOT NULL,
        predicted_for_date DATE,
        confidence_score REAL NOT NULL DEFAULT 0.5,
        hubs_used JSONB DEFAULT '[]',
        shown_at TIMESTAMPTZ,
        acted_on BOOLEAN NOT NULL DEFAULT false,
        outcome_score_delta REAL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_predictions_user ON life_predictions(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_predictions_shown ON life_predictions(user_id, shown_at) WHERE shown_at IS NULL;
    `,
  },

  // ─── Enhancement 35 — White-Label Advisor Platform ───────────────────────────
  {
    version: 73,
    name: 'advisor_platform',
    sql: `
      CREATE TABLE IF NOT EXISTS advisor_firms (
        id TEXT PRIMARY KEY,
        firm_name TEXT NOT NULL,
        owner_user_id TEXT NOT NULL,
        brand_logo_url TEXT,
        brand_primary_color TEXT DEFAULT '#4F35C2',
        custom_domain TEXT,
        plan TEXT NOT NULL DEFAULT 'advisor',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (owner_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS advisor_clients (
        id TEXT PRIMARY KEY,
        firm_id TEXT NOT NULL,
        client_user_id TEXT NOT NULL,
        shared_hubs JSONB DEFAULT '[]',
        advisor_notes TEXT,
        linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (firm_id) REFERENCES advisor_firms(id) ON DELETE CASCADE,
        FOREIGN KEY (client_user_id) REFERENCES users(id),
        UNIQUE(firm_id, client_user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_advisor_clients_firm ON advisor_clients(firm_id);
    `,
  },

  // ─── Enhancement 26 — Universal Web App Credential Bridge ──────────────────
  {
    version: 64,
    name: 'credential_bridge_connections',
    sql: `
      CREATE TABLE IF NOT EXISTS credential_bridge_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        app_name TEXT NOT NULL,
        app_url TEXT NOT NULL,
        connection_type TEXT NOT NULL DEFAULT 'oauth',
        oauth_token_enc TEXT,
        oauth_refresh_enc TEXT,
        credential_enc TEXT,
        field_mapping JSONB DEFAULT '{}',
        target_hub TEXT NOT NULL DEFAULT 'athlete',
        sync_frequency TEXT NOT NULL DEFAULT 'daily',
        last_synced_at TIMESTAMPTZ,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        sync_error TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_cbc_user ON credential_bridge_connections(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_cbc_hub ON credential_bridge_connections(user_id, target_hub);
    `,
  },

  // ─── Enhancement 27 — AI Agent Task Execution ───────────────────────────────
  {
    version: 65,
    name: 'agent_tasks',
    sql: `
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        task_type TEXT NOT NULL DEFAULT 'general',
        task_description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending_approval',
        preview_shown_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        executed_at TIMESTAMPTZ,
        result_summary TEXT,
        confirmation_id TEXT,
        cost_amount REAL,
        can_undo BOOLEAN NOT NULL DEFAULT false,
        undo_deadline TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(user_id, status);
    `,
  },

  // ─── Enhancement 28 — Voice-First Ambient AI Mode ───────────────────────────
  {
    version: 66,
    name: 'voice_sessions',
    sql: `
      CREATE TABLE IF NOT EXISTS voice_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        transcript TEXT NOT NULL DEFAULT '',
        intent_type TEXT,
        hub_routed TEXT,
        action_taken TEXT,
        response_text TEXT,
        duration_seconds INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id, created_at DESC);
    `,
  },

  // ─── Enhancement 29 — Life Timeline & Memory Archive ────────────────────────
  {
    version: 67,
    name: 'timeline_memories',
    sql: `
      CREATE TABLE IF NOT EXISTS timeline_memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        occurred_on DATE NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        hub_source TEXT,
        memory_type TEXT NOT NULL DEFAULT 'manual',
        photo_url TEXT,
        is_shared BOOLEAN NOT NULL DEFAULT false,
        is_private BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_timeline_user ON timeline_memories(user_id, occurred_on DESC);
      CREATE INDEX IF NOT EXISTS idx_timeline_type ON timeline_memories(user_id, memory_type);
    `,
  },

  // ─── Enhancement 30 — Estate & Legacy Vault ─────────────────────────────────
  {
    version: 68,
    name: 'estate_vault',
    sql: `
      CREATE TABLE IF NOT EXISTS estate_vault (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        section TEXT NOT NULL,
        title TEXT,
        content_enc TEXT,
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_estate_vault_user ON estate_vault(user_id, section);

      CREATE TABLE IF NOT EXISTS trusted_access_delegates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        delegate_name TEXT NOT NULL DEFAULT '',
        delegate_email TEXT NOT NULL DEFAULT '',
        relationship TEXT NOT NULL DEFAULT '',
        access_level TEXT NOT NULL DEFAULT 'full',
        is_verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_trusted_delegates_user ON trusted_access_delegates(user_id);

      CREATE TABLE IF NOT EXISTS estate_disclaimer_acks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL DEFAULT 'PSAI-EST-DISC-v1.0',
        acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },

  // ─── Enhancement 36 — AI Personal Digital Twin ──────────────────────────────
  {
    version: 74,
    name: 'digital_twin',
    sql: `
      CREATE TABLE IF NOT EXISTS digital_twin_profile (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        behavioral_model JSONB NOT NULL DEFAULT '{}',
        voice_model JSONB NOT NULL DEFAULT '{}',
        decision_patterns JSONB NOT NULL DEFAULT '{}',
        long_term_memory JSONB NOT NULL DEFAULT '[]',
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS twin_memory_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'preference',
        fact TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.7,
        source_hubs JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_twin_memories_user ON twin_memory_entries(user_id, category);
    `,
  },

  // ─── Enhancement 37 — AI Companion Mode ─────────────────────────────────────
  {
    version: 75,
    name: 'companion_mode',
    sql: `
      CREATE TABLE IF NOT EXISTS companion_profile (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        companion_name TEXT NOT NULL DEFAULT 'Alex',
        personality_style TEXT NOT NULL DEFAULT 'warm',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS companion_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'user_initiated',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_companion_convo_user ON companion_conversations(user_id, created_at DESC);
    `,
  },

  // ─── Enhancement 38 — Pet Hub ────────────────────────────────────────────────
  {
    version: 76,
    name: 'pet_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS pet_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        species TEXT NOT NULL DEFAULT 'dog',
        breed TEXT,
        dob DATE,
        weight_lbs REAL,
        microchip_id TEXT,
        insurance_provider TEXT,
        vet_name TEXT,
        vet_phone TEXT,
        photo_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS pet_health_records (
        id TEXT PRIMARY KEY,
        pet_id TEXT NOT NULL,
        record_type TEXT NOT NULL DEFAULT 'checkup',
        title TEXT NOT NULL,
        notes TEXT,
        date DATE NOT NULL,
        next_due_date DATE,
        document_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (pet_id) REFERENCES pet_profiles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pet_weight_logs (
        id TEXT PRIMARY KEY,
        pet_id TEXT NOT NULL,
        weight_lbs REAL NOT NULL,
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (pet_id) REFERENCES pet_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_pet_profiles_user ON pet_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_pet_records_pet ON pet_health_records(pet_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_pet_records_due ON pet_health_records(next_due_date) WHERE next_due_date IS NOT NULL;
    `,
  },

  // ─── Enhancement 39 — AI Sleep Coach ────────────────────────────────────────
  {
    version: 77,
    name: 'sleep_coach',
    sql: `
      CREATE TABLE IF NOT EXISTS sleep_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date DATE NOT NULL,
        total_minutes INT,
        deep_minutes INT,
        rem_minutes INT,
        light_minutes INT,
        awake_minutes INT,
        hrv_avg REAL,
        resting_hr REAL,
        sleep_score INT,
        source TEXT NOT NULL DEFAULT 'manual',
        stages_json JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS sleep_environment_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date DATE NOT NULL,
        room_temp_f REAL,
        alcohol_drinks INT,
        caffeine_mg INT,
        screen_time_min INT,
        stress_level INT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_sleep_logs_user ON sleep_logs(user_id, date DESC);
    `,
  },

  // ─── Enhancement 40 — Consumer Legal Hub ────────────────────────────────────
  {
    version: 78,
    name: 'legal_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS legal_documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        document_name TEXT NOT NULL,
        document_type TEXT NOT NULL DEFAULT 'contract',
        s3_url TEXT,
        ai_summary TEXT,
        risk_flags JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS legal_chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_type TEXT NOT NULL DEFAULT 'know_your_rights',
        messages JSONB NOT NULL DEFAULT '[]',
        output_document_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS legal_disclaimer_acks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL DEFAULT 'PSAI-LEGAL-DISC-v1.0',
        acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_legal_docs_user ON legal_documents(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_legal_sessions_user ON legal_chat_sessions(user_id, created_at DESC);
    `,
  },

  // ─── Enhancement 42 — Life Score Social & Accountability Circles ────────────
  {
    version: 79,
    name: 'circles',
    sql: `
      CREATE TABLE IF NOT EXISTS circles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_by TEXT NOT NULL,
        invite_code TEXT NOT NULL UNIQUE,
        max_members INT NOT NULL DEFAULT 8,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_circles_invite ON circles(invite_code);

      CREATE TABLE IF NOT EXISTS circle_members (
        id TEXT PRIMARY KEY,
        circle_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        share_life_score BOOLEAN NOT NULL DEFAULT TRUE,
        share_streaks BOOLEAN NOT NULL DEFAULT TRUE,
        share_goal_names BOOLEAN NOT NULL DEFAULT FALSE,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(circle_id, user_id),
        FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS circle_nudges (
        id TEXT PRIMARY KEY,
        circle_id TEXT NOT NULL,
        from_user_id TEXT NOT NULL,
        to_user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users(id),
        FOREIGN KEY (to_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS circle_challenges (
        id TEXT PRIMARY KEY,
        circle_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        challenge_type TEXT NOT NULL DEFAULT 'streak',
        target_value INT NOT NULL DEFAULT 7,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS weekly_circle_feed (
        id TEXT PRIMARY KEY,
        circle_id TEXT NOT NULL,
        week_start DATE NOT NULL,
        encouragement_message TEXT NOT NULL,
        feed_data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(circle_id, week_start),
        FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE
      );
    `,
  },

  // ─── Enhancement 43 — Smart Bill Negotiation & Subscription Audit ────────────
  {
    version: 80,
    name: 'bills',
    sql: `
      CREATE TABLE IF NOT EXISTS subscription_scans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        merchant_name TEXT NOT NULL,
        category TEXT,
        monthly_amount REAL NOT NULL DEFAULT 0,
        annual_amount REAL NOT NULL DEFAULT 0,
        first_detected DATE,
        last_charged DATE,
        status TEXT NOT NULL DEFAULT 'active',
        unused_flag BOOLEAN NOT NULL DEFAULT FALSE,
        overpaying_flag BOOLEAN NOT NULL DEFAULT FALSE,
        savings_opportunity REAL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_subs_user ON subscription_scans(user_id, status);

      CREATE TABLE IF NOT EXISTS negotiation_scripts (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        script_text TEXT NOT NULL,
        provider_name TEXT NOT NULL,
        estimated_savings REAL,
        script_type TEXT NOT NULL DEFAULT 'cancel_threat',
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (subscription_id) REFERENCES subscription_scans(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS savings_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subscription_id TEXT,
        action_type TEXT NOT NULL DEFAULT 'negotiated',
        monthly_savings REAL NOT NULL DEFAULT 0,
        annual_savings REAL NOT NULL DEFAULT 0,
        achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },

  // ─── Enhancement 44 — Life OS Widget Layer ──────────────────────────────────
  {
    version: 81,
    name: 'widgets',
    sql: `
      CREATE TABLE IF NOT EXISTS widget_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        enabled_widgets JSONB NOT NULL DEFAULT '["life_score","morning_briefing","streaks"]',
        widget_refresh_hour INT NOT NULL DEFAULT 6,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },

  // ─── Enhancement 45 — Smart Calendar Intelligence ───────────────────────────
  {
    version: 82,
    name: 'calendar',
    sql: `
      CREATE TABLE IF NOT EXISTS calendar_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        calendar_id TEXT,
        last_synced TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, provider),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider_event_id TEXT,
        title TEXT NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
        meeting_type TEXT NOT NULL DEFAULT 'meeting',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_cal_events_user ON calendar_events(user_id, start_time);

      CREATE TABLE IF NOT EXISTS schedule_analysis (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        week_start DATE NOT NULL,
        total_meeting_hours REAL,
        overload_days JSONB NOT NULL DEFAULT '[]',
        goal_conflicts JSONB NOT NULL DEFAULT '[]',
        optimization_suggestions JSONB NOT NULL DEFAULT '[]',
        goal_alignment_score INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, week_start),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },

  // ─── Enhancement 46 — Financial Life Score Sub-Engine ───────────────────────
  {
    version: 83,
    name: 'financial_score',
    sql: `
      CREATE TABLE IF NOT EXISTS financial_score_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        score_date DATE NOT NULL,
        composite_score INT NOT NULL DEFAULT 0,
        net_worth_score INT NOT NULL DEFAULT 0,
        dti_score INT NOT NULL DEFAULT 0,
        savings_score INT NOT NULL DEFAULT 0,
        emergency_fund_score INT NOT NULL DEFAULT 0,
        investment_score INT NOT NULL DEFAULT 0,
        bill_payment_score INT NOT NULL DEFAULT 0,
        net_worth REAL,
        monthly_savings_rate REAL,
        emergency_fund_months REAL,
        dti_ratio REAL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, score_date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_fin_score_user ON financial_score_history(user_id, score_date DESC);

      CREATE TABLE IF NOT EXISTS financial_assets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        asset_name TEXT NOT NULL,
        asset_type TEXT NOT NULL DEFAULT 'other',
        current_value REAL NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'manual',
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS financial_liabilities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        liability_name TEXT NOT NULL,
        liability_type TEXT NOT NULL DEFAULT 'other',
        balance REAL NOT NULL DEFAULT 0,
        monthly_payment REAL,
        interest_rate REAL,
        source TEXT NOT NULL DEFAULT 'manual',
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },

  {
    version: 84,
    name: 'family_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        dob DATE,
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

      CREATE TABLE IF NOT EXISTS family_tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        assignee_name TEXT,
        due_date DATE,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_family_tasks_user ON family_tasks(user_id);

      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        relationship TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);
    `,
  },
  {
    version: 85,
    name: 'awareness_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS daily_intentions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        intention TEXT NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_daily_intentions_user ON daily_intentions(user_id, date DESC);

      CREATE TABLE IF NOT EXISTS gratitude_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        items JSONB NOT NULL DEFAULT '[]',
        date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_gratitude_entries_user ON gratitude_entries(user_id, date DESC);

      CREATE TABLE IF NOT EXISTS breathing_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        exercise_type TEXT NOT NULL DEFAULT '4-7-8',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_breathing_sessions_user ON breathing_sessions(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS mood_checkins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_mood_checkins_user ON mood_checkins(user_id, date DESC);
    `,
  },
  {
    version: 86,
    name: 'life_events_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS life_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        media_url TEXT,
        ai_checklist JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_life_events_user ON life_events(user_id, event_date DESC);
    `,
  },
  {
    version: 87,
    name: 'network_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS network_contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        company TEXT,
        role TEXT,
        email TEXT,
        phone TEXT,
        relationship_type TEXT NOT NULL DEFAULT 'contact',
        last_contact_date DATE,
        follow_up_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_network_contacts_user ON network_contacts(user_id);

      CREATE TABLE IF NOT EXISTS network_wins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        contact_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_network_wins_user ON network_wins(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS network_notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_network_notes_contact ON network_notes(contact_id, created_at DESC);
    `,
  },

  // ─── Enhancement — Onboarding (Enhancements 4-6) ────────────────────────────
  {
    version: 92,
    name: 'onboarding_fields',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_persona TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_goal_category TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_goal TEXT;
      -- Existing users (including demo-user) skip onboarding — backward compat
      UPDATE users SET onboarding_completed_at = NOW() WHERE onboarding_completed_at IS NULL;
    `,
  },
  {
    version: 93,
    name: 'onboarding_connections',
    sql: `
      CREATE TABLE IF NOT EXISTS onboarding_connections (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT        NOT NULL,
        provider    TEXT        NOT NULL,
        status      TEXT        NOT NULL DEFAULT 'pending',
        metadata    JSONB       NOT NULL DEFAULT '{}',
        connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_oc_user_provider ON onboarding_connections(user_id, provider);
    `,
  },

  // ─── Enhancement 22: Family Plan Private/Shared Toggle ──────────────────────
  {
    version: 98,
    name: 'family_sharing',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS family_sharing_enabled BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE life_wins ADD COLUMN IF NOT EXISTS is_family_shared BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_family_shared BOOLEAN NOT NULL DEFAULT FALSE;
    `,
  },

  // ─── Enhancement 17: "Not Now" Mode ─────────────────────────────────────────
  {
    version: 97,
    name: 'not_now_mode',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS not_now_until TIMESTAMPTZ;
    `,
  },

  // ─── Enhancement 7-8: Morning Briefings + Weekly Life Review ─────────────────
  {
    version: 94,
    name: 'morning_briefings',
    sql: `
      CREATE TABLE IF NOT EXISTS morning_briefings (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      TEXT        NOT NULL,
        briefing_date DATE       NOT NULL,
        headline     TEXT        NOT NULL DEFAULT '',
        priorities   JSONB       NOT NULL DEFAULT '[]',
        insight      TEXT        NOT NULL DEFAULT '',
        motivation   TEXT        NOT NULL DEFAULT '',
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mb_user_date ON morning_briefings(user_id, briefing_date);
    `,
  },
  {
    version: 95,
    name: 'weekly_reviews',
    sql: `
      CREATE TABLE IF NOT EXISTS weekly_reviews (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      TEXT        NOT NULL,
        week_start   DATE        NOT NULL,
        narrative    TEXT        NOT NULL DEFAULT '',
        highlights   JSONB       NOT NULL DEFAULT '[]',
        focus_next   TEXT        NOT NULL DEFAULT '',
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wr_user_week ON weekly_reviews(user_id, week_start);
    `,
  },
  {
    version: 96,
    name: 'push_tokens',
    sql: `
      CREATE TABLE IF NOT EXISTS push_tokens (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      TEXT        NOT NULL,
        token        TEXT        NOT NULL,
        platform     TEXT        NOT NULL DEFAULT 'web',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_token ON push_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_pt_user ON push_tokens(user_id);
    `,
  },

  // ─── Enhancement — Three-Tier Memory System (Enhancements 1-3) ─────────────
  {
    version: 88,
    name: 'three_tier_memory',
    sql: `
      CREATE TABLE IF NOT EXISTS user_memories (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT        NOT NULL,
        namespace   TEXT        NOT NULL CHECK (namespace IN ('episodic','semantic','procedural')),
        content     TEXT        NOT NULL,
        context_key TEXT,
        metadata    JSONB       NOT NULL DEFAULT '{}',
        relevance   REAL        NOT NULL DEFAULT 1.0,
        is_stale    BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at  TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_um_user_ns      ON user_memories(user_id, namespace);
      CREATE INDEX IF NOT EXISTS idx_um_user_created ON user_memories(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_um_user_ctx     ON user_memories(user_id, context_key);
    `,
  },
  {
    version: 89,
    name: 'memory_audit_log',
    sql: `
      CREATE TABLE IF NOT EXISTS memory_audit_log (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT        NOT NULL,
        action      TEXT        NOT NULL,
        namespace   TEXT,
        item_id     UUID,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_mal_user ON memory_audit_log(user_id, created_at DESC);
    `,
  },
  {
    version: 90,
    name: 'memory_trends',
    sql: `
      CREATE TABLE IF NOT EXISTS memory_trends (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      TEXT        NOT NULL,
        trend_type   TEXT        NOT NULL,
        description  TEXT        NOT NULL,
        confidence   REAL        NOT NULL DEFAULT 0.5,
        period_start TIMESTAMPTZ,
        period_end   TIMESTAMPTZ,
        data         JSONB       NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_mt_user ON memory_trends(user_id, created_at DESC);
    `,
  },
  {
    version: 91,
    name: 'memory_job_runs',
    sql: `
      CREATE TABLE IF NOT EXISTS memory_job_runs (
        id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id   TEXT        NOT NULL,
        job_type  TEXT        NOT NULL,
        status    TEXT        NOT NULL DEFAULT 'pending',
        result    JSONB,
        ran_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_mjr_user ON memory_job_runs(user_id, job_type, ran_at DESC);
    `,
  },

  // ─── Session 14 Enhancements 1-8 ───────────────────────────────────────────
  {
    version: 99,
    name: 'life_scores',
    sql: `
      CREATE TABLE IF NOT EXISTS life_scores (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        score_date TEXT NOT NULL,
        total_score INTEGER NOT NULL DEFAULT 0,
        finance_score INTEGER NOT NULL DEFAULT 0,
        health_score INTEGER NOT NULL DEFAULT 0,
        social_score INTEGER NOT NULL DEFAULT 0,
        tasks_score INTEGER NOT NULL DEFAULT 0,
        mood_score INTEGER NOT NULL DEFAULT 0,
        ai_summary TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, score_date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_life_scores_user ON life_scores(user_id, score_date DESC);
      CREATE TABLE IF NOT EXISTS score_weights (
        user_id TEXT PRIMARY KEY,
        finance_weight REAL NOT NULL DEFAULT 0.25,
        health_weight REAL NOT NULL DEFAULT 0.25,
        social_weight REAL NOT NULL DEFAULT 0.20,
        tasks_weight REAL NOT NULL DEFAULT 0.15,
        mood_weight REAL NOT NULL DEFAULT 0.15,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },
  {
    version: 100,
    name: 'daily_briefings_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS daily_briefings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        briefing_date TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '{}',
        hub_snapshot TEXT NOT NULL DEFAULT '{}',
        model_used TEXT NOT NULL DEFAULT 'claude-sonnet-4-5',
        tokens_used INTEGER NOT NULL DEFAULT 0,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, briefing_date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_daily_briefings_user ON daily_briefings(user_id, briefing_date DESC);
    `,
  },
  {
    version: 101,
    name: 'goals_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'personal',
        target_value REAL NOT NULL DEFAULT 0,
        current_value REAL NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT '%',
        hub_source TEXT,
        hub_metric TEXT,
        target_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        ai_coaching_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id, status, created_at DESC);
      CREATE TABLE IF NOT EXISTS goal_milestones (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        milestone_pct INTEGER NOT NULL,
        achieved_at TIMESTAMPTZ,
        ai_message TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_milestones_goal ON goal_milestones(goal_id);
      CREATE TABLE IF NOT EXISTS goal_progress_log (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        logged_value REAL NOT NULL,
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source TEXT NOT NULL DEFAULT 'manual',
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_progress_goal ON goal_progress_log(goal_id, logged_at DESC);
    `,
  },
  {
    version: 102,
    name: 'journal_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        entry_date TEXT NOT NULL,
        mood_score INTEGER NOT NULL DEFAULT 3,
        mood_label TEXT NOT NULL DEFAULT 'okay',
        content TEXT NOT NULL DEFAULT '',
        ai_prompt_used TEXT NOT NULL DEFAULT '',
        ai_reflection TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        is_private BOOLEAN NOT NULL DEFAULT true,
        ai_opted_in BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id, entry_date DESC);
      CREATE TABLE IF NOT EXISTS mood_insights (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        insight_date TEXT NOT NULL,
        insight_type TEXT NOT NULL DEFAULT 'pattern',
        content TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_mood_insights_user ON mood_insights(user_id, insight_date DESC);
    `,
  },
  {
    version: 103,
    name: 'life_events_enhancements',
    sql: `
      ALTER TABLE life_events ADD COLUMN IF NOT EXISTS hub_source TEXT;
      ALTER TABLE life_events ADD COLUMN IF NOT EXISTS hub_ref_id TEXT;
      ALTER TABLE life_events ADD COLUMN IF NOT EXISTS amount REAL;
      ALTER TABLE life_events ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none';
      ALTER TABLE life_events ADD COLUMN IF NOT EXISTS reminder_days INTEGER NOT NULL DEFAULT 3;
      ALTER TABLE life_events ADD COLUMN IF NOT EXISTS ai_prep_suggestions TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE life_events ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false;
    `,
  },
  {
    version: 104,
    name: 'chat_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS chat_threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New conversation',
        hub_context TEXT NOT NULL DEFAULT '[]',
        last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id, last_message_at DESC);
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        content TEXT NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        model_used TEXT NOT NULL DEFAULT 'claude-haiku-4-5',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at ASC);
    `,
  },
  {
    version: 105,
    name: 'sync_queue',
    sql: `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL DEFAULT 'CREATE',
        table_name TEXT NOT NULL,
        record_id TEXT,
        payload TEXT NOT NULL DEFAULT '{}',
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id, created_at ASC);
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

  // ─── Tier 2 Enhancement 27 — Dark Mode (theme preference) ───────────────────
  {
    version: 106,
    name: 'theme_preference',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference TEXT NOT NULL DEFAULT 'system';
    `,
  },

  // ─── Tier 2 Enhancement 25 — Energy-Aware Scheduling ────────────────────────
  {
    version: 107,
    name: 'energy_ratings',
    sql: `
      CREATE TABLE IF NOT EXISTS energy_ratings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        energy_level INTEGER NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
        energy_type TEXT NOT NULL DEFAULT 'general',
        noted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_energy_user ON energy_ratings(user_id, noted_at DESC);
      CREATE TABLE IF NOT EXISTS energy_profiles (
        user_id TEXT PRIMARY KEY,
        peak_hours TEXT NOT NULL DEFAULT '[]',
        low_hours TEXT NOT NULL DEFAULT '[]',
        dominant_type TEXT NOT NULL DEFAULT 'general',
        last_computed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },

  // ─── Tier 2 Enhancement 26 — Burnout Pattern Detection ──────────────────────
  {
    version: 108,
    name: 'burnout_signals',
    sql: `
      CREATE TABLE IF NOT EXISTS burnout_signals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        value REAL NOT NULL,
        signal_date DATE NOT NULL DEFAULT CURRENT_DATE,
        raw_data TEXT NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_burnout_user ON burnout_signals(user_id, signal_date DESC);
      CREATE TABLE IF NOT EXISTS burnout_interventions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        risk_score REAL NOT NULL,
        intervention_text TEXT NOT NULL,
        dismissed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `,
  },

  // ─── Tier 2 Enhancement 30 — Referral Loop ───────────────────────────────────
  {
    version: 109,
    name: 'referral_codes',
    sql: `
      CREATE TABLE IF NOT EXISTS referral_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        credits_earned INTEGER NOT NULL DEFAULT 0,
        conversions INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_referral_code ON referral_codes(code);
      CREATE TABLE IF NOT EXISTS referral_conversions (
        id TEXT PRIMARY KEY,
        referral_code TEXT NOT NULL,
        referrer_user_id TEXT NOT NULL,
        converted_user_id TEXT NOT NULL,
        converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        credit_amount INTEGER NOT NULL DEFAULT 500
      );
    `,
  },

  // ─── Tier 2 Enhancement 32 — A/B Testing Scaffold ───────────────────────────
  {
    version: 110,
    name: 'feature_flags',
    sql: `
      CREATE TABLE IF NOT EXISTS feature_flags (
        flag_key TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT true,
        rollout_pct INTEGER NOT NULL DEFAULT 100,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ab_experiments (
        exp_key TEXT PRIMARY KEY,
        variant_a TEXT NOT NULL,
        variant_b TEXT NOT NULL,
        traffic_split INTEGER NOT NULL DEFAULT 50,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS user_flag_assignments (
        user_id TEXT NOT NULL,
        flag_key TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'control',
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, flag_key)
      );
      -- Seed default feature flags
      INSERT INTO feature_flags (flag_key, enabled, rollout_pct, description)
      VALUES
        ('dark_mode',           true,  100, 'Dark mode theme toggle'),
        ('energy_scheduling',   true,  100, 'Energy-aware scheduling'),
        ('burnout_detection',   true,  100, 'Burnout pattern detection'),
        ('referral_loop',       true,  100, 'Referral loop and credit system'),
        ('model_routing_v2',    true,  100, 'Enhanced model routing intelligence'),
        ('confidence_scoring',  true,  100, 'AI confidence scoring + hedge phrases')
      ON CONFLICT DO NOTHING;
    `,
  },

  // ─── Enhancement: Pregnancy & Motherhood Hub ─────────────────────────────────
  {
    version: 111,
    name: 'pregnancy_hub',
    sql: `
      CREATE TABLE IF NOT EXISTS pregnancy_profiles (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phase TEXT NOT NULL DEFAULT 'trying', -- 'trying'|'pregnant'|'postpartum'
        lmp_date TEXT,                         -- last menstrual period YYYY-MM-DD
        due_date TEXT,                         -- YYYY-MM-DD
        baby_name TEXT,
        week_override INTEGER,                 -- manual week override
        cycle_length INTEGER NOT NULL DEFAULT 28,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS baby_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_id INTEGER NOT NULL REFERENCES pregnancy_profiles(id) ON DELETE CASCADE,
        log_type TEXT NOT NULL,               -- 'kick'|'feeding'|'sleep'|'diaper'|'weight'|'symptom'
        log_value TEXT,
        log_date TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cycle_tracking (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cycle_date TEXT NOT NULL,             -- YYYY-MM-DD
        period_flow TEXT,                     -- 'none'|'light'|'medium'|'heavy'
        symptoms TEXT NOT NULL DEFAULT '[]',  -- JSON array
        mood TEXT,
        basal_temp REAL,
        cm_type TEXT,                         -- cervical mucus
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, cycle_date)
      );
    `,
  },

  // ─── Enhancement: AM Dashboard Widget Config ──────────────────────────────────
  {
    version: 112,
    name: 'dashboard_config',
    sql: `
      CREATE TABLE IF NOT EXISTS dashboard_config (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        widgets_enabled TEXT NOT NULL DEFAULT '["morning_briefing","life_score","goals","streaks","mood","energy","finance","health"]',
        widget_order TEXT NOT NULL DEFAULT '[]',
        briefing_time TEXT NOT NULL DEFAULT '07:00',
        compact_mode BOOLEAN NOT NULL DEFAULT false,
        auto_refresh BOOLEAN NOT NULL DEFAULT true,
        refresh_interval_mins INTEGER NOT NULL DEFAULT 30,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },

  // ─── Enhancement: Customizable Dashboard Tabs ────────────────────────────────
  {
    version: 113,
    name: 'user_tabs',
    sql: `
      CREATE TABLE IF NOT EXISTS user_tabs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tab_key TEXT NOT NULL,
        label TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'layout-dashboard',
        tab_type TEXT NOT NULL DEFAULT 'built-in', -- 'built-in'|'custom'
        href TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_visible BOOLEAN NOT NULL DEFAULT true,
        accent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, tab_key)
      );
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
  const pending = MIGRATIONS.filter((m) => m.version > applied).sort((a, b) => a.version - b.version);
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
