// ─── Home & Property Hub Routes ──────────────────────────────────────────────
// Enhancement 21 — Propel Stack AI, LLC
// Properties, Maintenance (AI schedule), Appliances/Warranty,
// Vehicles + Service Log, Insurance, Utilities (spike detection), Rental Manager

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

export const homePropertyRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

async function callAI(system: string, user: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

function today(): string { return new Date().toISOString().split('T')[0]; }

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── Properties ───────────────────────────────────────────────────────────────

homePropertyRouter.get('/properties', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      'SELECT * FROM properties WHERE user_id = ? ORDER BY created_at ASC'
    ).all(userId);
    res.json({ properties: rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.post('/properties', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { nickname, type, address, purchase_date, estimated_value, mortgage_amount, mortgage_rate, rent_amount, zillow_url, notes } = req.body as Record<string, unknown>;
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO properties (id, user_id, nickname, type, address, purchase_date, estimated_value, mortgage_amount, mortgage_rate, rent_amount, zillow_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, nickname, type ?? 'primary', address ?? '', purchase_date ?? null, estimated_value ?? null, mortgage_amount ?? null, mortgage_rate ?? null, rent_amount ?? null, zillow_url ?? '', notes ?? '');
    const row = await db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    res.json({ property: row });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.patch('/properties/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params;
    const fields = req.body as Record<string, unknown>;
    const allowed = ['nickname', 'type', 'address', 'purchase_date', 'estimated_value', 'mortgage_amount', 'mortgage_rate', 'rent_amount', 'zillow_url', 'notes'];
    const updates: string[] = []; const values: unknown[] = [];
    for (const key of allowed) { if (key in fields) { updates.push(`${key} = ?`); values.push(fields[key]); } }
    if (updates.length > 0) { values.push(id, userId); await db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values); }
    const row = await db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    res.json({ property: row });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.delete('/properties/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM properties WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Maintenance Tasks ────────────────────────────────────────────────────────

homePropertyRouter.get('/maintenance', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { property_id } = req.query;
    let sql = `
      SELECT m.*, p.nickname as property_name
      FROM maintenance_tasks m
      LEFT JOIN properties p ON m.property_id = p.id
      WHERE m.user_id = ?`;
    const params: unknown[] = [userId];
    if (property_id) { sql += ' AND m.property_id = ?'; params.push(property_id); }
    sql += ' ORDER BY m.next_due ASC NULLS LAST';
    const rows = await db.prepare(sql).all(...params);
    res.json({ tasks: rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.post('/maintenance', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { property_id, task_name, category, frequency_days, last_done, notes } = req.body as Record<string, unknown>;
    const id = randomUUID();
    const freqDays = Number(frequency_days) || 90;
    const nextDue = last_done ? addDays(last_done as string, freqDays) : addDays(today(), freqDays);
    await db.prepare(`
      INSERT INTO maintenance_tasks (id, user_id, property_id, task_name, category, frequency_days, last_done, next_due, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, property_id, task_name, category ?? 'general', freqDays, last_done ?? null, nextDue, notes ?? '');
    const row = await db.prepare(`SELECT m.*, p.nickname as property_name FROM maintenance_tasks m LEFT JOIN properties p ON m.property_id = p.id WHERE m.id = ?`).get(id);
    res.json({ task: row });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Mark task as done — resets last_done to today and advances next_due
homePropertyRouter.patch('/maintenance/:id/done', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params;
    const task = await db.prepare('SELECT * FROM maintenance_tasks WHERE id = ? AND user_id = ?').get(id, userId) as { frequency_days: number } | undefined;
    if (!task) return res.status(404).json({ error: 'Not found' });
    const nextDue = addDays(today(), task.frequency_days);
    await db.prepare('UPDATE maintenance_tasks SET last_done = ?, next_due = ? WHERE id = ? AND user_id = ?').run(today(), nextDue, id, userId);
    res.json({ ok: true, next_due: nextDue });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.delete('/maintenance/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM maintenance_tasks WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// POST /api/home-property/maintenance/generate — AI maintenance schedule
const MAINTENANCE_SYSTEM = `You are a home maintenance expert. Given a property type and climate zone, generate a practical annual maintenance schedule. Return a JSON array of tasks. Each task: {"task_name": string, "category": "hvac"|"exterior"|"plumbing"|"electrical"|"seasonal"|"general", "frequency_days": number}. Include 8-12 tasks. Return ONLY the JSON array.`;

homePropertyRouter.post('/maintenance/generate', async (req, res) => {
  try {
    const { property_type, climate_zone, property_age_years, property_id } = req.body as Record<string, unknown>;
    const userId = getCurrentUserId();

    const prompt = `Property: ${property_type ?? 'house'}, Climate: ${climate_zone ?? 'temperate'}, Age: ${property_age_years ?? 10} years old. Generate a maintenance schedule.`;
    const raw = await callAI(MAINTENANCE_SYSTEM, prompt);

    let tasks: { task_name: string; category: string; frequency_days: number }[] = [];
    try { tasks = JSON.parse(raw); } catch { tasks = []; }

    // Insert all generated tasks if property_id provided
    if (property_id && tasks.length > 0) {
      for (const t of tasks) {
        const id = randomUUID();
        const nextDue = addDays(today(), t.frequency_days);
        await db.prepare(`
          INSERT INTO maintenance_tasks (id, user_id, property_id, task_name, category, frequency_days, next_due)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, userId, property_id, t.task_name, t.category, t.frequency_days, nextDue);
      }
    }

    res.json({ tasks });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Appliances & Warranty ────────────────────────────────────────────────────

homePropertyRouter.get('/appliances', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT a.*, p.nickname as property_name
      FROM appliances a
      LEFT JOIN properties p ON a.property_id = p.id
      WHERE a.user_id = ?
      ORDER BY a.warranty_expiry ASC NULLS LAST
    `).all(userId);
    res.json({ appliances: rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.post('/appliances', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { property_id, name, brand, model, serial_number, purchase_date, warranty_expiry, purchase_price, notes } = req.body as Record<string, unknown>;
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO appliances (id, user_id, property_id, name, brand, model, serial_number, purchase_date, warranty_expiry, purchase_price, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, property_id ?? null, name, brand ?? '', model ?? '', serial_number ?? '', purchase_date ?? null, warranty_expiry ?? null, purchase_price ?? null, notes ?? '');
    const row = await db.prepare('SELECT a.*, p.nickname as property_name FROM appliances a LEFT JOIN properties p ON a.property_id = p.id WHERE a.id = ?').get(id);
    res.json({ appliance: row });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.delete('/appliances/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM appliances WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Vehicles ─────────────────────────────────────────────────────────────────

homePropertyRouter.get('/vehicles', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const vehicles = await db.prepare('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at ASC').all(userId);
    res.json({ vehicles });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.post('/vehicles', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { make, model, year, color, license_plate, current_mileage, registration_renewal, inspection_due, notes } = req.body as Record<string, unknown>;
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO vehicles (id, user_id, make, model, year, color, license_plate, current_mileage, registration_renewal, inspection_due, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, make, model, year, color ?? '', license_plate ?? '', current_mileage ?? 0, registration_renewal ?? null, inspection_due ?? null, notes ?? '');
    const row = await db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    res.json({ vehicle: row });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.patch('/vehicles/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params;
    const fields = req.body as Record<string, unknown>;
    const allowed = ['make', 'model', 'year', 'color', 'license_plate', 'current_mileage', 'registration_renewal', 'inspection_due', 'notes'];
    const updates: string[] = []; const values: unknown[] = [];
    for (const key of allowed) { if (key in fields) { updates.push(`${key} = ?`); values.push(fields[key]); } }
    if (updates.length > 0) { values.push(id, userId); await db.prepare(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values); }
    const row = await db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    res.json({ vehicle: row });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.delete('/vehicles/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM vehicles WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Vehicle service log
homePropertyRouter.get('/vehicles/:id/service', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare('SELECT * FROM vehicle_service_log WHERE vehicle_id = ? AND user_id = ? ORDER BY service_date DESC LIMIT 20').all(req.params.id, userId);
    res.json({ log: rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.post('/vehicles/:id/service', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { service_type, service_date, mileage, cost_cents, notes } = req.body as Record<string, unknown>;
    const logId = randomUUID();
    await db.prepare(`
      INSERT INTO vehicle_service_log (id, user_id, vehicle_id, service_type, service_date, mileage, cost_cents, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(logId, userId, req.params.id, service_type ?? 'other', service_date ?? today(), mileage ?? null, cost_cents ?? null, notes ?? '');
    // Update vehicle mileage if higher
    if (mileage) {
      await db.prepare('UPDATE vehicles SET current_mileage = MAX(current_mileage, ?) WHERE id = ? AND user_id = ?').run(mileage, req.params.id, userId);
    }
    res.json({ ok: true, log_id: logId });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Insurance Policies ───────────────────────────────────────────────────────

homePropertyRouter.get('/insurance', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare('SELECT * FROM insurance_policies WHERE user_id = ? ORDER BY renewal_date ASC NULLS LAST').all(userId);
    // Flag policies renewing within 60 days
    const todayStr = today();
    const alertDate = addDays(todayStr, 60);
    const withAlerts = (rows as Record<string, unknown>[]).map((p) => ({
      ...p,
      renewal_soon: p.renewal_date && String(p.renewal_date) <= alertDate && String(p.renewal_date) >= todayStr,
    }));
    res.json({ policies: withAlerts });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.post('/insurance', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { policy_type, carrier, policy_number, agent_name, agent_contact, premium_cents, renewal_date, property_id, vehicle_id, notes } = req.body as Record<string, unknown>;
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO insurance_policies (id, user_id, policy_type, carrier, policy_number, agent_name, agent_contact, premium_cents, renewal_date, property_id, vehicle_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, policy_type ?? 'home', carrier, policy_number ?? '', agent_name ?? '', agent_contact ?? '', premium_cents ?? null, renewal_date ?? null, property_id ?? null, vehicle_id ?? null, notes ?? '');
    const row = await db.prepare('SELECT * FROM insurance_policies WHERE id = ?').get(id);
    res.json({ policy: row });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.delete('/insurance/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM insurance_policies WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Utility Bills ────────────────────────────────────────────────────────────

homePropertyRouter.get('/utilities', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { property_id, utility_type } = req.query;
    let sql = `SELECT u.*, p.nickname as property_name FROM utility_bills u LEFT JOIN properties p ON u.property_id = p.id WHERE u.user_id = ?`;
    const params: unknown[] = [userId];
    if (property_id) { sql += ' AND u.property_id = ?'; params.push(property_id); }
    if (utility_type) { sql += ' AND u.utility_type = ?'; params.push(utility_type); }
    sql += ' ORDER BY u.bill_month DESC LIMIT 36';
    const rows = await db.prepare(sql).all(...params);
    res.json({ bills: rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.post('/utilities', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { property_id, utility_type, bill_month, amount_cents, notes } = req.body as Record<string, unknown>;
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO utility_bills (id, user_id, property_id, utility_type, bill_month, amount_cents, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, property_id ?? null, utility_type ?? 'electric', bill_month, amount_cents, notes ?? '');
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.delete('/utilities/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM utility_bills WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// GET /api/home-property/utilities/spikes — detect bills 20%+ above prior 3-month avg
homePropertyRouter.get('/utilities/spikes', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const bills = await db.prepare(
      'SELECT * FROM utility_bills WHERE user_id = ? ORDER BY utility_type, bill_month DESC'
    ).all(userId) as { id: string; utility_type: string; bill_month: string; amount_cents: number; property_id?: string }[];

    const spikes: { utility_type: string; bill_month: string; amount_cents: number; avg_cents: number; pct_over: number }[] = [];

    // Group by utility_type
    const byType: Record<string, typeof bills> = {};
    for (const b of bills) {
      if (!byType[b.utility_type]) byType[b.utility_type] = [];
      byType[b.utility_type].push(b);
    }

    for (const [, typeBills] of Object.entries(byType)) {
      if (typeBills.length < 4) continue;
      const latest = typeBills[0];
      const prior3 = typeBills.slice(1, 4);
      const avg = prior3.reduce((s, b) => s + b.amount_cents, 0) / prior3.length;
      if (avg > 0 && latest.amount_cents > avg * 1.2) {
        spikes.push({
          utility_type: latest.utility_type,
          bill_month: latest.bill_month,
          amount_cents: latest.amount_cents,
          avg_cents: Math.round(avg),
          pct_over: Math.round(((latest.amount_cents - avg) / avg) * 100),
        });
      }
    }

    res.json({ spikes });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Rental Ledger ────────────────────────────────────────────────────────────

homePropertyRouter.get('/rental', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT r.*, p.nickname as property_name, p.address
      FROM rental_ledger r
      LEFT JOIN properties p ON r.property_id = p.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);
    res.json({ leases: rows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.post('/rental', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { property_id, tenant_name, lease_start, lease_end, rent_cents, due_day, security_deposit_cents, notes } = req.body as Record<string, unknown>;
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO rental_ledger (id, user_id, property_id, tenant_name, lease_start, lease_end, rent_cents, due_day, security_deposit_cents, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, property_id, tenant_name, lease_start, lease_end, rent_cents, due_day ?? 1, security_deposit_cents ?? null, notes ?? '');
    const row = await db.prepare('SELECT r.*, p.nickname as property_name FROM rental_ledger r LEFT JOIN properties p ON r.property_id = p.id WHERE r.id = ?').get(id);
    res.json({ lease: row });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.patch('/rental/:id/payment', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('UPDATE rental_ledger SET last_payment_date = ? WHERE id = ? AND user_id = ?').run(today(), req.params.id, userId);
    res.json({ ok: true, last_payment_date: today() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

homePropertyRouter.delete('/rental/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM rental_ledger WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});
