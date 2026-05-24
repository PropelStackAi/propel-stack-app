/**
 * Mobile Navigation — Bottom Tab Bar + HubSheet overlay
 * Propel Stack AI, LLC
 *
 * Shows on screens < 768px (lg breakpoint). 5-tab bar + full-screen
 * HubSheet with 3-column icon grid and real-time search.
 */
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Activity, Sparkles, Grid3X3, User,
  X, Search, Bell, type LucideIcon,
} from 'lucide-react';
import { NAV_GROUPS } from './Sidebar';
import { useUnreadCount } from '../features/notifications/api';

// ─── HubSheet ────────────────────────────────────────────────────────────────

function HubSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [, navigate] = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on open, reset on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 300);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function handleNavigate(href: string) {
    navigate(href);
    onClose();
  }

  const q = query.toLowerCase();
  const filtered = NAV_GROUPS.map(group => ({
    ...group,
    items: q ? group.items.filter(item => item.label.toLowerCase().includes(q)) : group.items,
  })).filter(g => g.items.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet panel */}
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl flex flex-col"
        style={{
          maxHeight: '90dvh',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="All Hubs"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-surface-ink/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 className="font-display font-bold text-surface-ink text-lg">All Hubs</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-sunk flex items-center justify-center text-surface-muted hover:text-surface-ink transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted pointer-events-none" />
            <input
              ref={searchRef}
              className="input pl-9 w-full text-sm"
              placeholder="Search hubs…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-muted"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable hub grid */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-6">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-surface-muted text-sm">
              No hubs match "{query}"
            </div>
          ) : (
            filtered.map(group => (
              <section key={group.id}>
                <h3
                  className="mb-3 px-1"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A7974' }}
                >
                  {group.label}
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavigate(item.href)}
                        className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-surface-sunk hover:bg-brand-indigo/5 active:scale-95 transition-all"
                      >
                        <Icon size={22} strokeWidth={1.8} className="text-brand-indigo" />
                        <span className="text-[11px] text-surface-ink font-medium text-center leading-tight">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

interface Tab {
  id: string;
  label: string;
  href: string | null;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'home',  label: 'Home',   href: '/',               icon: LayoutDashboard },
  { id: 'life',  label: 'Life',   href: '/financial-score', icon: Activity        },
  { id: 'ai',    label: 'AI',     href: '/assistant',       icon: Sparkles        },
  { id: 'hubs',  label: 'Hubs',   href: null,               icon: Grid3X3         },
  { id: 'me',    label: 'Me',     href: '/profiles',        icon: User            },
];

export function MobileNav() {
  const [location] = useLocation();
  const [hubOpen, setHubOpen] = useState(false);
  const { data: unreadData } = useUnreadCount();
  const unread = unreadData?.count ?? 0;

  function isActive(href: string | null): boolean {
    if (!href) return false;
    if (href === '/') return location === '/' || location === '/dashboard';
    return location === href || location.startsWith(href + '/');
  }

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-raised/95 backdrop-blur"
        style={{
          borderTop: '1px solid rgba(0,0,0,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch h-16">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.href);

            if (tab.id === 'hubs') {
              return (
                <button
                  key="hubs"
                  onClick={() => setHubOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors"
                  aria-label="Open hub browser"
                >
                  <Grid3X3 size={22} strokeWidth={1.8} className="text-surface-muted" />
                  <span className="text-[10px] font-semibold text-surface-muted">Hubs</span>
                </button>
              );
            }

            // Notifications badge on Me tab
            const showBadge = tab.id === 'me' && unread > 0;

            return (
              <Link key={tab.id} href={tab.href!} className="flex-1">
                <span className="flex flex-col items-center justify-center gap-1 py-2 h-full relative cursor-pointer">
                  <span className="relative">
                    {tab.id === 'me' && unread > 0 ? (
                      <Bell size={22} strokeWidth={active ? 2.2 : 1.8} className={active ? 'text-brand-indigo' : 'text-surface-muted'} />
                    ) : (
                      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} className={active ? 'text-brand-indigo' : 'text-surface-muted'} />
                    )}
                    {showBadge && (
                      <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-brand-coral text-white text-[8px] font-bold grid place-items-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${active ? 'text-brand-indigo' : 'text-surface-muted'}`}
                  >
                    {tab.label}
                  </span>
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-brand-indigo"
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <HubSheet isOpen={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
}
