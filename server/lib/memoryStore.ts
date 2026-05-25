/**
 * Three-Tier Memory Store — Propel Stack AI, LLC
 *
 * Episodic  — raw event log of what happened (conversations, goals, check-ins)
 * Semantic  — distilled beliefs, preferences, and facts about the user (AI-updated weekly)
 * Procedural — how the user likes things done (communication style, workflow prefs)
 *
 * Context stitching: buildMemoryContext() compresses all three into a system-prompt prefix
 * that is prepended to every AI conversation so the model always has continuity.
 */
import { db } from '../db.js';

export type MemoryNamespace = 'episodic' | 'semantic' | 'procedural';

export interface MemoryEntry {
  id: string;
  user_id: string;
  namespace: MemoryNamespace;
  content: string;
  context_key: string | null;
  relevance: number;
  is_stale: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/** Log a raw episodic event (called automatically after every AI exchange). */
export async function logEpisodic(
  userId: string,
  content: string,
  contextKey?: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_memories (user_id, namespace, content, context_key)
       VALUES (?, 'episodic', ?, ?)`,
    )
    .run(userId, content, contextKey ?? null);
}

/** Upsert a semantic memory (one per context_key per user). */
export async function upsertSemantic(
  userId: string,
  content: string,
  contextKey: string,
): Promise<void> {
  const existing = (await db
    .prepare(
      `SELECT id FROM user_memories
       WHERE user_id = ? AND namespace = 'semantic' AND context_key = ? AND is_stale = FALSE
       LIMIT 1`,
    )
    .get(userId, contextKey)) as { id: string } | undefined;

  if (existing) {
    await db
      .prepare(
        `UPDATE user_memories SET content = ?, updated_at = NOW() WHERE id = ?`,
      )
      .run(content, existing.id);
  } else {
    await db
      .prepare(
        `INSERT INTO user_memories (user_id, namespace, content, context_key)
         VALUES (?, 'semantic', ?, ?)`,
      )
      .run(userId, content, contextKey);
  }
}

/** Upsert a procedural preference (one per context_key per user). */
export async function upsertProcedural(
  userId: string,
  content: string,
  contextKey: string,
): Promise<void> {
  const existing = (await db
    .prepare(
      `SELECT id FROM user_memories
       WHERE user_id = ? AND namespace = 'procedural' AND context_key = ? AND is_stale = FALSE
       LIMIT 1`,
    )
    .get(userId, contextKey)) as { id: string } | undefined;

  if (existing) {
    await db
      .prepare(
        `UPDATE user_memories SET content = ?, updated_at = NOW() WHERE id = ?`,
      )
      .run(content, existing.id);
  } else {
    await db
      .prepare(
        `INSERT INTO user_memories (user_id, namespace, content, context_key)
         VALUES (?, 'procedural', ?, ?)`,
      )
      .run(userId, content, contextKey);
  }
}

// ─── Context stitching (Enhancement 2) ───────────────────────────────────────

/**
 * Builds a compressed memory context string to prepend to every AI system prompt.
 * Reads last 30 days of episodic + current semantic + procedural memories.
 * Returns empty string when user has no memories yet.
 */
export async function buildMemoryContext(userId: string): Promise<string> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [episodic, semantic, procedural] = await Promise.all([
    db
      .prepare(
        `SELECT content, context_key, created_at FROM user_memories
         WHERE user_id = ? AND namespace = 'episodic' AND is_stale = FALSE
           AND created_at > ?
         ORDER BY created_at DESC LIMIT 40`,
      )
      .all(userId, thirtyDaysAgo) as MemoryEntry[],

    db
      .prepare(
        `SELECT content, context_key FROM user_memories
         WHERE user_id = ? AND namespace = 'semantic' AND is_stale = FALSE
         ORDER BY updated_at DESC LIMIT 25`,
      )
      .all(userId) as MemoryEntry[],

    db
      .prepare(
        `SELECT content FROM user_memories
         WHERE user_id = ? AND namespace = 'procedural' AND is_stale = FALSE
         ORDER BY updated_at DESC LIMIT 15`,
      )
      .all(userId) as MemoryEntry[],
  ]);

  if (!episodic.length && !semantic.length && !procedural.length) return '';

  const parts: string[] = [
    '[PERSONALIZATION CONTEXT — use this to give tailored, relevant, continuous responses]',
  ];

  if (semantic.length) {
    parts.push(
      `About this user:\n${semantic.map((m) => `• ${m.content}`).join('\n')}`,
    );
  }
  if (procedural.length) {
    parts.push(
      `How they prefer to work:\n${procedural.map((m) => `• ${m.content}`).join('\n')}`,
    );
  }
  if (episodic.length) {
    parts.push(
      `Recent context (last 30 days):\n${episodic
        .slice(0, 15)
        .map((m) => `• ${m.content}`)
        .join('\n')}`,
    );
  }

  return parts.join('\n\n') + '\n[END CONTEXT]\n\n';
}

// ─── Memory Health Card data ──────────────────────────────────────────────────

export interface MemoryHealthData {
  episodic: MemoryEntry[];
  semantic: MemoryEntry[];
  procedural: MemoryEntry[];
  trends: Record<string, unknown>[];
  auditLog: Record<string, unknown>[];
  totalCount: number;
  oldestEntry: string | null;
}

export async function getMemoryHealth(userId: string): Promise<MemoryHealthData> {
  const [episodic, semantic, procedural, trends, auditLog] = await Promise.all([
    db
      .prepare(
        `SELECT * FROM user_memories
         WHERE user_id = ? AND namespace = 'episodic' AND is_stale = FALSE
         ORDER BY created_at DESC LIMIT 60`,
      )
      .all(userId) as MemoryEntry[],
    db
      .prepare(
        `SELECT * FROM user_memories
         WHERE user_id = ? AND namespace = 'semantic' AND is_stale = FALSE
         ORDER BY updated_at DESC`,
      )
      .all(userId) as MemoryEntry[],
    db
      .prepare(
        `SELECT * FROM user_memories
         WHERE user_id = ? AND namespace = 'procedural' AND is_stale = FALSE
         ORDER BY updated_at DESC`,
      )
      .all(userId) as MemoryEntry[],
    db
      .prepare(
        `SELECT * FROM memory_trends WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .all(userId),
    db
      .prepare(
        `SELECT * FROM memory_audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      )
      .all(userId),
  ]);

  const totalCount = episodic.length + semantic.length + procedural.length;
  const allDates = [...episodic, ...semantic, ...procedural]
    .map((m) => m.created_at)
    .filter(Boolean)
    .sort();
  const oldestEntry = allDates[0] ?? null;

  return { episodic, semantic, procedural, trends, auditLog, totalCount, oldestEntry };
}

// ─── Audit helper ─────────────────────────────────────────────────────────────

export async function auditLog(
  userId: string,
  action: string,
  opts?: { namespace?: string; itemId?: string; description?: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO memory_audit_log (user_id, action, namespace, item_id, description)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      userId,
      action,
      opts?.namespace ?? null,
      opts?.itemId ?? null,
      opts?.description ?? null,
    );
}
