/**
 * Workspaces API — Enterprise Onboarding
 * Propel Stack AI, LLC
 *
 * Multi-workspace system for Family, Education, and Business tiers.
 * Supports: class workspaces, team workspaces, family workspaces, institution workspaces.
 *
 * Endpoints:
 *   GET    /api/workspaces                     — list user's workspaces
 *   POST   /api/workspaces                     — create workspace
 *   GET    /api/workspaces/:id                 — workspace detail + members
 *   PATCH  /api/workspaces/:id                 — update workspace
 *   DELETE /api/workspaces/:id                 — delete workspace (owner only)
 *   GET    /api/workspaces/:id/invite-code     — get/generate join code
 *   POST   /api/workspaces/:id/invite          — invite by email(s)
 *   POST   /api/workspaces/join                — join by code
 *   GET    /api/workspaces/:id/members         — list members
 *   PATCH  /api/workspaces/:id/members/:mid    — update member role
 *   DELETE /api/workspaces/:id/members/:mid    — remove member
 *   GET    /api/workspaces/:id/adoption        — adoption stats (admin)
 *   GET    /api/workspaces/:id/checklist       — launch checklist
 *   POST   /api/workspaces/:id/checklist       — update checklist item
 */

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';

export const workspacesRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkspaceType = 'family' | 'class' | 'team' | 'institution' | 'personal';
type WorkspaceTrack = 'consumer' | 'education' | 'business';
type MemberRole = 'owner' | 'admin' | 'teacher' | 'staff' | 'student' | 'family_member' |
                  'contributor' | 'manager' | 'analyst' | 'it_admin' | 'viewer';

// ─── GET /api/workspaces ──────────────────────────────────────────────────────

workspacesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT w.*, wm.role AS my_role,
             (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id AND status = 'active') AS member_count
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $1 AND wm.status = 'active'
      ORDER BY w.updated_at DESC
    `).all(userId);
    res.json(rows);
  } catch (err: unknown) {
    console.error('[workspaces] list error:', err);
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
});

// ─── POST /api/workspaces ─────────────────────────────────────────────────────

workspacesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const {
      name,
      type = 'team',
      track = 'business',
      config = {},
    } = req.body as {
      name: string;
      type?: WorkspaceType;
      track?: WorkspaceTrack;
      config?: Record<string, unknown>;
    };

    if (!name?.trim()) return res.status(400).json({ error: 'Workspace name required' });

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO workspaces (id, owner_id, name, type, track, config, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `).run(id, userId, name.trim(), type, track, JSON.stringify(config));

    // Auto-add owner as a member
    await db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at)
      VALUES ($1, $2, $3, 'owner', 'active', NOW())
    `).run(crypto.randomUUID(), id, userId);

    const workspace = await db.prepare('SELECT * FROM workspaces WHERE id = $1').get(id);
    res.status(201).json(workspace);
  } catch (err: unknown) {
    console.error('[workspaces] create error:', err);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// ─── GET /api/workspaces/:id ──────────────────────────────────────────────────

workspacesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params as { id: string };

    // Check membership
    const membership = await db.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!membership) return res.status(404).json({ error: 'Workspace not found' });

    const workspace = await db.prepare('SELECT * FROM workspaces WHERE id = $1').get(id);
    const members = await db.prepare(`
      SELECT wm.id, wm.user_id, u.display_name, u.email, wm.role, wm.status, wm.joined_at
      FROM workspace_members wm
      LEFT JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = $1
      ORDER BY wm.joined_at ASC
    `).all(id);

    res.json({ ...workspace as object, members, my_role: membership.role });
  } catch (err: unknown) {
    console.error('[workspaces] detail error:', err);
    res.status(500).json({ error: 'Failed to load workspace' });
  }
});

// ─── PATCH /api/workspaces/:id ────────────────────────────────────────────────

workspacesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params as { id: string };

    const membership = await db.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, config } = req.body as { name?: string; config?: Record<string, unknown> };
    await db.prepare(`
      UPDATE workspaces SET
        name = COALESCE($1, name),
        config = COALESCE($2, config),
        updated_at = NOW()
      WHERE id = $3
    `).run(name ?? null, config ? JSON.stringify(config) : null, id);

    res.json(await db.prepare('SELECT * FROM workspaces WHERE id = $1').get(id));
  } catch (err: unknown) {
    console.error('[workspaces] update error:', err);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// ─── DELETE /api/workspaces/:id ───────────────────────────────────────────────

workspacesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params as { id: string };

    const ws = await db.prepare('SELECT owner_id FROM workspaces WHERE id = $1').get(id) as
      { owner_id: string } | undefined;
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    if (ws.owner_id !== userId) return res.status(403).json({ error: 'Owner only' });

    await db.prepare('DELETE FROM workspaces WHERE id = $1').run(id);
    res.status(204).end();
  } catch (err: unknown) {
    console.error('[workspaces] delete error:', err);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// ─── GET /api/workspaces/:id/invite-code ─────────────────────────────────────

workspacesRouter.get('/:id/invite-code', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params as { id: string };

    // Verify admin/owner access
    const membership = await db.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!membership || !['owner', 'admin', 'teacher'].includes(membership.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get or create a standing join code (no expiry for link-based invite)
    let invite = await db.prepare(`
      SELECT join_code FROM workspace_invites
      WHERE workspace_id = $1 AND expires_at IS NULL AND used_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `).get(id) as { join_code: string } | undefined;

    if (!invite) {
      const join_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.prepare(`
        INSERT INTO workspace_invites (id, workspace_id, join_code, role, created_by)
        VALUES ($1, $2, $3, 'member', $4)
      `).run(crypto.randomUUID(), id, join_code, userId);
      invite = { join_code };
    }

    res.json({ join_code: invite.join_code, workspace_id: id });
  } catch (err: unknown) {
    console.error('[workspaces] invite-code error:', err);
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
});

// ─── POST /api/workspaces/:id/invite ─────────────────────────────────────────

workspacesRouter.post('/:id/invite', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params as { id: string };

    const membership = await db.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!membership || !['owner', 'admin', 'teacher'].includes(membership.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { emails = [], role = 'member' } = req.body as { emails: string[]; role?: string };
    const results: { email: string; status: string }[] = [];

    for (const email of emails) {
      const clean = email.trim().toLowerCase();
      if (!clean) continue;
      try {
        await db.prepare(`
          INSERT INTO workspace_invites (id, workspace_id, email, role, created_by, expires_at)
          VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
          ON CONFLICT (workspace_id, email) DO UPDATE
            SET role = excluded.role, expires_at = excluded.expires_at, used_at = NULL
        `).run(crypto.randomUUID(), id, clean, role, userId);
        results.push({ email: clean, status: 'invited' });
      } catch {
        results.push({ email: clean, status: 'error' });
      }
    }

    res.json({ invited: results.filter((r) => r.status === 'invited').length, results });
  } catch (err: unknown) {
    console.error('[workspaces] invite error:', err);
    res.status(500).json({ error: 'Failed to send invites' });
  }
});

// ─── POST /api/workspaces/join ────────────────────────────────────────────────

workspacesRouter.post('/join', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { join_code } = req.body as { join_code: string };
    if (!join_code?.trim()) return res.status(400).json({ error: 'Join code required' });

    const invite = await db.prepare(`
      SELECT * FROM workspace_invites
      WHERE join_code = $1 AND used_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    `).get(join_code.trim().toUpperCase()) as {
      id: string; workspace_id: string; role: string; expires_at: string | null;
    } | undefined;

    if (!invite) return res.status(404).json({ error: 'Invalid or expired join code' });

    // Check already a member
    const existing = await db.prepare(`
      SELECT id FROM workspace_members
      WHERE workspace_id = $1 AND user_id = $2
    `).get(invite.workspace_id, userId);
    if (existing) return res.status(409).json({ error: 'Already a member of this workspace' });

    // Add member
    await db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at)
      VALUES ($1, $2, $3, $4, 'active', NOW())
    `).run(crypto.randomUUID(), invite.workspace_id, userId, invite.role ?? 'member');

    // Mark code as used if it has an expiry (standing codes remain reusable)
    if (invite.expires_at) {
      await db.prepare('UPDATE workspace_invites SET used_at = NOW() WHERE id = $1').run(invite.id);
    }

    const workspace = await db.prepare('SELECT * FROM workspaces WHERE id = $1').get(invite.workspace_id);
    res.json({ joined: true, workspace });
  } catch (err: unknown) {
    console.error('[workspaces] join error:', err);
    res.status(500).json({ error: 'Failed to join workspace' });
  }
});

// ─── GET /api/workspaces/:id/members ─────────────────────────────────────────

workspacesRouter.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params as { id: string };

    const membership = await db.prepare(`
      SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!membership) return res.status(404).json({ error: 'Workspace not found' });

    const members = await db.prepare(`
      SELECT wm.id, wm.user_id, u.display_name, u.email, wm.role, wm.status,
             wm.invited_at, wm.joined_at
      FROM workspace_members wm
      LEFT JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = $1
      ORDER BY wm.role, wm.joined_at ASC
    `).all(id);

    const pending = await db.prepare(`
      SELECT email, role, expires_at FROM workspace_invites
      WHERE workspace_id = $1 AND used_at IS NULL AND expires_at IS NOT NULL
        AND expires_at > NOW()
    `).all(id);

    res.json({ members, pending_invites: pending });
  } catch (err: unknown) {
    console.error('[workspaces] members error:', err);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

// ─── PATCH /api/workspaces/:id/members/:mid ───────────────────────────────────

workspacesRouter.patch('/:id/members/:mid', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id, mid } = req.params as { id: string; mid: string };

    const myMembership = await db.prepare(`
      SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { role, status } = req.body as { role?: MemberRole; status?: string };
    await db.prepare(`
      UPDATE workspace_members
      SET role = COALESCE($1, role), status = COALESCE($2, status)
      WHERE id = $3 AND workspace_id = $4
    `).run(role ?? null, status ?? null, mid, id);

    res.json({ ok: true });
  } catch (err: unknown) {
    console.error('[workspaces] update member error:', err);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// ─── DELETE /api/workspaces/:id/members/:mid ──────────────────────────────────

workspacesRouter.delete('/:id/members/:mid', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id, mid } = req.params as { id: string; mid: string };

    const myMembership = await db.prepare(`
      SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.prepare(`
      UPDATE workspace_members SET status = 'removed' WHERE id = $1 AND workspace_id = $2
    `).run(mid, id);
    res.json({ ok: true });
  } catch (err: unknown) {
    console.error('[workspaces] remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ─── GET /api/workspaces/:id/adoption ─────────────────────────────────────────

workspacesRouter.get('/:id/adoption', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params as { id: string };

    const membership = await db.prepare(`
      SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!membership || !['owner', 'admin', 'teacher', 'district_admin', 'campus_admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const totals = await db.prepare(`
      SELECT
        COUNT(*)                                                           AS total_seats,
        COUNT(CASE WHEN status = 'active' THEN 1 END)                    AS active_members,
        COUNT(CASE WHEN joined_at > NOW() - INTERVAL '7 days' THEN 1 END) AS joined_last_7d,
        COUNT(CASE WHEN joined_at > NOW() - INTERVAL '30 days' THEN 1 END) AS joined_last_30d
      FROM workspace_members WHERE workspace_id = $1
    `).get(id);

    const pending = await db.prepare(`
      SELECT COUNT(*) AS pending_invites FROM workspace_invites
      WHERE workspace_id = $1 AND used_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    `).get(id);

    const workspace = await db.prepare('SELECT name, type, track, config FROM workspaces WHERE id = $1').get(id);

    res.json({
      workspace,
      ...totals as object,
      ...pending as object,
      adoption_rate: (totals as Record<string, number>).total_seats > 0
        ? Math.round(((totals as Record<string, number>).active_members / (totals as Record<string, number>).total_seats) * 100)
        : 0,
    });
  } catch (err: unknown) {
    console.error('[workspaces] adoption error:', err);
    res.status(500).json({ error: 'Failed to load adoption stats' });
  }
});

// ─── GET /api/workspaces/:id/checklist ────────────────────────────────────────

workspacesRouter.get('/:id/checklist', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params as { id: string };

    const membership = await db.prepare(`
      SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!membership) return res.status(404).json({ error: 'Workspace not found' });

    const items = await db.prepare(`
      SELECT item_key, completed, completed_at FROM workspace_checklist_items
      WHERE workspace_id = $1 ORDER BY created_at ASC
    `).all(id) as { item_key: string; completed: boolean; completed_at: string | null }[];

    res.json(items);
  } catch (err: unknown) {
    console.error('[workspaces] checklist get error:', err);
    res.status(500).json({ error: 'Failed to load checklist' });
  }
});

// ─── POST /api/workspaces/:id/checklist ───────────────────────────────────────

workspacesRouter.post('/:id/checklist', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { id } = req.params as { id: string };

    const membership = await db.prepare(`
      SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
    `).get(id, userId) as { role: string } | undefined;
    if (!membership) return res.status(404).json({ error: 'Workspace not found' });

    const { item, completed } = req.body as { item: string; completed: boolean };

    await db.prepare(`
      INSERT INTO workspace_checklist_items (id, workspace_id, item_key, completed, completed_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (workspace_id, item_key) DO UPDATE
        SET completed = excluded.completed,
            completed_at = CASE WHEN excluded.completed THEN NOW() ELSE NULL END
    `).run(crypto.randomUUID(), id, item, completed, completed ? new Date().toISOString() : null);

    res.json({ ok: true });
  } catch (err: unknown) {
    console.error('[workspaces] checklist post error:', err);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});
