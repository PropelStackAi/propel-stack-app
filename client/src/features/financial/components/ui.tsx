import { type ReactNode } from 'react';

export const inputCls =
  'w-full rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none';
export const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-surface-muted mb-1';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-display font-bold text-lg text-surface-ink">{title}</h2>
      {hint && <p className="text-sm text-surface-muted">{hint}</p>}
    </div>
  );
}

export function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Delete"
      className="shrink-0 text-xs text-surface-muted hover:text-red-600"
    >
      Delete
    </button>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-surface-muted py-4 text-center">{children}</p>;
}
