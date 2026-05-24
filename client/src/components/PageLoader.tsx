import { useEffect, useState } from 'react';

/**
 * Deferred loading indicator — only appears after 200ms to avoid flash on fast loads.
 * Used as the Suspense fallback while lazy page chunks load.
 */
export function PageLoader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-surface, #FAFAF8)',
        zIndex: 9999,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid #4F35C2',
            borderTopColor: '#F05A28',
            animation: 'ps-spin 0.75s linear infinite',
            margin: '0 auto 14px',
          }}
        />
        <p
          style={{
            color: '#7A7974',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.01em',
          }}
        >
          Loading…
        </p>
      </div>
      <style>{`@keyframes ps-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
