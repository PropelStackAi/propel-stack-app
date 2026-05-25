/**
 * Role-Based Access Control (RBAC) Middleware — Enhancement 34
 * Propel Stack AI, LLC
 *
 * Roles (lowest → highest): user → admin → super_admin
 * Usage:
 *   router.get('/admin/only', requireRole('admin'), handler)
 *   router.get('/super',      requireRole('super_admin'), handler)
 *
 * In the current auth stub, role is read from the users table.
 * When Auth0 is wired in, extract role from the JWT claims instead.
 */

import { type Request, type Response, type NextFunction } from 'express';
import { db, getCurrentUserId } from '../db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin' | 'super_admin';

const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  admin: 1,
  super_admin: 2,
};

// ─── Helper — fetch role from DB ──────────────────────────────────────────────

export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const row = await db
      .prepare('SELECT role FROM users WHERE id = $1')
      .get(userId) as { role?: string } | undefined;
    const r = row?.role ?? 'user';
    return (r in ROLE_RANK ? r : 'user') as UserRole;
  } catch {
    return 'user'; // Fail-safe: deny elevated access
  }
}

// ─── Middleware factory ────────────────────────────────────────────────────────

/**
 * Express middleware that enforces a minimum role requirement.
 * Returns 403 if the authenticated user's role is below the threshold.
 */
export function requireRole(minimumRole: UserRole) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getCurrentUserId();
      const role = await getUserRole(userId);

      if (ROLE_RANK[role] < ROLE_RANK[minimumRole]) {
        return res.status(403).json({
          error: 'Forbidden',
          required_role: minimumRole,
          your_role: role,
        });
      }

      next();
    } catch (err) {
      console.error('[requireRole] error:', err);
      res.status(500).json({ error: 'Role check failed' });
    }
  };
}

// ─── Helper — check role without middleware ───────────────────────────────────

/**
 * Non-middleware role check for use inside route handlers.
 * Returns true if the user meets or exceeds the required role.
 */
export async function hasRole(userId: string, minimumRole: UserRole): Promise<boolean> {
  const role = await getUserRole(userId);
  return ROLE_RANK[role] >= ROLE_RANK[minimumRole];
}
