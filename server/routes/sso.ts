/**
 * SSO Partner Login Routes — Phase 4 White-Label Scaffold
 * Propel Stack AI, LLC
 *
 * Provides the initiation endpoint for SAML/OIDC partner SSO flows.
 * Full activation requires Auth0 Organization configuration per partner.
 *
 * PRODUCTION CHECKLIST (per partner):
 *   1. Create Auth0 Organization for partner slug
 *   2. Configure partner's IdP (SAML or OIDC) in Auth0
 *   3. Set AUTH0_DOMAIN and AUTH0_CLIENT_ID env vars on Railway
 *   4. Set ALLOWED_CALLBACK_URL in Railway env (e.g. https://app.propelstackai.com)
 *   5. Update white_label_partners row: sso_enabled = true, sso_connection_id = <Auth0 connection ID>
 *
 * Until Auth0 is configured, this route returns a 503 with a setup message.
 */

import { Router } from 'express';
import { db } from '../db.js';

export const ssoRouter = Router();

// ─── GET /api/sso/partner/:slug — resolve partner branding ────────────────────

ssoRouter.get('/partner/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const partner = await db
      .prepare('SELECT id, name, slug, sso_enabled, plan FROM white_label_partners WHERE slug = ?')
      .get(slug) as { id: string; name: string; slug: string; sso_enabled: boolean; plan: string } | undefined;

    if (!partner) {
      return res.status(404).json({ error: 'Partner organization not found' });
    }

    res.json({
      name: partner.name,
      slug: partner.slug,
      sso_enabled: partner.sso_enabled,
      plan: partner.plan,
    });
  } catch (err) {
    console.error('[sso] partner lookup error', err);
    res.status(500).json({ error: 'Failed to resolve partner' });
  }
});

// ─── POST /api/sso/initiate/:slug — begin SSO flow ───────────────────────────

ssoRouter.post('/initiate/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Check if Auth0 is configured
    const auth0Domain  = process.env.AUTH0_DOMAIN;
    const auth0Client  = process.env.AUTH0_CLIENT_ID;
    const callbackUrl  = process.env.ALLOWED_CALLBACK_URL ?? 'https://app.propelstackai.com';

    if (!auth0Domain || !auth0Client) {
      return res.status(503).json({
        error: 'SSO not yet configured',
        message: 'Partner SSO requires Auth0 credentials to be set in Railway environment variables. Contact support@propelstackai.com.',
      });
    }

    // Resolve partner's Auth0 connection
    const partner = await db
      .prepare('SELECT id, name, sso_enabled FROM white_label_partners WHERE slug = ?')
      .get(slug) as { id: string; name: string; sso_enabled: boolean } | undefined;

    if (!partner) {
      return res.status(404).json({ error: 'Partner organization not found' });
    }

    if (!partner.sso_enabled) {
      return res.status(403).json({
        error: 'SSO not enabled',
        message: `SSO is not enabled for ${partner.name}. Contact your organization administrator.`,
      });
    }

    // Build Auth0 OIDC authorization URL
    const params = new URLSearchParams({
      client_id:     auth0Client,
      redirect_uri:  `${callbackUrl}/api/sso/callback`,
      response_type: 'code',
      scope:         'openid profile email',
      organization:  slug, // Auth0 Organization slug
      state:         slug, // Simple state — enhance with CSRF token in production
    });

    const redirectUrl = `https://${auth0Domain}/authorize?${params.toString()}`;
    res.json({ redirect_url: redirectUrl });

  } catch (err) {
    console.error('[sso] initiate error', err);
    res.status(500).json({ error: 'Failed to initiate SSO' });
  }
});

// ─── GET /api/sso/callback — Auth0 OIDC callback ─────────────────────────────

ssoRouter.get('/callback', async (req, res) => {
  // Full OIDC callback implementation:
  // 1. Exchange `code` for tokens using Auth0 token endpoint
  // 2. Decode id_token to extract user claims (email, name, org)
  // 3. Upsert user in our DB; set session or JWT
  // 4. Redirect to app dashboard

  const { state, code, error: oauthError } = req.query;

  if (oauthError) {
    console.error('[sso] Auth0 callback error:', oauthError);
    return res.redirect(`/#/sso?partner=${state}&error=${encodeURIComponent(String(oauthError))}`);
  }

  if (!code) {
    return res.redirect(`/#/sso?partner=${state}&error=no_code`);
  }

  // TODO: Exchange code for tokens when AUTH0_CLIENT_SECRET is set
  // For now, redirect back with a setup message
  console.log('[sso] Callback received for partner:', state, '— Auth0 token exchange pending credential setup');
  res.redirect(`/#/sso?partner=${state}&error=sso_pending_setup`);
});
