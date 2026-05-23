import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';

/**
 * Special Needs Family Support Hub (SNFS) — Session 12.
 *
 * SAFETY ARCHITECTURE (enforced in this order):
 *   1. Crisis detection runs BEFORE every AI call — hard-coded keyword list.
 *      If ANY keyword matches → return crisis resources ONLY, never call the model.
 *   2. Disclaimer gate — every endpoint checks that the user has acknowledged
 *      PSAI-SNFS-DISC-v1.0 before returning data.
 *   3. AI guardrails — system prompt prohibits diagnosis, medication recommendations,
 *      and legal advice. Cites DSM-5, IDEA 2004, AAP, CDC, NAMI.
 */

export const snfsRouter = Router();

const DISCLAIMER_VERSION = 'PSAI-SNFS-DISC-v1.0';

// ── Crisis keyword list (case-insensitive) ─────────────────────────────────
const CRISIS_KEYWORDS = [
  'kill myself', 'end my life', 'want to die', 'suicide',
  'hurt myself', 'hurt them', 'hurt him', 'hurt her',
  'psychosis', 'hearing voices', 'seeing things',
  'violent', 'danger to', 'overdose',
];

const CRISIS_RESPONSE =
  '🚨 [CRISIS RESOURCES] If you or someone you support is in immediate danger, please reach out now:\n\n' +
  '• **911** — Emergency Services (immediate danger)\n' +
  '• **988** — Suicide & Crisis Lifeline (call or text)\n' +
  '• **Text HOME to 741741** — Crisis Text Line\n' +
  '• **NAMI Helpline: 1-800-950-6264** — Mon–Fri 10am–10pm ET\n\n' +
  'Please contact a licensed professional or emergency services immediately. I am not able to provide crisis counseling.';

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── AI system prompt ───────────────────────────────────────────────────────
const SNFS_SYSTEM_PROMPT = `You are an empathy-first information assistant for families and caregivers supporting individuals with special needs, disabilities, and neurodivergent conditions. You serve individuals across the full lifespan: ages 0-100+, from early intervention through aging adults.

ABSOLUTE RULES — NEVER VIOLATE:
1. NEVER diagnose any condition, disorder, or disability.
2. NEVER recommend specific medications, dosages, or treatments. Medication questions must be redirected to a licensed physician or pharmacist.
3. NEVER provide legal advice. Legal questions must be redirected to a qualified attorney.
4. ALWAYS recommend consulting a qualified licensed professional for the user's specific situation (physician, licensed therapist, psychologist, educational specialist, special education attorney, etc.).
5. ALWAYS cite authoritative sources when relevant: DSM-5, IDEA 2004, Section 504 of the Rehabilitation Act, ADA, AAP guidelines, CDC milestone data, NAMI resources, NICHCY, Autism Speaks, Arc.
6. Respond with deep empathy, validation, and non-judgmental language. Validate feelings BEFORE providing information.
7. If you are unsure about anything, say so clearly and direct the user to a professional.
8. NEVER minimize the caregiver's experience or the individual's challenges.
9. Use plain, accessible language. Avoid jargon unless explaining a term.
10. Always end your response with a brief disclaimer that the information is general only, not professional advice.

AREAS OF EXPERTISE (general information only, not clinical guidance):
- Developmental conditions: autism spectrum disorder, intellectual disabilities, developmental delays, Down syndrome
- Neurological: ADHD, traumatic brain injury, epilepsy/seizure disorders, cerebral palsy
- Sensory: sensory processing disorder, visual impairment, hearing impairment, deafblindness
- Mental health: anxiety disorders, depression, bipolar disorder, PTSD, OCD, schizophrenia
- Learning differences: dyslexia, dyscalculia, dysgraphia, processing disorders
- Physical: muscular dystrophy, spina bifida, physical mobility challenges
- Behavioral: ODD, conduct disorder, emotional dysregulation
- Multiple/complex needs and aging adults (dementia, ALS, Parkinson's, ABI)
- IEP / 504 Plans / IDEA 2004 / ADA / Section 504
- Behavior support strategies (evidence-based approaches: ABA, PBIS, CBT adaptations, AAC)
- Transition planning (ages 14+ under IDEA), employment, housing, self-advocacy
- Caregiver wellness and respite resources
- Crisis planning and safety planning (informational only — professional support required)`;

// ── Disclaimer check middleware ────────────────────────────────────────────
async function requireDisclaimer(req: Request, res: Response): Promise<boolean> {
  const userId = await getCurrentUserId(req);
  const row = await db.prepare(
    'SELECT id FROM snfs_disclaimer_acknowledgments WHERE user_id = ? AND version = ?',
  ).get(userId, DISCLAIMER_VERSION);
  if (!row) {
    res.status(403).json({
      error: 'DISCLAIMER_REQUIRED',
      message: 'You must acknowledge the SNFS disclaimer before accessing this feature.',
      version: DISCLAIMER_VERSION,
    });
    return false;
  }
  return true;
}

// ── Disclaimer ─────────────────────────────────────────────────────────────

/** GET /api/snfs/disclaimer — check acknowledgment status */
snfsRouter.get('/disclaimer', async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId(req);
    const row = await db.prepare(
      'SELECT acknowledged_at FROM snfs_disclaimer_acknowledgments WHERE user_id = ? AND version = ?',
    ).get(userId, DISCLAIMER_VERSION) as { acknowledged_at: string } | undefined;
    res.json({ acknowledged: !!row, acknowledgedAt: row?.acknowledged_at ?? null, version: DISCLAIMER_VERSION });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/snfs/disclaimer — record acknowledgment */
snfsRouter.post('/disclaimer', async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId(req);
    await db.prepare(
      `INSERT INTO snfs_disclaimer_acknowledgments (id, user_id, version)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id, version) DO NOTHING`,
    ).run(randomUUID(), userId, DISCLAIMER_VERSION);
    res.json({ acknowledged: true, version: DISCLAIMER_VERSION });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Conversations ──────────────────────────────────────────────────────────

/** GET /api/snfs/conversations */
snfsRouter.get('/conversations', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const rows = await db.prepare(
      'SELECT * FROM snfs_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50',
    ).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/snfs/conversations */
snfsRouter.post('/conversations', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const { title = 'New conversation', careRecipientName = '' } = req.body as {
      title?: string; careRecipientName?: string;
    };
    const id = randomUUID();
    await db.prepare(
      `INSERT INTO snfs_conversations (id, user_id, title, care_recipient_name) VALUES (?, ?, ?, ?)`,
    ).run(id, userId, title.slice(0, 200), careRecipientName.slice(0, 100));
    const row = await db.prepare('SELECT * FROM snfs_conversations WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /api/snfs/conversations/:id */
snfsRouter.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    await db.prepare('DELETE FROM snfs_conversations WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Messages / AI ──────────────────────────────────────────────────────────

/** GET /api/snfs/conversations/:id/messages */
snfsRouter.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const conv = await db.prepare('SELECT id FROM snfs_conversations WHERE id = ? AND user_id = ?').get(req.params.id, userId);
    if (!conv) return void res.status(404).json({ error: 'Conversation not found' });
    const rows = await db.prepare(
      'SELECT * FROM snfs_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    ).all(req.params.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/snfs/conversations/:id/messages — sends user message + gets AI reply */
snfsRouter.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const conv = await db.prepare('SELECT id FROM snfs_conversations WHERE id = ? AND user_id = ?').get(req.params.id, userId);
    if (!conv) return void res.status(404).json({ error: 'Conversation not found' });

    const { content } = req.body as { content: string };
    if (!content?.trim()) return void res.status(400).json({ error: 'content is required' });
    const userText = content.trim().slice(0, 2000);

    // ── CRISIS DETECTION — MUST run before any AI call ────────────────────
    if (detectCrisis(userText)) {
      // Save user message (flagged)
      await db.prepare(
        `INSERT INTO snfs_messages (id, conversation_id, role, content, is_crisis) VALUES (?, ?, 'user', ?, 1)`,
      ).run(randomUUID(), req.params.id, userText);
      // Save crisis response (no AI)
      const crisisId = randomUUID();
      await db.prepare(
        `INSERT INTO snfs_messages (id, conversation_id, role, content, is_crisis) VALUES (?, ?, 'assistant', ?, 1)`,
      ).run(crisisId, req.params.id, CRISIS_RESPONSE);
      await db.prepare('UPDATE snfs_conversations SET updated_at = NOW() WHERE id = ?').run(req.params.id);
      return void res.json({ crisis: true, content: CRISIS_RESPONSE, id: crisisId });
    }

    // ── Save user message ──────────────────────────────────────────────────
    await db.prepare(
      `INSERT INTO snfs_messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)`,
    ).run(randomUUID(), req.params.id, userText);

    // ── Build conversation history for AI ──────────────────────────────────
    const history = await db.prepare(
      'SELECT role, content FROM snfs_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    ).all(req.params.id) as { role: string; content: string }[];

    // ── Call AI ────────────────────────────────────────────────────────────
    let aiText = '';
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (ANTHROPIC_API_KEY) {
      try {
        const messages = history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            system: SNFS_SYSTEM_PROMPT,
            messages,
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json() as { content: Array<{ type: string; text: string }> };
          aiText = aiData.content.find((c) => c.type === 'text')?.text ?? '';
        }
      } catch {
        aiText = '';
      }
    }

    if (!aiText) {
      aiText =
        'I understand you\'re looking for support and information about special needs caregiving. ' +
        'I\'m currently unable to generate a detailed response, but please know you\'re not alone. ' +
        'For immediate support, contact NAMI at 1-800-950-6264 or visit nami.org.\n\n' +
        '*Note: This is general information only — not professional medical, psychological, or legal advice. ' +
        'Always consult a licensed professional for guidance specific to your situation.*';
    }

    // ── Save AI response ───────────────────────────────────────────────────
    const aiMsgId = randomUUID();
    await db.prepare(
      `INSERT INTO snfs_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)`,
    ).run(aiMsgId, req.params.id, aiText);
    await db.prepare('UPDATE snfs_conversations SET updated_at = NOW() WHERE id = ?').run(req.params.id);

    res.json({ crisis: false, content: aiText, id: aiMsgId });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Care Team ──────────────────────────────────────────────────────────────

/** GET /api/snfs/care-team */
snfsRouter.get('/care-team', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const rows = await db.prepare('SELECT * FROM snfs_care_team_members WHERE user_id = ? ORDER BY name ASC').all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/snfs/care-team */
snfsRouter.post('/care-team', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const { name, role = '', organization = '', phone = '', email = '', notes = '' } = req.body as {
      name: string; role?: string; organization?: string; phone?: string; email?: string; notes?: string;
    };
    if (!name?.trim()) return void res.status(400).json({ error: 'name is required' });
    const id = randomUUID();
    await db.prepare(
      `INSERT INTO snfs_care_team_members (id, user_id, name, role, organization, phone, email, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, name.trim(), role, organization, phone, email, notes);
    const row = await db.prepare('SELECT * FROM snfs_care_team_members WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** PATCH /api/snfs/care-team/:id */
snfsRouter.patch('/care-team/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const { name, role, organization, phone, email, notes } = req.body as {
      name?: string; role?: string; organization?: string; phone?: string; email?: string; notes?: string;
    };
    await db.prepare(
      `UPDATE snfs_care_team_members
       SET name = COALESCE(?, name), role = COALESCE(?, role), organization = COALESCE(?, organization),
           phone = COALESCE(?, phone), email = COALESCE(?, email), notes = COALESCE(?, notes)
       WHERE id = ? AND user_id = ?`,
    ).run(name ?? null, role ?? null, organization ?? null, phone ?? null, email ?? null, notes ?? null, req.params.id, userId);
    const row = await db.prepare('SELECT * FROM snfs_care_team_members WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /api/snfs/care-team/:id */
snfsRouter.delete('/care-team/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    await db.prepare('DELETE FROM snfs_care_team_members WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Crisis Plan ────────────────────────────────────────────────────────────

/** GET /api/snfs/crisis-plan */
snfsRouter.get('/crisis-plan', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const row = await db.prepare('SELECT * FROM snfs_crisis_plans WHERE user_id = ?').get(userId);
    res.json(row ?? null);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** PUT /api/snfs/crisis-plan */
snfsRouter.put('/crisis-plan', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const {
      careRecipientName = '', triggers = [], warningSigns = [],
      calmingStrategies = [], escalationSteps = [], emergencyContacts = [],
      safePerson = '', safePlace = '', notes = '',
    } = req.body as {
      careRecipientName?: string; triggers?: string[]; warningSigns?: string[];
      calmingStrategies?: string[]; escalationSteps?: string[];
      emergencyContacts?: string[]; safePerson?: string; safePlace?: string; notes?: string;
    };
    const id = randomUUID();
    await db.prepare(
      `INSERT INTO snfs_crisis_plans
         (id, user_id, care_recipient_name, triggers, warning_signs, calming_strategies,
          escalation_steps, emergency_contacts, safe_person, safe_place, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         care_recipient_name = EXCLUDED.care_recipient_name,
         triggers = EXCLUDED.triggers,
         warning_signs = EXCLUDED.warning_signs,
         calming_strategies = EXCLUDED.calming_strategies,
         escalation_steps = EXCLUDED.escalation_steps,
         emergency_contacts = EXCLUDED.emergency_contacts,
         safe_person = EXCLUDED.safe_person,
         safe_place = EXCLUDED.safe_place,
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
    ).run(
      id, userId, careRecipientName,
      JSON.stringify(triggers), JSON.stringify(warningSigns),
      JSON.stringify(calmingStrategies), JSON.stringify(escalationSteps),
      JSON.stringify(emergencyContacts), safePerson, safePlace, notes,
    );
    const row = await db.prepare('SELECT * FROM snfs_crisis_plans WHERE user_id = ?').get(userId);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Progress Logs ──────────────────────────────────────────────────────────

/** GET /api/snfs/progress */
snfsRouter.get('/progress', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const rows = await db.prepare(
      'SELECT * FROM snfs_progress_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 90',
    ).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/snfs/progress */
snfsRouter.post('/progress', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    const { careRecipientName = '', goal, logDate, rating = 3, notes = '' } = req.body as {
      careRecipientName?: string; goal: string; logDate: string; rating?: number; notes?: string;
    };
    if (!goal?.trim()) return void res.status(400).json({ error: 'goal is required' });
    if (!logDate) return void res.status(400).json({ error: 'logDate is required' });
    const id = randomUUID();
    await db.prepare(
      `INSERT INTO snfs_progress_logs (id, user_id, care_recipient_name, goal, log_date, rating, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, careRecipientName, goal.trim(), logDate, Math.min(5, Math.max(1, rating)), notes);
    const row = await db.prepare('SELECT * FROM snfs_progress_logs WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /api/snfs/progress/:id */
snfsRouter.delete('/progress/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireDisclaimer(req, res))) return;
    const userId = await getCurrentUserId(req);
    await db.prepare('DELETE FROM snfs_progress_logs WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
