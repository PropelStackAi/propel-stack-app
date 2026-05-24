/**
 * Career & Professional Growth Hub — Enhancement 33
 * Propel Stack AI, LLC
 *
 * License/CE tracker, job pipeline, resume builder, interview prep AI.
 * CE credit renewal reminders tied to Smart Reminders system.
 */

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';

export const careerRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

async function callAI(system: string, user: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1000, system, messages: [{ role: 'user', content: scrubPII(user) }] }),
    });
    if (!res.ok) return '';
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    return data.content.find((c) => c.type === 'text')?.text?.trim() ?? '';
  } catch { return ''; }
}

// ── Licenses CRUD ─────────────────────────────────────────────────────────────
careerRouter.get('/licenses', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, license_name, license_number, issuing_body, issue_date, expiry_date,
             ce_credits_required, ce_credits_earned, status, created_at
      FROM career_licenses WHERE user_id = $1 ORDER BY expiry_date ASC
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

careerRouter.post('/licenses', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { license_name, license_number, issuing_body, issue_date, expiry_date, ce_credits_required } = req.body;
    if (!license_name?.trim()) return res.status(400).json({ error: 'license_name required' });
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO career_licenses (id, user_id, license_name, license_number, issuing_body, issue_date, expiry_date, ce_credits_required)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `).run(id, userId, license_name.trim(), license_number ?? null, issuing_body ?? null,
      issue_date ?? null, expiry_date ?? null, ce_credits_required ?? 0);
    res.status(201).json({ id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

careerRouter.put('/licenses/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { license_name, license_number, issuing_body, issue_date, expiry_date, ce_credits_required, status } = req.body;
    await db.prepare(`
      UPDATE career_licenses SET
        license_name = COALESCE($1, license_name), license_number = COALESCE($2, license_number),
        issuing_body = COALESCE($3, issuing_body), issue_date = COALESCE($4, issue_date),
        expiry_date = COALESCE($5, expiry_date), ce_credits_required = COALESCE($6, ce_credits_required),
        status = COALESCE($7, status)
      WHERE id = $8 AND user_id = $9
    `).run(license_name ?? null, license_number ?? null, issuing_body ?? null, issue_date ?? null,
      expiry_date ?? null, ce_credits_required ?? null, status ?? null, req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

careerRouter.delete('/licenses/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`DELETE FROM career_licenses WHERE id = $1 AND user_id = $2`).run(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── CE Credit Log ─────────────────────────────────────────────────────────────
careerRouter.get('/licenses/:id/ce-log', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT ce.id, ce.course_name, ce.provider, ce.credits, ce.completed_date, ce.created_at
      FROM career_ce_log ce
      JOIN career_licenses cl ON cl.id = ce.license_id
      WHERE ce.license_id = $1 AND cl.user_id = $2
      ORDER BY ce.completed_date DESC
    `).all(req.params.id as string, userId);
    res.json(rows ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

careerRouter.post('/licenses/:id/ce-log', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { course_name, provider, credits, completed_date } = req.body;
    if (!course_name?.trim() || !credits || !completed_date) return res.status(400).json({ error: 'course_name, credits, completed_date required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO career_ce_log (id, user_id, license_id, course_name, provider, credits, completed_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `).run(id, userId, req.params.id as string, course_name.trim(), provider ?? null, Number(credits), completed_date);

    // Update running CE total on license
    await db.prepare(`
      UPDATE career_licenses SET ce_credits_earned = ce_credits_earned + $1 WHERE id = $2 AND user_id = $3
    `).run(Number(credits), req.params.id as string, userId);

    res.status(201).json({ id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Jobs CRUD ─────────────────────────────────────────────────────────────────
careerRouter.get('/jobs', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, company, role, status, applied_date, notes, contacts, created_at
      FROM career_jobs WHERE user_id = $1 ORDER BY applied_date DESC
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

careerRouter.post('/jobs', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { company, role, status, applied_date, notes, contacts } = req.body;
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO career_jobs (id, user_id, company, role, status, applied_date, notes, contacts)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `).run(id, userId, company ?? '', role ?? '', status ?? 'applied', applied_date ?? null, notes ?? null, JSON.stringify(contacts ?? []));
    res.status(201).json({ id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

careerRouter.put('/jobs/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { company, role, status, applied_date, notes } = req.body;
    await db.prepare(`
      UPDATE career_jobs SET company = COALESCE($1, company), role = COALESCE($2, role),
        status = COALESCE($3, status), applied_date = COALESCE($4, applied_date), notes = COALESCE($5, notes)
      WHERE id = $6 AND user_id = $7
    `).run(company ?? null, role ?? null, status ?? null, applied_date ?? null, notes ?? null, req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

careerRouter.delete('/jobs/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(`DELETE FROM career_jobs WHERE id = $1 AND user_id = $2`).run(req.params.id as string, userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── AI Interview Prep ─────────────────────────────────────────────────────────
careerRouter.post('/interview-prep', async (req, res) => {
  try {
    const { role, company, question } = req.body;
    if (!role || !question) return res.status(400).json({ error: 'role and question required' });

    const response = await callAI(
      'You are an expert interview coach. Give specific, actionable feedback on interview answers. Be encouraging but honest. Max 3-4 sentences.',
      `Role: ${role}${company ? ` at ${company}` : ''}\nQuestion: ${question}\n\nHow should I answer this well?`,
    );

    res.json({ coaching: response || 'Focus on specific examples using the STAR method (Situation, Task, Action, Result).' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── License expiry alerts ─────────────────────────────────────────────────────
careerRouter.get('/license-alerts', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT id, license_name, expiry_date, ce_credits_required, ce_credits_earned,
        (expiry_date::date - CURRENT_DATE) AS days_until_expiry
      FROM career_licenses
      WHERE user_id = $1 AND expiry_date IS NOT NULL AND status = 'active'
        AND expiry_date::date <= CURRENT_DATE + INTERVAL '90 days'
      ORDER BY expiry_date ASC
    `).all(userId);
    res.json(rows ?? []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
