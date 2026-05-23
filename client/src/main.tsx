import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { queryClient } from './lib/queryClient';
import { hideSplash, initStatusBar } from './lib/native';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

// ── Native shell init ────────────────────────────────────────────────────────
// Both calls are no-ops on the web platform.
void initStatusBar(); // Set brand indigo status bar on iOS/Android
void hideSplash();    // Fade out the splash screen after first render

// ── PWA service worker ───────────────────────────────────────────────────────
// Register in production only — avoids caching the Vite dev server.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* registration is best-effort */
    });
  });
}
