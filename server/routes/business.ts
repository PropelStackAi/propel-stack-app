// ─── Business Hub Routes ──────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC
//
// Small business workspace: clients, projects, invoices (with line items),
// expenses, and AI-powered business insights.

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';

export const businessRouter = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ─── AI helper ────────────────────────────────────────────────────────────────

async function callAI(system: string, userMsg: string, maxTokens = 600): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((c) => c.type === 'text')?.text ?? '';
}

const INSIGHTS_SYSTEM = `You are a concise business advisor for small business owners using Propel Stack AI.
Given a JSON snapshot of the user's business metrics, produce a short (150-200 word) business health summary.
Format in 3 short sections:
1. 💰 Revenue Health — what the numbers say
2. ⚠️ Watch This — one risk or action item
3. 🚀 Next Move — one specific recommendation

Be direct, specific, and encouraging. No generic advice. Reference the actual numbers.
NEVER give investment, tax, or legal advice. Always recommend consulting a licensed professional for those.`;

// ─── Clients ──────────────────────────────────────────────────────────────────

businessRouter.get('/clients', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db
      .prepare('SELECT * FROM business_clients WHERE user_id = ? ORDER BY name')
      .all(userId);
    res.json({ clients: rows });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

businessRouter.post('/clients', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, company, email, phone, status, notes } = req.body as Record<string, string>;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const id = randomUUID();
    await db.prepare(
      `INSERT INTO business_clients (id, user_id, name, company, email, phone, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, name.trim(), company ?? '', email ?? '', phone ?? '', status ?? 'active', notes ?? '');
    res.status(201).json(await db.prepare('SELECT * FROM business_clients WHERE id = ?').get(id));
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

businessRouter.patch('/clients/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, company, email, phone, status, notes } = req.body as Record<string, string>;
    await db.prepare(
      `UPDATE business_clients SET name=?, company=?, email=?, phone=?, status=?, notes=?
       WHERE id=? AND user_id=?`,
    ).run(name ?? '', company ?? '', email ?? '', phone ?? '', status ?? 'active', notes ?? '', req.params.id, userId);
    res.json(await db.prepare('SELECT * FROM business_clients WHERE id = ?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

businessRouter.delete('/clients/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM business_clients WHERE id=? AND user_id=?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Projects ─────────────────────────────────────────────────────────────────

businessRouter.get('/projects', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      `SELECT p.*, c.name as client_name
       FROM business_projects p
       LEFT JOIN business_clients c ON c.id = p.client_id
       WHERE p.user_id = ?
       ORDER BY p.status, p.created_at DESC`,
    ).all(userId);
    res.json({ projects: rows });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

businessRouter.post('/projects', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, description, client_id, status, budget, deadline } = req.body as Record<string, string>;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const id = randomUUID();
    await db.prepare(
      `INSERT INTO business_projects (id, user_id, client_id, name, description, status, budget, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, client_id || null, name.trim(), description ?? '', status ?? 'active',
      budget ? Number(budget) : null, deadline || null);
    res.status(201).json(await db.prepare('SELECT * FROM business_projects WHERE id = ?').get(id));
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

businessRouter.patch('/projects/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { name, description, client_id, status, budget, deadline } = req.body as Record<string, string>;
    await db.prepare(
      `UPDATE business_projects
       SET name=?, description=?, client_id=?, status=?, budget=?, deadline=?
       WHERE id=? AND user_id=?`,
    ).run(name ?? '', description ?? '', client_id || null, status ?? 'active',
      budget ? Number(budget) : null, deadline || null, req.params.id, userId);
    res.json(await db.prepare('SELECT * FROM business_projects WHERE id = ?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

businessRouter.delete('/projects/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM business_projects WHERE id=? AND user_id=?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Invoices ─────────────────────────────────────────────────────────────────

businessRouter.get('/invoices', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const invoices = await db.prepare(
      `SELECT i.*, c.name as client_name
       FROM business_invoices i
       LEFT JOIN business_clients c ON c.id = i.client_id
       WHERE i.user_id = ?
       ORDER BY i.issue_date DESC`,
    ).all(userId) as Record<string, unknown>[];

    const enriched = await Promise.all(invoices.map(async (inv) => {
      const items = await db.prepare(
        'SELECT * FROM business_invoice_items WHERE invoice_id = ? ORDER BY rowid',
      ).all(inv.id as string);
      return { ...inv, items };
    }));
    res.json({ invoices: enriched });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/business/invoices — create invoice + line items
businessRouter.post('/invoices', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { client_id, project_id, invoice_number, status, issue_date, due_date, notes, tax_rate, items } =
      req.body as {
        client_id?: string; project_id?: string; invoice_number?: string;
        status?: string; issue_date: string; due_date?: string; notes?: string;
        tax_rate?: number; items?: Array<{ description: string; quantity: number; unit_price: number }>;
      };

    if (!issue_date) return res.status(400).json({ error: 'issue_date required' });

    const lineItems = items ?? [];
    const subtotal = lineItems.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
    const tax = (tax_rate ?? 0) / 100;
    const total_amount = subtotal + subtotal * tax;

    const id = randomUUID();
    // Auto-generate invoice number if not provided
    const invNum = invoice_number?.trim() || `INV-${Date.now().toString().slice(-6)}`;

    await db.prepare(
      `INSERT INTO business_invoices
         (id, user_id, client_id, project_id, invoice_number, status, issue_date, due_date, notes, tax_rate, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, client_id || null, project_id || null, invNum,
      status ?? 'draft', issue_date, due_date || null, notes ?? '', tax_rate ?? 0, total_amount);

    for (const item of lineItems) {
      await db.prepare(
        `INSERT INTO business_invoice_items (id, invoice_id, description, quantity, unit_price, amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(randomUUID(), id, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price);
    }

    const inv = await db.prepare('SELECT * FROM business_invoices WHERE id = ?').get(id);
    const savedItems = await db.prepare('SELECT * FROM business_invoice_items WHERE invoice_id = ?').all(id);
    res.status(201).json({ ...inv, items: savedItems });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// PATCH /api/business/invoices/:id/status — update invoice status
businessRouter.patch('/invoices/:id/status', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { status } = req.body as { status: string };
    await db.prepare('UPDATE business_invoices SET status=? WHERE id=? AND user_id=?')
      .run(status, req.params.id, userId);
    res.json(await db.prepare('SELECT * FROM business_invoices WHERE id = ?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

businessRouter.delete('/invoices/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM business_invoices WHERE id=? AND user_id=?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

businessRouter.get('/expenses', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const rows = await db.prepare(
      `SELECT e.*, p.name as project_name
       FROM business_expenses e
       LEFT JOIN business_projects p ON p.id = e.project_id
       WHERE e.user_id = ?
       ORDER BY e.expense_date DESC
       LIMIT ?`,
    ).all(userId, limit);
    res.json({ expenses: rows });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

businessRouter.post('/expenses', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { project_id, category, description, amount, expense_date, is_billable, receipt_note } =
      req.body as Record<string, string>;
    if (!description?.trim() || !expense_date) return res.status(400).json({ error: 'description and expense_date required' });
    const id = randomUUID();
    await db.prepare(
      `INSERT INTO business_expenses
         (id, user_id, project_id, category, description, amount, expense_date, is_billable, receipt_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, project_id || null, category ?? 'Other', description.trim(),
      Number(amount) || 0, expense_date, is_billable === '1' || is_billable === 'true' ? 1 : 0,
      receipt_note ?? '');
    res.status(201).json(await db.prepare('SELECT * FROM business_expenses WHERE id = ?').get(id));
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

businessRouter.delete('/expenses/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM business_expenses WHERE id=? AND user_id=?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ─── Insights ─────────────────────────────────────────────────────────────────

// GET /api/business/metrics — dashboard numbers
businessRouter.get('/metrics', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    const monthStart = thisMonthStart.toISOString().slice(0, 10);

    const totalRevenue = await db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as n FROM business_invoices
       WHERE user_id = ? AND status = 'paid'`,
    ).get(userId) as { n: number };

    const monthRevenue = await db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as n FROM business_invoices
       WHERE user_id = ? AND status = 'paid' AND issue_date >= ?`,
    ).get(userId, monthStart) as { n: number };

    const outstanding = await db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as n FROM business_invoices
       WHERE user_id = ? AND status IN ('sent', 'overdue')`,
    ).get(userId) as { n: number };

    const activeProjects = await db.prepare(
      `SELECT COUNT(*) as n FROM business_projects WHERE user_id = ? AND status = 'active'`,
    ).get(userId) as { n: number };

    const clientCount = await db.prepare(
      `SELECT COUNT(*) as n FROM business_clients WHERE user_id = ? AND status = 'active'`,
    ).get(userId) as { n: number };

    const monthExpenses = await db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as n FROM business_expenses
       WHERE user_id = ? AND expense_date >= ?`,
    ).get(userId, monthStart) as { n: number };

    const topClients = await db.prepare(
      `SELECT c.name, COALESCE(SUM(i.total_amount), 0) as revenue
       FROM business_clients c
       LEFT JOIN business_invoices i ON i.client_id = c.id AND i.status = 'paid'
       WHERE c.user_id = ?
       GROUP BY c.id, c.name
       ORDER BY revenue DESC
       LIMIT 5`,
    ).all(userId);

    res.json({
      totalRevenue: totalRevenue.n,
      monthRevenue: monthRevenue.n,
      outstanding: outstanding.n,
      activeProjects: activeProjects.n,
      clientCount: clientCount.n,
      monthExpenses: monthExpenses.n,
      topClients,
    });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// POST /api/business/insights — AI business health summary
businessRouter.post('/insights', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    const monthStart = thisMonthStart.toISOString().slice(0, 10);

    const [totalRev, monthRev, outstanding, projects, expenses, topClients] = await Promise.all([
      db.prepare(`SELECT COALESCE(SUM(total_amount),0) as n FROM business_invoices WHERE user_id=? AND status='paid'`).get(userId) as Promise<{n:number}>,
      db.prepare(`SELECT COALESCE(SUM(total_amount),0) as n FROM business_invoices WHERE user_id=? AND status='paid' AND issue_date>=?`).get(userId, monthStart) as Promise<{n:number}>,
      db.prepare(`SELECT COALESCE(SUM(total_amount),0) as n FROM business_invoices WHERE user_id=? AND status IN ('sent','overdue')`).get(userId) as Promise<{n:number}>,
      db.prepare(`SELECT status, COUNT(*) as n FROM business_projects WHERE user_id=? GROUP BY status`).all(userId) as Promise<{status:string;n:number}[]>,
      db.prepare(`SELECT COALESCE(SUM(amount),0) as n FROM business_expenses WHERE user_id=? AND expense_date>=?`).get(userId, monthStart) as Promise<{n:number}>,
      db.prepare(`SELECT c.name, COALESCE(SUM(i.total_amount),0) as rev FROM business_clients c LEFT JOIN business_invoices i ON i.client_id=c.id AND i.status='paid' WHERE c.user_id=? GROUP BY c.id,c.name ORDER BY rev DESC LIMIT 3`).all(userId) as Promise<{name:string;rev:number}[]>,
    ]);

    const snapshot = {
      totalRevenuePaid: (await totalRev).n,
      thisMonthRevenue: (await monthRev).n,
      outstandingReceivables: (await outstanding).n,
      projects: await projects,
      thisMonthExpenses: (await expenses).n,
      netProfit: (await monthRev).n - (await expenses).n,
      topClients: await topClients,
    };

    const insight = await callAI(INSIGHTS_SYSTEM, JSON.stringify(snapshot, null, 2));
    res.json({ insight, snapshot });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});
