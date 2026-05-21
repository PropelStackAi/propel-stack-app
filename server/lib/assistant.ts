import crypto from 'node:crypto';
import { z } from 'zod';

/** AI Assistant domain helpers (Session 4). */

export const MODELS = ['gpt-mini', 'claude-sonnet', 'gemini-flash'] as const;
export const MODES = ['general', 'research', 'writing', 'code', 'finance'] as const;
export type Model = (typeof MODELS)[number];
export type Mode = (typeof MODES)[number];

export function newId(): string {
  return crypto.randomUUID();
}

export const conversationSchema = z.object({
  title: z.string().trim().max(120).optional(),
  model: z.enum(MODELS).default('gpt-mini'),
  mode: z.enum(MODES).default('general'),
});

export const ratingSchema = z.object({
  rating: z.number().int().min(-1).max(1),
});

export function asModel(v: unknown, fallback: Model): Model {
  return (MODELS as readonly string[]).includes(String(v)) ? (v as Model) : fallback;
}
export function asMode(v: unknown, fallback: Mode): Mode {
  return (MODES as readonly string[]).includes(String(v)) ? (v as Mode) : fallback;
}

export function rowToConversation(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    model: r.model as string,
    mode: r.mode as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function rowToMessage(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    conversationId: r.conversation_id as string,
    role: r.role as 'user' | 'assistant',
    content: r.content as string,
    tokensIn: Number(r.tokens_in),
    tokensOut: Number(r.tokens_out),
    model: r.model as string,
    rating: Number(r.rating),
    createdAt: r.created_at as string,
  };
}
