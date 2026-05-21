import { useBrief } from '../api';

export function MorningBrief() {
  const { data, isLoading, isFetching, refetch } = useBrief();

  return (
    <div className="card bg-gradient-to-br from-brand-indigo/[0.06] to-transparent">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display font-bold text-base text-surface-ink">Morning brief</h2>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-secondary !py-1.5 !text-xs disabled:opacity-60">
          {isFetching ? 'Refreshing…' : 'Refresh brief'}
        </button>
      </div>
      {isLoading ? (
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-3 rounded bg-surface-sunk w-full" />
          <div className="h-3 rounded bg-surface-sunk w-5/6" />
          <div className="h-3 rounded bg-surface-sunk w-2/3" />
        </div>
      ) : (
        <p className="mt-2 text-sm text-surface-ink leading-relaxed">{data?.brief}</p>
      )}
      {data?.stub && <p className="mt-2 text-[11px] text-surface-muted">Demo brief — connect an AI provider key for a live summary.</p>}
    </div>
  );
}
