// ─── Theme Provider — Enhancement 27 (Dark Mode) ─────────────────────────────
// Propel Stack AI, LLC
//
// Manages light/dark/system theme. Preference persisted server-side.
// Applies 'dark' class to <html> element for Tailwind dark: variants.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from './apiRequest';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  isDark: false,
});

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>(getSystemTheme());

  // Load theme from server on mount
  useEffect(() => {
    apiRequest<{ theme: ThemeMode }>('/api/settings/theme')
      .then((data) => {
        const t = data.theme ?? 'system';
        const r = resolveTheme(t);
        setThemeState(t);
        setResolved(r);
        applyTheme(r);
      })
      .catch(() => {
        // Fall back to system theme
        const r = getSystemTheme();
        setResolved(r);
        applyTheme(r);
      });
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const r = getSystemTheme();
      setResolved(r);
      applyTheme(r);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (t: ThemeMode) => {
    const r = resolveTheme(t);
    setThemeState(t);
    setResolved(r);
    applyTheme(r);
    // Persist to server
    apiRequest('/api/settings/theme', { method: 'POST', body: { theme: t } }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme, isDark: resolved === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
