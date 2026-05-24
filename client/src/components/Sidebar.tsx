/**
 * Grouped Collapsible Sidebar — Desktop Navigation
 * Propel Stack AI, LLC
 *
 * Dark sidebar (#0F0D1A) with 7 collapsible groups, pinned top/bottom items,
 * and auto-expansion of the group containing the active route.
 */
import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Sparkles, Activity, Target, Smile, Clock, Calendar, BarChart2,
  Heart, Moon, Zap, BookOpen,
  DollarSign, TrendingUp, Scissors,
  Users, UtensilsCrossed, Home, PawPrint,
  Briefcase, GraduationCap, Building2, Network,
  Share2, HeartHandshake, CircleDot, Plane,
  MessageCircle, FileText, Shield, Plug, Lock,
  Settings, Bell, ChevronDown, type LucideIcon,
} from 'lucide-react';
import { useUnreadCount } from '../features/notifications/api';

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'my-life',
    label: 'MY LIFE',
    items: [
      { href: '/financial-score', label: 'Life Score',        icon: Activity    },
      { href: '/streaks',         label: 'Goals & Streaks',   icon: Target      },
      { href: '/awareness',       label: 'Mood & Mindfulness',icon: Smile       },
      { href: '/timeline',        label: 'Life Timeline',     icon: Clock       },
      { href: '/life-events',     label: 'Life Events',       icon: Calendar    },
      { href: '/recap',           label: 'Weekly Recap',      icon: BarChart2   },
    ],
  },
  {
    id: 'health',
    label: 'HEALTH',
    items: [
      { href: '/health',   label: 'Health Hub',   icon: Heart    },
      { href: '/sleep',    label: 'Sleep Coach',  icon: Moon     },
      { href: '/athlete',  label: 'Athlete Hub',  icon: Zap      },
      { href: '/student',  label: 'Student Mode', icon: BookOpen },
    ],
  },
  {
    id: 'money',
    label: 'MONEY',
    items: [
      { href: '/financial',        label: 'Financial Hub',    icon: DollarSign  },
      { href: '/personal-finance', label: 'Personal Finance', icon: TrendingUp  },
      { href: '/bills',            label: 'Bill Negotiation', icon: Scissors    },
    ],
  },
  {
    id: 'home-family',
    label: 'HOME & FAMILY',
    items: [
      { href: '/family',         label: 'Family Hub',       icon: Users            },
      { href: '/kitchen',        label: 'Kitchen & Pantry', icon: UtensilsCrossed  },
      { href: '/home-property',  label: 'Home & Property',  icon: Home             },
      { href: '/pets',           label: 'Pet Hub',          icon: PawPrint         },
    ],
  },
  {
    id: 'work-growth',
    label: 'WORK & GROWTH',
    items: [
      { href: '/career',   label: 'Career Hub',   icon: Briefcase    },
      { href: '/learning', label: 'Learning Hub', icon: GraduationCap},
      { href: '/business', label: 'Business Hub', icon: Building2    },
      { href: '/network',  label: 'Network Hub',  icon: Network      },
    ],
  },
  {
    id: 'connect',
    label: 'CONNECT',
    items: [
      { href: '/social',         label: 'Social & Media',       icon: Share2        },
      { href: '/relationships',  label: 'Relationships',        icon: HeartHandshake},
      { href: '/circles',        label: 'Accountability Circles', icon: CircleDot   },
      { href: '/travel',         label: 'Travel Hub',           icon: Plane         },
    ],
  },
  {
    id: 'platform',
    label: 'PLATFORM',
    items: [
      { href: '/coach',            label: 'AI Life Coach',    icon: MessageCircle },
      { href: '/documents',        label: 'Document Vault',   icon: FileText      },
      { href: '/estate',           label: 'Estate & Legacy',  icon: Shield        },
      { href: '/apps',             label: 'Connected Apps',   icon: Plug          },
      { href: '/settings/privacy', label: 'Privacy & Security', icon: Lock        },
    ],
  },
];

// ─── Active-path helpers ──────────────────────────────────────────────────────

function isItemActive(href: string, location: string): boolean {
  if (href === '/') return location === '/' || location === '/dashboard';
  return location === href || location.startsWith(href + '/');
}

function activeGroupId(location: string): string | null {
  for (const group of NAV_GROUPS) {
    if (group.items.some(item => isItemActive(item.href, location))) return group.id;
  }
  return null;
}

// ─── NavItem row ─────────────────────────────────────────────────────────────

function SidebarItem({ item, location }: { item: NavItem; location: string }) {
  const active = isItemActive(item.href, location);
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <span
        className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-colors group cursor-pointer"
        style={{
          color: active ? '#fff' : '#9F9A94',
          background: active ? 'rgba(79,53,194,0.18)' : 'transparent',
          borderLeft: active ? '2px solid #4F35C2' : '2px solid transparent',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Icon size={14} strokeWidth={active ? 2.2 : 1.8} style={{ color: active ? '#4F35C2' : '#6B6661', flexShrink: 0 }} />
        <span className="truncate">{item.label}</span>
      </span>
    </Link>
  );
}

// ─── Collapsible group ────────────────────────────────────────────────────────

function NavGroup({ group, isOpen, onToggle, location }: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  location: string;
}) {
  const hasActive = group.items.some(item => isItemActive(item.href, location));
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-[5px] mt-1 rounded-lg transition-colors"
        style={{ color: hasActive ? '#B8B3AC' : '#7A7974' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {group.label}
        </span>
        <ChevronDown
          size={12}
          style={{
            color: '#6B6661',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      <div
        style={{
          overflow: 'hidden',
          maxHeight: isOpen ? `${group.items.length * 36}px` : '0px',
          transition: 'max-height 0.22s ease',
        }}
      >
        <div className="mt-0.5 space-y-0.5 pl-1">
          {group.items.map(item => (
            <SidebarItem key={item.href} item={item} location={location} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pinned item ──────────────────────────────────────────────────────────────

function PinnedItem({ href, label, icon: Icon, active, badge }: {
  href: string; label: string; icon: LucideIcon; active: boolean; badge?: ReactNode;
}) {
  return (
    <Link href={href}>
      <span
        className="flex items-center gap-2.5 px-3 py-[8px] rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
        style={{
          color: active ? '#fff' : '#9F9A94',
          background: active ? 'rgba(79,53,194,0.18)' : 'transparent',
          borderLeft: active ? '2px solid #4F35C2' : '2px solid transparent',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Icon size={15} strokeWidth={active ? 2.2 : 1.8} style={{ color: active ? '#4F35C2' : '#6B6661', flexShrink: 0 }} />
        <span className="truncate flex-1">{label}</span>
        {badge}
      </span>
    </Link>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

interface SidebarProps {
  Logo: React.ComponentType;
}

export function Sidebar({ Logo }: SidebarProps) {
  const [location] = useLocation();
  const { data: unreadData } = useUnreadCount();
  const unread = unreadData?.count ?? 0;

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = activeGroupId(location);
    return active ? new Set([active]) : new Set();
  });

  // Auto-expand active group when route changes
  useEffect(() => {
    const active = activeGroupId(location);
    if (active) {
      setOpenGroups(prev => {
        if (prev.has(active)) return prev;
        const next = new Set(prev);
        next.add(active);
        return next;
      });
    }
  }, [location]);

  function toggleGroup(id: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const dashActive = location === '/' || location === '/dashboard';
  const aiActive   = location === '/assistant';

  return (
    <nav
      className="hidden lg:flex flex-col h-screen sticky top-0 overflow-hidden shrink-0"
      style={{ width: 220, background: '#0F0D1A', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      aria-label="Primary navigation"
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Logo />
        <div className="leading-tight">
          <div className="font-display font-extrabold text-[16px] text-white">Propel Stack AI</div>
          <div className="text-[10px] tracking-widest uppercase font-semibold" style={{ color: '#5B5651' }}>Life OS</div>
        </div>
      </div>

      {/* Scrollable nav body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5" style={{ scrollbarWidth: 'none' }}>
        {/* Pinned top */}
        <PinnedItem href="/"          label="Dashboard"    icon={LayoutDashboard} active={dashActive} />
        <PinnedItem href="/assistant" label="AI Assistant" icon={Sparkles}        active={aiActive}   />

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 4px' }} />

        {/* Collapsible groups */}
        {NAV_GROUPS.map(group => (
          <NavGroup
            key={group.id}
            group={group}
            isOpen={openGroups.has(group.id)}
            onToggle={() => toggleGroup(group.id)}
            location={location}
          />
        ))}
      </div>

      {/* Pinned bottom */}
      <div className="shrink-0 px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <PinnedItem
          href="/profiles"
          label="Settings"
          icon={Settings}
          active={location === '/profiles'}
        />
        <PinnedItem
          href="/inbox"
          label="Notifications"
          icon={Bell}
          active={location === '/inbox'}
          badge={
            unread > 0 ? (
              <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-brand-coral text-white text-[10px] font-bold grid place-items-center">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Emergency button */}
      <div className="shrink-0 px-3 pb-4 pt-2">
        <Link href="/emergency">
          <span
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer"
            style={{ background: '#dc2626' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b91c1c'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#dc2626'; }}
          >
            Emergency
          </span>
        </Link>
      </div>
    </nav>
  );
}
