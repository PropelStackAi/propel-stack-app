import { type ReactNode, useEffect } from 'react';

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-surface-ink/40 backdrop-blur-sm p-4"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`card my-8 w-full ${maxWidth} p-0 overflow-hidden`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-ink/[0.06] px-6 py-4">
          <div>
            <h2 className="font-display font-bold text-lg text-surface-ink">{title}</h2>
            {subtitle && <p className="text-sm text-surface-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full w-8 h-8 grid place-items-center text-surface-muted hover:bg-surface-sunk transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
