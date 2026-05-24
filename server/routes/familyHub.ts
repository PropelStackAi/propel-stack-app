/**
 * Family Hub — Legacy Page Upgrade
 * Propel Stack AI, LLC
 */
import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';

export const familyHubRouter = Router();

function newId() { return crypto.randomUUID(); }

// Members
familyHubRouter.get('/members', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare('SELECT * FROM family_members WHERE user_id = $1 ORDER BY created_at ASC').all(userId);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

familyHubRouter.post('/members', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { name, role, dob, avatar_url } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'name and role required' });
    const id = newId();
    await db.prepare('INSERT INTO family_members (id, user_id, name, role, dob, avatar_url) VALUES ($1,$2,$3,$4,$5,$6)').run(id, userId, name, role, dob ?? null, avatar_url ?? null);
    res.json({ id });
  } catch {
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

familyHubRouter.put('/members/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { name, role, dob, avatar_url } = req.body;
    await db.prepare('UPDATE family_members SET name=$1, role=$2, dob=$3, avatar_url=$4 WHERE id=$5 AND user_id=$6').run(name, role, dob ?? null, avatar_url ?? null, req.params.id, userId);
    res.json({ id: req.params.id });
  } catch {
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

familyHubRouter.delete('/members/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM family_members WHERE id=$1 AND user_id=$2').run(req.params.id, userId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

// Tasks
familyHubRouter.get('/tasks', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare('SELECT * FROM family_tasks WHERE user_id = $1 ORDER BY completed ASC, due_date ASC NULLS LAST, created_at DESC').all(userId);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch family tasks' });
  }
});

familyHubRouter.post('/tasks', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { title, assignee_name, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const id = newId();
    await db.prepare('INSERT INTO family_tasks (id, user_id, title, assignee_name, due_date) VALUES ($1,$2,$3,$4,$5)').run(id, userId, title, assignee_name ?? null, due_date ?? null);
    res.json({ id });
  } catch {
    res.status(500).json({ error: 'Failed to create family task' });
  }
});

familyHubRouter.put('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { title, assignee_name, due_date, completed } = req.body;
    const completedAt = completed ? new Date().toISOString() : null;
    await db.prepare('UPDATE family_tasks SET title=$1, assignee_name=$2, due_date=$3, completed=$4, completed_at=$5 WHERE id=$6 AND user_id=$7').run(title, assignee_name ?? null, due_date ?? null, completed ?? false, completedAt, req.params.id, userId);
    res.json({ id: req.params.id });
  } catch {
    res.status(500).json({ error: 'Failed to update family task' });
  }
});

familyHubRouter.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM family_tasks WHERE id=$1 AND user_id=$2').run(req.params.id, userId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete family task' });
  }
});

// Emergency contacts
familyHubRouter.get('/emergency-contacts', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare('SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY created_at ASC').all(userId);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch emergency contacts' });
  }
});

familyHubRouter.post('/emergency-contacts', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { name, phone, relationship } = req.body;
    if (!name || !phone || !relationship) return res.status(400).json({ error: 'name, phone, relationship required' });
    const id = newId();
    await db.prepare('INSERT INTO emergency_contacts (id, user_id, name, phone, relationship) VALUES ($1,$2,$3,$4,$5)').run(id, userId, name, phone, relationship);
    res.json({ id });
  } catch {
    res.status(500).json({ error: 'Failed to create emergency contact' });
  }
});

familyHubRouter.delete('/emergency-contacts/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM emergency_contacts WHERE id=$1 AND user_id=$2').run(req.params.id, userId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
});
