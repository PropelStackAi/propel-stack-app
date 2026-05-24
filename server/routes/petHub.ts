/**
 * Enhancement 38 — Pet Hub
 * Propel Stack AI, LLC
 *
 * Pet profiles, health records, weight logs, AI vet advisor.
 * AI Vet Advisor ALWAYS includes mandatory disclaimer — cannot be dismissed.
 * Triage levels: MONITOR AT HOME / SEE VET WITHIN 24-48 HRS / EMERGENCY — GO NOW
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';
import { randomUUID } from 'node:crypto';

export const petHubRouter = Router();
const ai = new Anthropic();

const VET_DISCLAIMER = 'IMPORTANT: This is not a substitute for professional veterinary care. If your pet is in distress, contact your vet or an emergency animal hospital immediately.';

const VET_SYSTEM = `You are an AI pet health advisor. You help pet owners understand symptoms and decide on urgency.

MANDATORY: Every response MUST end with:
"${VET_DISCLAIMER}"

TRIAGE LEVELS (always include one):
- MONITOR AT HOME: symptoms are mild, watch for changes
- SEE VET WITHIN 24-48 HRS: concerning but not immediately life-threatening
- EMERGENCY — GO NOW: potentially life-threatening, seek emergency care immediately

Never diagnose. Never prescribe medications. Always recommend professional veterinary care.
If symptoms suggest life-threatening emergency, lead with EMERGENCY — GO NOW before any other content.`;

// GET /api/pets — list pet profiles for user
petHubRouter.get('/', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const pets = await db.prepare('SELECT * FROM pet_profiles WHERE user_id = $1 ORDER BY created_at').all(userId);
    res.json(pets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

// POST /api/pets — create pet profile
petHubRouter.post('/', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { name, species = 'dog', breed, dob, weight_lbs, microchip_id, insurance_provider, vet_name, vet_phone } = req.body as {
      name: string; species?: string; breed?: string; dob?: string;
      weight_lbs?: number; microchip_id?: string; insurance_provider?: string;
      vet_name?: string; vet_phone?: string;
    };
    if (!name) return res.status(400).json({ error: 'name required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO pet_profiles (id, user_id, name, species, breed, dob, weight_lbs, microchip_id, insurance_provider, vet_name, vet_phone)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `).run(id, userId, name, species, breed ?? null, dob ?? null, weight_lbs ?? null, microchip_id ?? null, insurance_provider ?? null, vet_name ?? null, vet_phone ?? null);

    res.status(201).json({ id, name, species });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create pet profile' });
  }
});

// PUT /api/pets/:id — update pet
petHubRouter.put('/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { name, species, breed, dob, weight_lbs, microchip_id, insurance_provider, vet_name, vet_phone } = req.body as any;
    await db.prepare(`
      UPDATE pet_profiles SET name=$1, species=$2, breed=$3, dob=$4, weight_lbs=$5,
        microchip_id=$6, insurance_provider=$7, vet_name=$8, vet_phone=$9
      WHERE id=$10 AND user_id=$11
    `).run(name, species, breed ?? null, dob ?? null, weight_lbs ?? null, microchip_id ?? null, insurance_provider ?? null, vet_name ?? null, vet_phone ?? null, req.params.id, userId);
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update pet' });
  }
});

// DELETE /api/pets/:id
petHubRouter.delete('/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    await db.prepare('DELETE FROM pet_profiles WHERE id=$1 AND user_id=$2').run(req.params.id, userId);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete pet' });
  }
});

// GET /api/pets/:id/records — health records for a pet
petHubRouter.get('/:id/records', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    // Verify pet ownership
    const pet = await db.prepare('SELECT id FROM pet_profiles WHERE id=$1 AND user_id=$2').get(req.params.id, userId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    const records = await db.prepare(`
      SELECT * FROM pet_health_records WHERE pet_id=$1 ORDER BY date DESC
    `).all(req.params.id);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// POST /api/pets/:id/records — add health record
petHubRouter.post('/:id/records', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const pet = await db.prepare('SELECT id FROM pet_profiles WHERE id=$1 AND user_id=$2').get(req.params.id, userId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    const { record_type = 'checkup', title, notes, date, next_due_date } = req.body as {
      record_type?: string; title: string; notes?: string; date: string; next_due_date?: string;
    };
    if (!title || !date) return res.status(400).json({ error: 'title and date required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO pet_health_records (id, pet_id, record_type, title, notes, date, next_due_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `).run(id, req.params.id, record_type, title, notes ?? null, date, next_due_date ?? null);

    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add health record' });
  }
});

// POST /api/pets/:id/weight — log weight
petHubRouter.post('/:id/weight', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const pet = await db.prepare('SELECT id FROM pet_profiles WHERE id=$1 AND user_id=$2').get(req.params.id, userId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    const { weight_lbs } = req.body as { weight_lbs: number };
    if (!weight_lbs) return res.status(400).json({ error: 'weight_lbs required' });

    await db.prepare('INSERT INTO pet_weight_logs (id, pet_id, weight_lbs) VALUES ($1,$2,$3)').run(randomUUID(), req.params.id, weight_lbs);
    // Update current weight on profile
    await db.prepare('UPDATE pet_profiles SET weight_lbs=$1 WHERE id=$2').run(weight_lbs, req.params.id);

    res.status(201).json({ logged: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log weight' });
  }
});

// GET /api/pets/:id/weight — weight history
petHubRouter.get('/:id/weight', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const pet = await db.prepare('SELECT id FROM pet_profiles WHERE id=$1 AND user_id=$2').get(req.params.id, userId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    const logs = await db.prepare('SELECT * FROM pet_weight_logs WHERE pet_id=$1 ORDER BY logged_at DESC LIMIT 52').all(req.params.id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weight logs' });
  }
});

// POST /api/pets/vet-chat — AI vet advisor
petHubRouter.post('/vet-chat', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { pet_id, symptoms, pet_name = 'your pet', species = 'dog', breed, age_years } = req.body as {
      pet_id?: string; symptoms: string; pet_name?: string;
      species?: string; breed?: string; age_years?: number;
    };
    if (!symptoms) return res.status(400).json({ error: 'symptoms required' });

    const petContext = `Pet: ${pet_name}, ${species}${breed ? ` (${breed})` : ''}${age_years ? `, ${age_years} years old` : ''}.`;

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: VET_SYSTEM,
      messages: [{ role: 'user', content: `${petContext}\n\nSymptoms reported: ${scrubPII(symptoms)}` }],
    });

    const response = (completion.content[0] as any).text || '';
    // Ensure disclaimer is always present
    const finalResponse = response.includes('substitute for professional') ? response : `${response}\n\n${VET_DISCLAIMER}`;

    res.json({ response: finalResponse, disclaimer: VET_DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get vet advice' });
  }
});

// GET /api/pets/upcoming-reminders — records due in next 14 days
petHubRouter.get('/upcoming-reminders', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const rows = await db.prepare(`
      SELECT r.*, p.name AS pet_name, p.species
      FROM pet_health_records r
      JOIN pet_profiles p ON p.id = r.pet_id
      WHERE p.user_id = $1
        AND r.next_due_date IS NOT NULL
        AND r.next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
      ORDER BY r.next_due_date
    `).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});
