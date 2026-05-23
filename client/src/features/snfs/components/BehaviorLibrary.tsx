import { useState } from 'react';
import { BEHAVIOR_STRATEGIES, type BehaviorStrategy } from '../types';

const CATEGORIES = [...new Set(BEHAVIOR_STRATEGIES.map((s) => s.category))];

const EVIDENCE_COLORS: Record<BehaviorStrategy['evidenceLevel'], string> = {
  Strong: 'bg-green-100 text-green-700 border-green-200',
  Moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  Emerging: 'bg-blue-100 text-blue-700 border-blue-200',
};

export function BehaviorLibrary(): JSX.Element {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = activeCategory
    ? BEHAVIOR_STRATEGIES.filter((s) => s.category === activeCategory)
    : BEHAVIOR_STRATEGIES;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
        <strong>Behavior Strategy Library:</strong> Evidence-based approaches drawn from ABA, PBIS, CBT, and OT literature.
        Implementation should be guided by qualified professionals (BCBA, behavior specialist, OT, therapist).
        <strong> These strategies are NOT a substitute for professional behavioral assessment.</strong>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory(null)}
          className={[
            'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            !activeCategory ? 'bg-brand-coral text-white border-brand-coral' : 'bg-surface-raised border-surface-ink/10 text-surface-muted hover:text-surface-ink',
          ].join(' ')}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              activeCategory === cat ? 'bg-brand-coral text-white border-brand-coral' : 'bg-surface-raised border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Strategy cards */}
      <div className="space-y-3">
        {filtered.map((strategy) => (
          <StrategyCard
            key={strategy.name}
            strategy={strategy}
            isExpanded={expanded === strategy.name}
            onToggle={() => setExpanded(expanded === strategy.name ? null : strategy.name)}
          />
        ))}
      </div>
    </div>
  );
}

function StrategyCard({ strategy, isExpanded, onToggle }: {
  strategy: BehaviorStrategy; isExpanded: boolean; onToggle: () => void;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-surface-ink/[0.08] bg-surface-raised overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-start justify-between px-4 py-3 text-left hover:bg-amber-50/40 transition-colors">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-surface-ink">{strategy.name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${EVIDENCE_COLORS[strategy.evidenceLevel]}`}>
              {strategy.evidenceLevel} evidence
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-surface-muted">
            <span>📂 {strategy.category}</span>
            <span>👶 {strategy.ageRange}</span>
          </div>
          {!isExpanded && <p className="text-xs text-surface-muted mt-1 line-clamp-1">{strategy.overview}</p>}
        </div>
        <span className="text-surface-muted ml-4 flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-ink/[0.06]">
          <p className="text-xs text-surface-ink leading-relaxed pt-3">{strategy.overview}</p>

          <div>
            <div className="text-[10px] font-semibold text-surface-muted uppercase tracking-wider mb-1.5">✅ How to implement</div>
            <ol className="space-y-1">
              {strategy.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-surface-ink">
                  <span className="text-amber-600 font-bold flex-shrink-0 min-w-[18px]">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-surface-muted uppercase tracking-wider mb-1.5">💡 Best for</div>
            <div className="flex flex-wrap gap-1">
              {strategy.bestFor.map((b) => (
                <span key={b} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">{b}</span>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-0.5">⚠️ Important note</div>
            <p className="text-xs text-red-700">{strategy.cautions}</p>
          </div>
        </div>
      )}
    </div>
  );
}
