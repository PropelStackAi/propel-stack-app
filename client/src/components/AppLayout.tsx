import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { QuickCapture } from '../features/dashboard/components/QuickCapture';

interface NavItem {
  href: string;
  label: string;
  short: string;
  accent: 'indigo' | 'coral' | 'teal' | 'purple';
}

const NAV: NavItem[] = [
  { href: '/',             label: 'Dashboard',       short: 'Home',     accent: 'indigo' },
  { href: '/contacts',     label: 'Contacts',        short: 'CRM',      accent: 'indigo' },
  { href: '/assistant',    label: 'AI Assistant',    short: 'AI',       accent: 'coral'  },
  { href: '/financial',    label: 'Financial Hub',   short: 'Money',    accent: 'indigo' },
  { href: '/documents',    label: 'Document Vault',  short: 'Vault',    accent: 'indigo' },
  { href: '/health',       label: 'Health Hub',      short: 'Health',   accent: 'coral'  },
  { href: '/athlete',      label: 'Athlete Hub',     short: 'Athlete',  accent: 'teal'   },
  { href: '/special-needs',label: 'Family Support',  short: 'SNFS',     accent: 'purple' },
  { href: '/parental',     label: 'Parental',        short: 'Parental', accent: 'purple' },
  { href: '/kids',         label: 'Kids Zone',       short: 'Kids',     accent: 'teal'   },
];

interface User {
  id: string;
  email: string;
  display_name: string;
  plan_tier: string;
  ai_tokens_used_this_month: number;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<User>('/api/me'),
  });

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header user={user} />
      <div className="flex-1 flex">
        <Sidebar currentPath={location} />
        <main className="flex-1 min-w-0 px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <EmergencyButton />
      <QuickCapture />
    </div>
  );
}

function Header({ user }: { user?: User }) {
  return (
    <header className="sticky top-0 z-30 border-b border-surface-ink/[0.06] bg-surface-raised/80 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-3 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Propel Stack AI home">
          <Logo />
          <div className="leading-tight">
            <div className="font-display font-extrabold text-[17px] text-surface-ink">
              Propel Stack AI
            </div>
            <div className="text-[11px] text-surface-muted tracking-wide uppercase font-semibold">
              Life OS
            </div>
          </div>
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline chip text-surface-muted">
              <span className="capitalize">{user.plan_tier}</span> plan
            </span>
            <div
              className="w-9 h-9 rounded-full bg-brand-indigo text-white grid place-items-center font-semibold text-sm"
              aria-label={`Signed in as ${user.display_name}`}
            >
              {user.display_name.slice(0, 1).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <nav
      className="hidden lg:block w-60 shrink-0 border-r border-surface-ink/[0.06] bg-surface-raised/40 px-3 py-6"
      aria-label="Primary"
    >
      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const active =
            item.href === '/' ? currentPath === '/' : currentPath.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-brand-indigo/10 text-brand-indigo font-semibold'
                    : 'text-surface-ink/80 hover:bg-surface-sunk font-medium',
                ].join(' ')}
              >
                <AccentDot accent={item.accent} active={active} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-8 px-3 text-[10px] uppercase tracking-wider text-surface-muted font-semibold">
        Build status
      </div>
      <div className="mt-2 px-3 text-xs text-surface-muted leading-relaxed">
        Scaffold ready. Feature modules ship session by session.
      </div>
    </nav>
  );
}

function AccentDot({
  accent,
  active,
}: {
  accent: 'indigo' | 'coral' | 'teal' | 'purple';
  active: boolean;
}) {
  const colorClass = {
    indigo: 'bg-brand-indigo',
    coral:  'bg-brand-coral',
    teal:   'bg-brand-teal',
    purple: 'bg-brand-purple',
  }[accent];
  return (
    <span
      aria-hidden
      className={`inline-block w-1.5 h-1.5 rounded-full ${colorClass} ${active ? 'opacity-100' : 'opacity-50'}`}
    />
  );
}

function Logo() {
  // Geometric mark in the four brand colors
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2"  y="2"  width="13" height="13" rx="3.5" fill="#4F35C2" />
      <rect x="17" y="2"  width="13" height="13" rx="3.5" fill="#F05A28" />
      <rect x="2"  y="17" width="13" height="13" rx="3.5" fill="#01696F" />
      <rect x="17" y="17" width="13" height="13" rx="3.5" fill="#6B21A8" />
    </svg>
  );
}

function EmergencyButton() {
  // Persistent emergency entry point. Full implementation lands in Session 10.
  return (
    <Link
      href="/emergency"
      className="fixed bottom-5 left-5 z-40 rounded-full bg-red-600 text-white px-4 py-2.5 text-sm font-semibold shadow-raised hover:bg-red-700 transition-colors"
      aria-label="Open Emergency Mode"
    >
      Emergency
    </Link>
  );
}
