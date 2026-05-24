/**
 * Audit Logging Helper — Enhancement 41
 * Propel Stack AI, LLC
 *
 * Call audit() from any sensitive endpoint: vault open, credential sync,
 * document download, login, logout, failed auth, data export, admin actions.
 */

import { db } from '../db.js';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

export async function audit(
  userId: string,
  action: string,
  resource: string,
  req: Request,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? null;
    const userAgent = req.headers['user-agent'] ?? null;

    await db.prepare(`
      INSERT INTO audit_log (id, user_id, action, resource, ip_address, user_agent, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `).run(
      randomUUID(),
      userId,
      action,
      resource,
      ip,
      userAgent,
      JSON.stringify(metadata),
    );
  } catch (err) {
    // Non-fatal — never block a request because audit logging failed
    console.error('[audit] Failed to write audit log:', err);
  }
}

// Common action constants
export const AUDIT = {
  VAULT_OPEN: 'vault.open',
  VAULT_DOWNLOAD: 'vault.download',
  CREDENTIAL_SYNC: 'credential.sync',
  DOCUMENT_DOWNLOAD: 'document.download',
  DATA_EXPORT: 'data.export',
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  TOKEN_REVOKED: 'auth.token_revoked',
  ADMIN_ACTION: 'admin.action',
  PRIVACY_SETTINGS_UPDATED: 'privacy.settings_updated',
  ESTATE_VAULT_ACCESSED: 'estate_vault.accessed',
  LEGAL_HUB_ACCESSED: 'legal_hub.accessed',
} as const;
