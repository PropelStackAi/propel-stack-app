/**
 * App Shell — Propel Stack AI, LLC
 *
 * Desktop: dark grouped-collapsible sidebar (220px) + main content area.
 * Mobile:  full-width content + fixed bottom tab bar + HubSheet overlay.
 */
import { type ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { QuickCapture } from '../features/dashboard/components/QuickCapture';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface User {
  id: string;
  email: string;
  display_name: string;
  plan_tier: string;
  ai_tokens_used_this_month: number;
  onboarding_completed_at: string | null;
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2"  y="2"  width="13" height="13" rx="3.5" fill="#4F35C2" />
      <rect x="17" y="2"  width="13" height="13" rx="3.5" fill="#F05A28" />
      <rect x="2"  y="17" width="13" height="13" rx="3.5" fill="#01696F" />
      <rect x="17" y="17" width="13" height="13" rx="3.5" fill="#6B21A8" />
    </svg>
  );
}

function MobileHeader({ user }: { user?: User }) {
  return (
    <header
      className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3"
      style={{ background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
    >
      <Link href="/" className="flex items-center gap-2" aria-label="Propel Stack AI home">
        <Logo />
        <span className="font-display font-extrabold text-[16px] text-surface-ink">Propel Stack AI</span>
      </Link>
      {user && (
        <div
          className="w-8 h-8 rounded-full bg-brand-indigo text-white grid place-items-center font-semibold text-sm"
          aria-label={`Signed in as ${user.display_name}`}
        >
          {user.display_name.slice(0, 1).toUpperCase()}
        </div>
      )}
    </header>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<User>('/api/me'),
  });

  // Enhancement 4: Redirect new users to onboarding wizard
  useEffect(() => {
    if (user && user.onboarding_completed_at === null) {
      navigate('/onboard');
    }
  }, [user]);

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Skip link */}
      <a
        href="#main-content"
        onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-brand-indigo focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar */}
      <Sidebar Logo={Logo} />

      {/* Right side: mobile header + content + mobile nav */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar (hidden on desktop) */}
        <MobileHeader user={user} />

        {/* Main content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 px-5 py-6 lg:px-8 lg:py-8 outline-none"
          // Extra bottom padding on mobile so content isn't hidden behind tab bar
          style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom) + 1.5rem)' }}
        >
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar + HubSheet (hidden on desktop via lg:hidden inside component) */}
      <MobileNav />

      {/* Quick capture (floating, all breakpoints) */}
      <QuickCapture />
    </div>
  );
}
