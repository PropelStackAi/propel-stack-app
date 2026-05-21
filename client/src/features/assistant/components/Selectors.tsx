import { MODE_OPTIONS, MODEL_OPTIONS, type Mode, type Model } from '../types';

const selectCls = 'rounded-lg border border-surface-ink/10 bg-surface-raised px-2.5 py-1.5 text-sm focus:outline-none';

export function Selectors({
  model,
  mode,
  onModel,
  onMode,
}: {
  model: Model;
  mode: Mode;
  onModel: (m: Model) => void;
  onMode: (m: Mode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={selectCls} value={model} onChange={(e) => onModel(e.target.value as Model)} aria-label="Model">
        {MODEL_OPTIONS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} · {m.hint}
          </option>
        ))}
      </select>
      <select className={selectCls} value={mode} onChange={(e) => onMode(e.target.value as Mode)} aria-label="Mode">
        {MODE_OPTIONS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      {mode === 'finance' && (
        <span className="chip text-surface-muted">Finance mode adds a disclaimer to answers</span>
      )}
    </div>
  );
}
