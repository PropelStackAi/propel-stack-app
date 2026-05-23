import { BODY_AREAS } from '../types';
import type { BodyAreaId } from '../types';

interface Props {
  selected: string[];
  onChange: (areas: string[]) => void;
}

export function SorenessBodyMap({ selected, onChange }: Props): JSX.Element {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  const frontAreas = BODY_AREAS.filter((a) => a.side === 'front');
  const backAreas = BODY_AREAS.filter((a) => a.side === 'back');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <BodySide label="Front" areas={frontAreas} selected={selected} toggle={toggle} />
        <BodySide label="Back" areas={backAreas} selected={selected} toggle={toggle} />
      </div>
      {selected.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-700 font-semibold">
            {'Sore areas: '}
            {selected.map((id) => {
              const area = BODY_AREAS.find((a) => a.id === id);
              return area?.label ?? id;
            }).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

function BodySide({ label, areas, selected, toggle }: {
  label: string;
  areas: readonly { id: BodyAreaId; label: string; side: string }[];
  selected: string[];
  toggle: (id: string) => void;
}): JSX.Element {
  return (
    <div>
      <div className="text-xs font-semibold text-surface-muted uppercase tracking-wider mb-2 text-center">{label}</div>
      <BodySVG side={label.toLowerCase() as 'front' | 'back'} />
      <div className="mt-2 flex flex-wrap gap-1">
        {areas.map((area) => {
          const isSelected = selected.includes(area.id);
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => toggle(area.id)}
              className={[
                'px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border',
                isSelected
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-surface-sunk border-surface-ink/10 text-surface-muted hover:border-red-300',
              ].join(' ')}
            >
              {area.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BodySVG({ side }: { side: 'front' | 'back' }): JSX.Element {
  return (
    <svg viewBox="0 0 80 165" className="w-full max-w-[110px] mx-auto" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <ellipse cx="40" cy="14" rx="11" ry="12" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Neck */}
      <rect x="36" y="25" width="8" height="7" rx="2" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Torso */}
      <rect x="23" y="31" width="34" height="44" rx="5" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Left arm */}
      <rect x="9" y="32" width="13" height="38" rx="5" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Right arm */}
      <rect x="58" y="32" width="13" height="38" rx="5" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Left hand */}
      <ellipse cx="15" cy="73" rx="6" ry="4" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Right hand */}
      <ellipse cx="65" cy="73" rx="6" ry="4" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Left leg */}
      <rect x="23" y="74" width="14" height="56" rx="5" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Right leg */}
      <rect x="43" y="74" width="14" height="56" rx="5" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Left foot */}
      <ellipse cx="30" cy="133" rx="8" ry="4" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Right foot */}
      <ellipse cx="50" cy="133" rx="8" ry="4" fill="#e8e0f7" stroke="#a78bfa" strokeWidth="1.2" />
      {/* Label */}
      <text x="40" y="150" textAnchor="middle" fontSize="7" fill="#7c3aed" fontFamily="sans-serif">
        {side === 'front' ? 'FRONT' : 'BACK'}
      </text>
    </svg>
  );
}
