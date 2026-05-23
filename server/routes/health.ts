import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { logActivity } from '../lib/dashboard.js';

/**
 * Health Hub API — Session 10.
 *
 * SAFETY RULES (non-negotiable):
 *   • Every response that includes AI text must carry the health disclaimer.
 *   • AI Q&A never diagnoses — always defers to a physician.
 *   • Emergency (crisis) keywords trigger a 988/911 redirect, never a model response.
 *   • /emergency-card is intentionally unauthenticated (demo-stub always returns demo-user data).
 *
 * DB tables: health_profile, health_metrics, symptom_logs, medication_reminders, health_appointments
 */
export const healthRouter = Router();

const DISCLAIMER = 'Health information is for personal tracking only. Nothing here constitutes medical advice. Consult a licensed physician before making any health decisions.';

function newId(): string {
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Health profile (get or auto-create) ────────────────────────────────────

async function ensureProfile(userId: string) {
  let profile = await db.prepare('SELECT * FROM health_profile WHERE user_id = ?').get(userId);
  if (!profile) {
    const id = newId();
    await db.prepare(
      `INSERT INTO health_profile (id, user_id) VALUES (?, ?)`,
    ).run(id, userId);
    profile = await db.prepare('SELECT * FROM health_profile WHERE user_id = ?').get(userId);
  }
  return profile;
}

healthRouter.get('/profile', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  res.json(await ensureProfile(userId));
});

healthRouter.patch('/profile', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  await ensureProfile(userId);
  const body = req.body as Record<string, unknown>;
  const updates: string[] = [];
  const values: unknown[] = [];

  const str = (k: string, col: string) => {
    if (body[k] !== undefined) { updates.push(`${col} = ?`); values.push(String(body[k])); }
  };
  const json = (k: string, col: string) => {
    if (body[k] !== undefined) { updates.push(`${col} = ?`); values.push(JSON.stringify(body[k])); }
  };

  str('fullName', 'full_name');
  str('bloodType', 'blood_type');
  str('emergencyContactName', 'emergency_contact_name');
  str('emergencyContactPhone', 'emergency_contact_phone');
  str('emergencyContactRelation', 'emergency_contact_relation');
  str('notes', 'notes');
  json('allergies', 'allergies');
  json('conditions', 'conditions');

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  updates.push('updated_at = NOW()');
  await db.prepare(`UPDATE health_profile SET ${updates.join(', ')} WHERE user_id = ?`)
    .run(...values, userId);
  res.json(await ensureProfile(userId));
});

// ── Vitals / health metrics ─────────────────────────────────────────────────

const VALID_TYPES = new Set(['weight', 'bp', 'hr', 'glucose', 'spo2']);

healthRouter.get('/metrics', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const type = req.query['type'] as string | undefined;
  const days = Math.min(90, Number(req.query['days'] ?? 30));
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const rows = type && VALID_TYPES.has(type)
    ? await db.prepare(
        `SELECT * FROM health_metrics WHERE user_id = ? AND metric_type = ? AND measured_at >= ? ORDER BY measured_at ASC`,
      ).all(userId, type, cutoff)
    : await db.prepare(
        `SELECT * FROM health_metrics WHERE user_id = ? AND measured_at >= ? ORDER BY measured_at DESC LIMIT 100`,
      ).all(userId, cutoff);

  res.json(rows);
});

healthRouter.post('/metrics', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { metricType, value, value2, unit = '', notes = '', measuredAt } = req.body as {
    metricType?: string;
    value?: number;
    value2?: number;
    unit?: string;
    notes?: string;
    measuredAt?: string;
  };
  if (!metricType || !VALID_TYPES.has(metricType)) {
    return res.status(400).json({ error: `metric_type must be one of: ${[...VALID_TYPES].join(', ')}` });
  }
  if (value === undefined || typeof value !== 'number') {
    return res.status(400).json({ error: 'value is required' });
  }
  const id = newId();
  await db.prepare(
    `INSERT INTO health_metrics (id, user_id, metric_type, value, value2, unit, notes, measured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, metricType, value, value2 ?? null, unit, notes, measuredAt ?? new Date().toISOString());
  const row = await db.prepare('SELECT * FROM health_metrics WHERE id = ?').get(id);
  res.status(201).json(row);
});

healthRouter.delete('/metrics/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = await db.prepare('DELETE FROM health_metrics WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ── Symptom logs ────────────────────────────────────────────────────────────

healthRouter.get('/symptoms', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const days = Math.min(90, Number(req.query['days'] ?? 30));
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await db.prepare(
    `SELECT * FROM symptom_logs WHERE user_id = ? AND logged_at >= ? ORDER BY logged_at DESC`,
  ).all(userId, cutoff);
  res.json(rows);
});

healthRouter.post('/symptoms', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { symptom, severity = 5, durationHours, notes = '' } = req.body as {
    symptom?: string;
    severity?: number;
    durationHours?: number;
    notes?: string;
  };
  if (!symptom || typeof symptom !== 'string') return res.status(400).json({ error: 'symptom required' });
  const id = newId();
  await db.prepare(
    `INSERT INTO symptom_logs (id, user_id, symptom, severity, duration_hours, notes) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, symptom.trim(), Math.min(10, Math.max(1, Number(severity))), durationHours ?? null, notes);
  await logActivity(userId, 'health', `Logged symptom: ${symptom.trim()}`).catch(() => {});
  const row = await db.prepare('SELECT * FROM symptom_logs WHERE id = ?').get(id);
  res.status(201).json(row);
});

healthRouter.delete('/symptoms/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = await db.prepare('DELETE FROM symptom_logs WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

/** Pattern detection: same symptom logged 3+ times in the last 7 days → suggest seeing a doctor. */
healthRouter.get('/symptoms/patterns', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const rows = await db.prepare(
    `SELECT symptom, COUNT(*) AS count FROM symptom_logs WHERE user_id = ? AND logged_at >= ? GROUP BY LOWER(symptom) HAVING COUNT(*) >= 3 ORDER BY count DESC`,
  ).all(userId, cutoff);
  res.json({ patterns: rows });
});

// ── Medications ─────────────────────────────────────────────────────────────

healthRouter.get('/medications', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db.prepare(`SELECT * FROM medication_reminders WHERE user_id = ? ORDER BY active DESC, name ASC`).all(userId);
  res.json(rows);
});

healthRouter.post('/medications', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { name, dose = '', frequency = 'daily', reminderTimes = [], startDate, notes = '' } = req.body as {
    name?: string;
    dose?: string;
    frequency?: string;
    reminderTimes?: string[];
    startDate?: string;
    notes?: string;
  };
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' });
  const id = newId();
  await db.prepare(
    `INSERT INTO medication_reminders (id, user_id, name, dose, frequency, reminder_times, start_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, name.trim(), dose, frequency, JSON.stringify(reminderTimes), startDate ?? null, notes);
  res.status(201).json(await db.prepare('SELECT * FROM medication_reminders WHERE id = ?').get(id));
});

healthRouter.patch('/medications/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  const body = req.body as Record<string, unknown>;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body['name'] !== undefined) { updates.push('name = ?'); values.push(String(body['name']).trim()); }
  if (body['dose'] !== undefined) { updates.push('dose = ?'); values.push(body['dose']); }
  if (body['frequency'] !== undefined) { updates.push('frequency = ?'); values.push(body['frequency']); }
  if (body['active'] !== undefined) { updates.push('active = ?'); values.push(body['active'] ? 1 : 0); }
  if (body['reminderTimes'] !== undefined) { updates.push('reminder_times = ?'); values.push(JSON.stringify(body['reminderTimes'])); }
  if (body['notes'] !== undefined) { updates.push('notes = ?'); values.push(body['notes']); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  await db.prepare(`UPDATE medication_reminders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values, id, userId);
  res.json(await db.prepare('SELECT * FROM medication_reminders WHERE id = ?').get(id));
});

healthRouter.delete('/medications/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = await db.prepare('DELETE FROM medication_reminders WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ── Appointments ────────────────────────────────────────────────────────────

healthRouter.get('/appointments', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db.prepare(
    `SELECT * FROM health_appointments WHERE user_id = ? ORDER BY appointment_date ASC, appointment_time ASC`,
  ).all(userId);
  res.json(rows);
});

healthRouter.post('/appointments', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { doctorName, specialty = '', appointmentDate, appointmentTime = '', location = '', notes = '' } = req.body as {
    doctorName?: string;
    specialty?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    location?: string;
    notes?: string;
  };
  if (!doctorName || !appointmentDate) return res.status(400).json({ error: 'doctorName and appointmentDate required' });
  const id = newId();
  await db.prepare(
    `INSERT INTO health_appointments (id, user_id, doctor_name, specialty, appointment_date, appointment_time, location, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, doctorName.trim(), specialty, appointmentDate, appointmentTime, location, notes);
  await logActivity(userId, 'health', `Added appointment with ${doctorName.trim()}`).catch(() => {});
  res.status(201).json(await db.prepare('SELECT * FROM health_appointments WHERE id = ?').get(id));
});

healthRouter.patch('/appointments/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;
  const body = req.body as Record<string, unknown>;
  const fields: Record<string, string> = {
    doctorName: 'doctor_name', specialty: 'specialty', appointmentDate: 'appointment_date',
    appointmentTime: 'appointment_time', location: 'location', notes: 'notes', status: 'status',
  };
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of Object.entries(fields)) {
    if (body[key] !== undefined) { updates.push(`${col} = ?`); values.push(body[key]); }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  await db.prepare(`UPDATE health_appointments SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values, id, userId);
  res.json(await db.prepare('SELECT * FROM health_appointments WHERE id = ?').get(id));
});

healthRouter.delete('/appointments/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = await db.prepare('DELETE FROM health_appointments WHERE id = ? AND user_id = ?').run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// ── AI Health Q&A — strict no-diagnosis guardrails ──────────────────────────

const CRISIS_KEYWORDS = ['appendicitis', 'chest pain', 'heart attack', 'stroke', 'can\'t breathe',
  'difficulty breathing', 'overdose', 'poisoning', 'unconscious', 'severe bleeding',
  'suicidal', 'kill myself', 'end my life', 'want to die'];

const EMERGENCY_SYMPTOMS = ['appendicitis', 'chest pain', 'heart attack', 'stroke',
  'can\'t breathe', 'difficulty breathing', 'overdose', 'poisoning', 'unconscious', 'severe bleeding'];

healthRouter.post('/ai', async (req: Request, res: Response) => {
  const { prompt } = req.body as { prompt?: string };
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt required' });
  const lower = prompt.toLowerCase();

  // Mental health crisis → always route to 988
  if (['suicidal', 'kill myself', 'end my life', 'want to die'].some((kw) => lower.includes(kw))) {
    return res.json({
      text: 'I\'m concerned about what you shared. Please call **988** (Suicide and Crisis Lifeline) or text HOME to **741741** right now — they are available 24/7. If you are in immediate danger, call **911**.',
      crisis: true,
      resources: ['988 Suicide & Crisis Lifeline: call or text 988', 'Crisis Text Line: text HOME to 741741'],
      disclaimer: DISCLAIMER,
    });
  }

  // Physical emergency → always route to 911
  if (EMERGENCY_SYMPTOMS.some((kw) => lower.includes(kw))) {
    return res.json({
      text: 'This sounds serious — please call **911** or go to an emergency room immediately. I cannot provide medical diagnoses. Your safety is the priority.',
      emergency: true,
      resources: ['Emergency: 911', '988 Suicide & Crisis Lifeline: call or text 988'],
      disclaimer: DISCLAIMER,
    });
  }

  // General health Q&A stub (real model call wires in with API key)
  const stub = [
    `Thank you for your question about "${prompt.slice(0, 80)}".`,
    'Here is some general health information — remember this is not medical advice.',
    'For personalized guidance, please consult a licensed physician or healthcare provider.',
    `(Live AI health responses activate once the OpenAI API key is configured.)`,
  ].join(' ');

  res.json({ text: stub, stub: true, disclaimer: DISCLAIMER });
});

// ── Emergency card (intentionally accessible without login in demo stub) ────

healthRouter.get('/emergency-card', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId(); // demo-user always; real auth uses a public token
  const [user, profile, meds] = await Promise.all([
    db.prepare('SELECT display_name, email FROM users WHERE id = ?').get(userId),
    ensureProfile(userId),
    db.prepare('SELECT name, dose, frequency FROM medication_reminders WHERE user_id = ? AND active = 1').all(userId),
  ]);
  res.json({ user, profile, medications: meds, retrievedAt: new Date().toISOString() });
});
