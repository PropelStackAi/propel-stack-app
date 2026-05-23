import { TRANSITION_CONTENT } from '../types';

export function TransitionHub(): JSX.Element {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-xs text-teal-800">
        <strong>Transition Hub (Ages 14+):</strong> Under IDEA 2004, transition planning must begin in the IEP by age 16 (many states require age 14).{' '}
        Information below is general. Consult a special education attorney, Vocational Rehabilitation counselor, and your IEP team for individualized planning.
      </div>

      <div className="rounded-xl bg-brand-teal/10 border border-brand-teal/20 p-4">
        <h3 className="font-display font-bold text-base text-brand-teal mb-2">What is transition planning?</h3>
        <p className="text-sm text-surface-ink leading-relaxed">{TRANSITION_CONTENT.overview}</p>
      </div>

      {/* Domains */}
      <div>
        <h3 className="font-semibold text-sm text-surface-ink mb-3">Transition planning domains</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRANSITION_CONTENT.domains.map((domain) => (
            <div key={domain.title} className="rounded-xl border border-surface-ink/[0.06] bg-surface-raised p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{domain.emoji}</span>
                <span className="font-semibold text-sm text-surface-ink">{domain.title}</span>
              </div>
              <p className="text-xs text-surface-muted leading-relaxed">{domain.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transition checklist */}
      <div>
        <h3 className="font-semibold text-sm text-surface-ink mb-3">Transition planning checklist</h3>
        <div className="space-y-2">
          {[
            'IEP includes postsecondary goals: education/training, employment, independent living',
            'Transition services are listed in the IEP (activities to meet goals)',
            'Student is invited to and participates in their own IEP meeting',
            'Vocational Rehabilitation (VR) referral made — ideally by age 16',
            'Medicaid HCBS waiver application filed (waitlists can be years)',
            'SSI application submitted at age 18 (disability must be documented)',
            'School records obtained and organized before graduation',
            'Contact disability services office at target college/trade school',
            'Special needs trust planning — consult a special needs attorney',
            'Guardianship vs. supported decision-making evaluated with attorney',
            'Registered to vote with accommodations if applicable',
            'Benefits planning counseling (ABLE account, effect of earnings on SSI)',
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start rounded-xl bg-surface-sunk/30 px-3 py-2">
              <span className="text-teal-500 flex-shrink-0 font-bold">→</span>
              <p className="text-xs text-surface-ink leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key resources */}
      <div>
        <h3 className="font-semibold text-sm text-surface-ink mb-3">Key transition resources</h3>
        <div className="space-y-2">
          {TRANSITION_CONTENT.keyResources.map((res) => (
            <a
              key={res.name}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl border border-surface-ink/[0.06] bg-surface-raised p-3 hover:bg-teal-50 transition-colors"
            >
              <span className="text-teal-500 text-lg flex-shrink-0">→</span>
              <div>
                <div className="font-semibold text-sm text-surface-ink">{res.name}</div>
                <div className="text-xs text-surface-muted">{res.description}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-surface-muted">
        Transition information is general only — not legal, financial, or professional advice. Always consult licensed professionals for individualized planning.
      </p>
    </div>
  );
}
