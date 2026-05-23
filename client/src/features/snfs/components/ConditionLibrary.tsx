import { useState } from 'react';
import { CONDITION_CATEGORIES, type ConditionCard } from '../types';

export function ConditionLibrary(): JSX.Element {
  const [activeCategory, setActiveCategory] = useState<string>(CONDITION_CATEGORIES[0].id);
  const [expandedCondition, setExpandedCondition] = useState<string | null>(null);

  const category = CONDITION_CATEGORIES.find((c) => c.id === activeCategory)!;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 text-xs text-purple-800">
        <strong>Condition Library:</strong> General information sourced from DSM-5, CDC, AAP, NAMI, and leading advocacy organizations.{' '}
        <strong>Not a diagnostic tool.</strong> Always consult a licensed professional for diagnosis.
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CONDITION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setExpandedCondition(null); }}
            className={[
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              activeCategory === cat.id
                ? 'bg-brand-purple text-white border-brand-purple'
                : 'bg-surface-raised border-surface-ink/10 text-surface-ink hover:bg-purple-50 hover:border-purple-300',
            ].join(' ')}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Category description */}
      <div>
        <h3 className="font-display font-bold text-lg text-surface-ink">
          {category.emoji} {category.label}
        </h3>
        <p className="text-sm text-surface-muted">{category.description}</p>
      </div>

      {/* Condition cards */}
      <div className="space-y-3">
        {category.conditions.map((cond) => (
          <ConditionCardView
            key={cond.name}
            cond={cond}
            expanded={expandedCondition === cond.name}
            onToggle={() => setExpandedCondition(expandedCondition === cond.name ? null : cond.name)}
          />
        ))}
      </div>
    </div>
  );
}

function ConditionCardView({ cond, expanded, onToggle }: {
  cond: ConditionCard; expanded: boolean; onToggle: () => void;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-surface-ink/[0.08] bg-surface-raised overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-purple-50/50 transition-colors"
      >
        <div>
          <div className="font-semibold text-sm text-surface-ink">{cond.name}</div>
          {!expanded && <div className="text-xs text-surface-muted mt-0.5 line-clamp-1">{cond.overview}</div>}
        </div>
        <span className="text-surface-muted text-sm ml-4 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-surface-ink/[0.06]">
          {/* Overview */}
          <div className="pt-3">
            <p className="text-sm text-surface-ink leading-relaxed">{cond.overview}</p>
          </div>

          {/* Common signs */}
          <Section label="📋 Common signs / presentations">
            <ul className="space-y-1">
              {cond.commonSigns.map((s) => (
                <li key={s} className="flex gap-2 text-xs text-surface-ink">
                  <span className="text-purple-400 flex-shrink-0 mt-0.5">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </Section>

          {/* Evidence-based strategies */}
          <Section label="✅ Evidence-based strategies">
            <ul className="space-y-1">
              {cond.strategies.map((s) => (
                <li key={s} className="flex gap-2 text-xs text-surface-ink">
                  <span className="text-green-500 flex-shrink-0 mt-0.5">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </Section>

          {/* Professional referral */}
          <Section label="👩‍⚕️ Professional referral guidance">
            <p className="text-xs text-surface-ink leading-relaxed">{cond.referralGuidance}</p>
          </Section>

          {/* Sources */}
          <div>
            <div className="text-[10px] text-surface-muted font-semibold uppercase tracking-wider mb-1">Sources</div>
            <div className="flex flex-wrap gap-1">
              {cond.sources.map((src) => (
                <span key={src} className="text-[10px] bg-gray-100 text-gray-600 rounded px-2 py-0.5">{src}</span>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-surface-muted italic">
            This information is general only — not a diagnosis or clinical advice. Consult a licensed professional for guidance specific to your situation.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div className="text-xs font-semibold text-surface-muted uppercase tracking-wider mb-1.5">{label}</div>
      {children}
    </div>
  );
}
