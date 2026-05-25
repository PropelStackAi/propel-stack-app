// ─── Dashboard Config Routes — AM Dashboard Customization ────────────────────
// Propel Stack AI, LLC
//
// Per-user dashboard widget visibility, order, briefing time, and auto-refresh.
// Server persists config so no localStorage is used (hard rule compliance).

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';

export const dashboardConfigRouter = Router();

const DEFAULT_WIDGETS = [
  'morning_briefing',
  'life_score',
  'goals',
  'streaks',
  'mood',
  'energy',
  'finance',
  'health',
];

// ─── GET /api/dashboard-config ───────────────────────────────────────────────

dashboardConfigRouter.get('/', async (_req, res) => {
  try {
    const userId = getCurrentUserId();

    let config = await db
      .prepare('SELECT * FROM dashboard_config WHERE user_id = ?')
      .get(userId) as any;

    if (!config) {
      // Auto-create default config on first access
      await db.prepare(`
        INSERT INTO dashboard_config (user_id, widgets_enabled, widget_order)
        VALUES (?, ?, ?)
        ON CONFLICT (user_id) DO NOTHING
      `).run(userId, JSON.stringify(DEFAULT_WIDGETS), JSON.stringify(DEFAULT_WIDGETS));

      config = await db
        .prepare('SELECT * FROM dashboard_config WHERE user_id = ?')
        .get(userId) as any;
    }

    res.json({
      widgets_enabled:       JSON.parse(config.widgets_enabled ?? '[]'),
      widget_order:          JSON.parse(config.widget_order ?? '[]').length
        ? JSON.parse(config.widget_order)
        : DEFAULT_WIDGETS,
      briefing_time:         config.briefing_time        ?? '07:00',
      compact_mode:          config.compact_mode          ?? false,
      auto_refresh:          config.auto_refresh          ?? true,
      refresh_interval_mins: config.refresh_interval_mins ?? 30,
    });
  } catch (err) {
    console.error('[dashboard-config] get error', err);
    res.status(500).json({ error: 'Failed to load dashboard config' });
  }
});

// ─── PUT /api/dashboard-config ───────────────────────────────────────────────

dashboardConfigRouter.put('/', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const {
      widgets_enabled,
      widget_order,
      briefing_time,
      compact_mode,
      auto_refresh,
      refresh_interval_mins,
    } = req.body as {
      widgets_enabled?: string[];
      widget_order?: string[];
      briefing_time?: string;
      compact_mode?: boolean;
      auto_refresh?: boolean;
      refresh_interval_mins?: number;
    };

    // Validate briefing_time format HH:MM
    if (briefing_time && !/^\d{2}:\d{2}$/.test(briefing_time)) {
      return res.status(400).json({ error: 'Invalid briefing_time format' });
    }

    // Validate refresh interval (5 min minimum)
    if (refresh_interval_mins !== undefined && refresh_interval_mins < 5) {
      return res.status(400).json({ error: 'refresh_interval_mins must be >= 5' });
    }

    await db.prepare(`
      INSERT INTO dashboard_config
        (user_id, widgets_enabled, widget_order, briefing_time, compact_mode, auto_refresh, refresh_interval_mins)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        widgets_enabled       = COALESCE(EXCLUDED.widgets_enabled, dashboard_config.widgets_enabled),
        widget_order          = COALESCE(EXCLUDED.widget_order,    dashboard_config.widget_order),
        briefing_time         = COALESCE(EXCLUDED.briefing_time,   dashboard_config.briefing_time),
        compact_mode          = COALESCE(EXCLUDED.compact_mode,    dashboard_config.compact_mode),
        auto_refresh          = COALESCE(EXCLUDED.auto_refresh,    dashboard_config.auto_refresh),
        refresh_interval_mins = COALESCE(EXCLUDED.refresh_interval_mins, dashboard_config.refresh_interval_mins),
        updated_at            = NOW()
    `).run(
      userId,
      JSON.stringify(widgets_enabled ?? DEFAULT_WIDGETS),
      JSON.stringify(widget_order ?? DEFAULT_WIDGETS),
      briefing_time ?? '07:00',
      compact_mode ?? false,
      auto_refresh ?? true,
      refresh_interval_mins ?? 30,
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[dashboard-config] update error', err);
    res.status(500).json({ error: 'Failed to update dashboard config' });
  }
});

// ─── PATCH /api/dashboard-config/widget ──────────────────────────────────────
// Toggle a single widget on/off without resending the full config

dashboardConfigRouter.patch('/widget', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { widget_id, enabled } = req.body as { widget_id: string; enabled: boolean };

    if (!widget_id) {
      return res.status(400).json({ error: 'widget_id required' });
    }

    const config = await db
      .prepare('SELECT widgets_enabled FROM dashboard_config WHERE user_id = ?')
      .get(userId) as any;

    const current: string[] = config ? JSON.parse(config.widgets_enabled ?? '[]') : DEFAULT_WIDGETS;

    let updated: string[];
    if (enabled && !current.includes(widget_id)) {
      updated = [...current, widget_id];
    } else if (!enabled) {
      updated = current.filter((w) => w !== widget_id);
    } else {
      updated = current;
    }

    await db.prepare(`
      INSERT INTO dashboard_config (user_id, widgets_enabled, widget_order)
      VALUES (?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        widgets_enabled = EXCLUDED.widgets_enabled,
        updated_at = NOW()
    `).run(userId, JSON.stringify(updated), JSON.stringify(updated));

    res.json({ ok: true, widgets_enabled: updated });
  } catch (err) {
    console.error('[dashboard-config] widget toggle error', err);
    res.status(500).json({ error: 'Failed to toggle widget' });
  }
});
