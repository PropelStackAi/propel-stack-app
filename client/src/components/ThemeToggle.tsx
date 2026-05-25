// ─── Theme Toggle — Enhancement 27 (Dark Mode) ───────────────────────────────
// Propel Stack AI, LLC

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type ThemeMode } from '../lib/theme';

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme, isDark } = useTheme();

  if (compact) {
    // Simple toggle: light ↔ dark
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-surface-sunk dark:hover:bg-white/10"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark
          ? <Sun size={15} className="text-amber-400" />
          : <Moon size={15} className="text-surface-muted" />
        }
      </button>
    );
  }

  const OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light',  label: 'Light',  icon: <Sun  size={13} /> },
    { value: 'system', label: 'System', icon: <Monitor size={13} /> },
    { value: 'dark',   label: 'Dark',   icon: <Moon size={13} /> },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-surface-ink/10 dark:border-white/10 bg-surface-sunk dark:bg-white/5 p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          className={[
            'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all',
            theme === opt.value
              ? 'bg-surface-raised dark:bg-white/15 text-surface-ink dark:text-white shadow-sm'
              : 'text-surface-muted dark:text-white/50 hover:text-surface-ink dark:hover:text-white/80',
          ].join(' ')}
          aria-pressed={theme === opt.value}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
