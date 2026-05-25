/**
 * SSO / Partner Portal — Phase 4 White-Label Scaffold
 * Propel Stack AI, LLC
 *
 * Handles partner SSO login flows (SAML 2.0, Auth0 Organization, OIDC).
 * Reads the ?partner= or ?org= query param to resolve white-label branding.
 *
 * PRODUCTION NOTE: Full SAML/Auth0 activation requires:
 *   - AUTH0_DOMAIN and AUTH0_CLIENT_ID environment variables on the server
 *   - Auth0 organization configured for each partner (see admin/SuperDashboard)
 *   - SAML metadata exchange with partner IdP
 *
 * This page currently provides the UI scaffold and detects the partner slug.
 * SSO button calls /api/sso/initiate/:slug to kick off the OIDC flow.
 */

import { useState } from 'react';
import { Shield, Building2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';

// ─── Partner brand config (resolved server-side; stub for UI) ────────────────

interface PartnerBrand {
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
}

// ─── SSO initiation ───────────────────────────────────────────────────────────

async function initiateSSO(slug: string): Promise<{ redirect_url: string }> {
  return apiRequest<{ redirect_url: string }>(`/api/sso/initiate/${slug}`, {
    method: 'POST',
    body: { slug },
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SsoPortal() {
  // Resolve partner slug from URL: /#/sso?partner=acme or ?org=acme
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const slug = params.get('partner') ?? params.get('org') ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Placeholder brand while loading (real data fetched on /api/sso/partner/:slug)
  const brand: PartnerBrand = {
    name: slug ? `${slug.charAt(0).toUpperCase() + slug.slice(1)} Workspace` : 'Your Organization',
    slug,
    primary_color: '#4F35C2',
  };

  async function handleSsoLogin() {
    if (!slug) {
      setError('No partner organization specified. Please use the link provided by your organization administrator.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { redirect_url } = await initiateSSO(slug);
      // Full-page redirect to IdP
      window.location.href = redirect_url;
    } catch {
      setError('SSO is not yet configured for this organization. Please contact your administrator or sign in with email/password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-[#0F0A2E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="2"  y="2"  width="13" height="13" rx="3.5" fill="#4F35C2" />
              <rect x="17" y="2"  width="13" height="13" rx="3.5" fill="#F05A28" />
              <rect x="2"  y="17" width="13" height="13" rx="3.5" fill="#01696F" />
              <rect x="17" y="17" width="13" height="13" rx="3.5" fill="#6B21A8" />
            </svg>
            {slug && (
              <>
                <div className="w-px h-8 bg-surface-ink/20 dark:bg-white/20" />
                <Building2 size={32} style={{ color: brand.primary_color }} />
              </>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-surface-ink dark:text-white">
            {slug ? `Sign in to ${brand.name}` : 'Partner SSO Login'}
          </h1>
          <p className="text-sm text-surface-muted mt-1">
            {slug
              ? 'Use your organization credentials to access Life OS'
              : 'Access your organization\'s Propel Stack AI workspace'}
          </p>
        </div>

        {/* SSO Card */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-indigo/5 dark:bg-brand-indigo/10">
            <Shield size={20} className="text-brand-indigo shrink-0" />
            <div>
              <p className="text-sm font-semibold text-surface-ink dark:text-white">Single Sign-On</p>
              <p className="text-xs text-surface-muted">Secured by your organization's identity provider</p>
            </div>
          </div>

          {!slug && (
            <div>
              <label className="block text-xs font-semibold text-surface-muted mb-1.5 uppercase tracking-wide">
                Organization Slug
              </label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 rounded-l-lg bg-surface-sunk border border-r-0 border-surface-ink/10 dark:border-white/10 text-xs text-surface-muted">
                  propelstackai.com/
                </span>
                <input
                  type="text"
                  className="input flex-1 rounded-l-none"
                  placeholder="your-company"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) window.location.hash = `/sso?partner=${val}`;
                    }
                  }}
                />
              </div>
              <p className="text-xs text-surface-muted mt-1">Press Enter to continue</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {slug && (
            <button
              type="button"
              onClick={handleSsoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-brand-indigo text-white font-semibold hover:brightness-110 disabled:opacity-60 transition-all"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Redirecting to your IdP…</>
              ) : (
                <>Continue with SSO <ArrowRight size={16} /></>
              )}
            </button>
          )}

          <div className="border-t border-surface-ink/[0.08] dark:border-white/[0.08] pt-3">
            <p className="text-xs text-center text-surface-muted">
              Not using SSO?{' '}
              <a href="/#/" className="text-brand-indigo hover:underline">
                Sign in with email
              </a>
            </p>
          </div>
        </div>

        {/* Compliance badges */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className="text-[10px] font-semibold text-surface-muted uppercase tracking-wide">SOC 2 Type II (In Progress)</span>
          <span className="text-surface-muted">·</span>
          <span className="text-[10px] font-semibold text-surface-muted uppercase tracking-wide">GDPR Ready</span>
          <span className="text-surface-muted">·</span>
          <span className="text-[10px] font-semibold text-surface-muted uppercase tracking-wide">DPA Available</span>
        </div>

        <p className="text-center text-xs text-surface-muted mt-4">
          Powered by <span className="font-semibold text-brand-indigo">Propel Stack AI, LLC</span>
        </p>
      </div>
    </div>
  );
}
