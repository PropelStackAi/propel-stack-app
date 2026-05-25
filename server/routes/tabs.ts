// ─── Dashboard Tabs Routes — Customizable Tab Layout ─────────────────────────
// Propel Stack AI, LLC
//
// Users can show/hide built-in tabs and (Solo+) create custom tabs pointing
// to any hub route. Order persists server-side — no localStorage used.

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';

export const tabsRouter = Router();

// Built-in tabs seeded for every user on first access
const DEFAULT_TABS = [
  { tab_key: 'dashboard',  label: 'Dashboard',     icon: 'layout-dashboard',  href: '/',         sort_order: 0,  tab_type: 'built-in' },
  { tab_key: 'lifescore',  label: 'Life Score',     icon: 'activity',          href: '/lifescore', sort_order: 1,  tab_type: 'built-in' },
  { tab_key: 'briefing',   label: 'Briefing',       icon: 'sparkles',          href: '/briefing',  sort_order: 2,  tab_type: 'built-in' },
  { tab_key: 'goals',      label: 'Goals',          icon: 'target',            href: '/goals',     sort_order: 3,  tab_type: 'built-in' },
  { tab_key: 'journal',    label: 'Journal',        icon: 'notebook-pen',      href: '/journal',   sort_order: 4,  tab_type: 'built-in' },
  { tab_key: 'health',     label: 'Health',         icon: 'heart',             href: '/health',    sort_order: 5,  tab_type: 'built-in' },
  { tab_key: 'financial',  label: 'Finance',        icon: 'dollar-sign',       href: '/financial', sort_order: 6,  tab_type: 'built-in' },
  { tab_key: 'coach',      label: 'AI Coach',       icon: 'message-circle',    href: '/coach',     sort_order: 7,  tab_type: 'built-in' },
];

// ─── GET /api/tabs ────────────────────────────────────────────────────────────

tabsRouter.get('/', async (_req, res) => {
  try {
    const userId = getCurrentUserId();

    let rows = await db
      .prepare('SELECT * FROM user_tabs WHERE user_id = ? ORDER BY sort_order ASC')
      .all(userId) as any[];

    // Seed defaults if no tabs yet
    if (rows.length === 0) {
      for (const tab of DEFAULT_TABS) {
        await db.prepare(`
          INSERT INTO user_tabs (user_id, tab_key, label, icon, tab_type, href, sort_order, is_visible)
          VALUES (?, ?, ?, ?, ?, ?, ?, true)
          ON CONFLICT (user_id, tab_key) DO NOTHING
        `).run(userId, tab.tab_key, tab.label, tab.icon, tab.tab_type, tab.href, tab.sort_order);
      }
      rows = await db
        .prepare('SELECT * FROM user_tabs WHERE user_id = ? ORDER BY sort_order ASC')
        .all(userId) as any[];
    }

    res.json({ tabs: rows });
  } catch (err) {
    console.error('[tabs] get error', err);
    res.status(500).json({ error: 'Failed to load tabs' });
  }
});

// ─── PUT /api/tabs/reorder ────────────────────────────────────────────────────
// Accepts ordered array of tab_keys; persists sort_order

tabsRouter.put('/reorder', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { ordered_keys } = req.body as { ordered_keys: string[] };

    if (!Array.isArray(ordered_keys)) {
      return res.status(400).json({ error: 'ordered_keys must be an array' });
    }

    for (let i = 0; i < ordered_keys.length; i++) {
      await db.prepare(`
        UPDATE user_tabs SET sort_order = ? WHERE user_id = ? AND tab_key = ?
      `).run(i, userId, ordered_keys[i]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[tabs] reorder error', err);
    res.status(500).json({ error: 'Failed to reorder tabs' });
  }
});

// ─── PATCH /api/tabs/:tab_key/visibility ─────────────────────────────────────

tabsRouter.patch('/:tab_key/visibility', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { tab_key } = req.params;
    const { is_visible } = req.body as { is_visible: boolean };

    await db.prepare(`
      UPDATE user_tabs SET is_visible = ? WHERE user_id = ? AND tab_key = ?
    `).run(is_visible, userId, tab_key);

    res.json({ ok: true });
  } catch (err) {
    console.error('[tabs] visibility error', err);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
});

// ─── POST /api/tabs ───────────────────────────────────────────────────────────
// Create a custom tab (plan-gated: Solo+)

tabsRouter.post('/', async (req, res) => {
  try {
    const userId = getCurrentUserId();

    // Plan gate: check user plan
    const user = await db
      .prepare('SELECT plan_tier FROM users WHERE id = ?')
      .get(userId) as any;

    const GATED_PLANS = ['solo', 'family', 'network', 'elite'];
    if (!GATED_PLANS.includes(user?.plan_tier ?? '')) {
      return res.status(403).json({ error: 'Custom tabs require Solo or higher plan' });
    }

    const { label, href, icon, accent } = req.body as {
      label: string;
      href: string;
      icon?: string;
      accent?: string;
    };

    if (!label || !href) {
      return res.status(400).json({ error: 'label and href required' });
    }

    // Generate a unique key
    const tab_key = `custom_${Date.now()}`;

    // Get current max sort_order
    const maxRow = await db
      .prepare('SELECT MAX(sort_order) AS m FROM user_tabs WHERE user_id = ?')
      .get(userId) as any;
    const sort_order = (maxRow?.m ?? 0) + 1;

    await db.prepare(`
      INSERT INTO user_tabs (user_id, tab_key, label, icon, tab_type, href, sort_order, is_visible, accent)
      VALUES (?, ?, ?, ?, 'custom', ?, ?, true, ?)
    `).run(userId, tab_key, label, icon ?? 'layout-dashboard', href, sort_order, accent ?? null);

    const tab = await db
      .prepare('SELECT * FROM user_tabs WHERE user_id = ? AND tab_key = ?')
      .get(userId, tab_key);

    res.status(201).json({ tab });
  } catch (err) {
    console.error('[tabs] create error', err);
    res.status(500).json({ error: 'Failed to create tab' });
  }
});

// ─── DELETE /api/tabs/:tab_key ────────────────────────────────────────────────
// Only custom tabs can be deleted

tabsRouter.delete('/:tab_key', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { tab_key } = req.params;

    const tab = await db
      .prepare('SELECT tab_type FROM user_tabs WHERE user_id = ? AND tab_key = ?')
      .get(userId, tab_key) as any;

    if (!tab) {
      return res.status(404).json({ error: 'Tab not found' });
    }
    if (tab.tab_type !== 'custom') {
      return res.status(400).json({ error: 'Built-in tabs cannot be deleted — hide them instead' });
    }

    await db
      .prepare('DELETE FROM user_tabs WHERE user_id = ? AND tab_key = ?')
      .run(userId, tab_key);

    res.json({ ok: true });
  } catch (err) {
    console.error('[tabs] delete error', err);
    res.status(500).json({ error: 'Failed to delete tab' });
  }
});
