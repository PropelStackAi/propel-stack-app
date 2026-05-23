/**
 * Caregiver Support Corner — Session 12.
 * Resources for caregiver wellness, burnout prevention, and self-care.
 * Caregivers of individuals with special needs face disproportionate rates of
 * burnout, depression, and health decline. This section provides evidence-based
 * self-care strategies and respite resources.
 */
export function CaregiverSupport(): JSX.Element {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-pink-50 border border-pink-200 px-4 py-3 text-xs text-pink-800">
        <strong>Caregiver Support Corner:</strong> You cannot pour from an empty cup. Taking care of yourself is not selfish — it is essential for your family.
        If you are experiencing significant burnout, depression, or anxiety, please speak with a licensed therapist or your own physician.
      </div>

      {/* Recognition */}
      <div className="rounded-xl bg-purple-50 border border-purple-100 p-5">
        <h3 className="font-display font-bold text-base text-brand-purple mb-2">💜 You are doing important, hard work</h3>
        <p className="text-sm text-surface-ink leading-relaxed">
          Caring for a family member with special needs is one of the most demanding roles a person can take on. Research consistently shows that caregivers of individuals with disabilities experience significantly higher rates of stress, depression, anxiety, and health challenges than the general population.
          Your wellbeing matters — for you, and for the person you support.
        </p>
      </div>

      {/* Warning signs */}
      <Section label="⚠️ Warning signs of caregiver burnout">
        <p className="text-xs text-surface-ink mb-2 leading-relaxed">
          Burnout is a state of physical, emotional, and mental exhaustion. Recognizing it early makes recovery more possible.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Constant exhaustion even after sleep',
            'Feeling hopeless or trapped',
            'Withdrawing from friends and activities',
            'Irritability or anger toward your care recipient',
            'Neglecting your own health needs',
            'Feeling resentful or guilty at the same time',
            'Difficulty finding meaning or joy',
            'Physical symptoms (headaches, illness, pain)',
          ].map((sign, i) => (
            <div key={i} className="flex gap-2 items-start text-xs text-surface-ink bg-amber-50 rounded-lg px-3 py-1.5">
              <span className="text-amber-500 flex-shrink-0">●</span>
              {sign}
            </div>
          ))}
        </div>
        <p className="text-xs text-pink-700 font-semibold mt-2">
          If you are experiencing several of these signs persistently, please speak with your own physician or a licensed therapist.
        </p>
      </Section>

      {/* Self-care strategies */}
      <Section label="✅ Evidence-informed caregiver self-care">
        <div className="space-y-3">
          {[
            { emoji: '🛌', title: 'Prioritize sleep', description: 'Sleep deprivation compounds all caregiving challenges. Establish a routine to protect at least 7 hours. If night caregiving disrupts sleep, consider respite support.' },
            { emoji: '🚶', title: 'Move your body', description: 'Even 20 minutes of walking significantly reduces cortisol (stress hormone). Physical activity is one of the most evidence-based interventions for caregiver stress.' },
            { emoji: '🤝', title: 'Connect with other caregivers', description: 'Caregiver support groups — in person or online — reduce isolation and provide practical tips from people who truly understand. NAMI, The Arc, and condition-specific organizations have support groups.' },
            { emoji: '🧘', title: 'Practice mindfulness', description: 'Structured mindfulness programs (MBSR) have strong evidence for reducing caregiver stress. Apps like Headspace, Calm, or free resources like UCLA Mindful can help.' },
            { emoji: '📋', title: 'Ask for help — specifically', description: 'Vague requests often go unfulfilled. Try: "Can you take the kids on Saturday from 10am-2pm?" Specific asks are more likely to be honored.' },
            { emoji: '⚖️', title: 'Know your legal rights as a caregiver', description: 'FMLA (Family and Medical Leave Act), employer workplace accommodations, and state disability leave laws may provide protections. Consult an employment attorney or HR if needed.' },
            { emoji: '🏖️', title: 'Use respite services', description: 'Respite gives caregivers a break. It is not abandonment — it is essential. ARCH National Respite Network (archrespite.org) can help locate services in your area.' },
            { emoji: '👩‍⚕️', title: 'See your own doctor', description: 'Caregivers frequently neglect their own medical care. Schedule regular check-ups. Your health is not secondary.' },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 rounded-xl bg-surface-sunk/30 px-4 py-3">
              <span className="text-2xl flex-shrink-0">{item.emoji}</span>
              <div>
                <div className="font-semibold text-sm text-surface-ink">{item.title}</div>
                <p className="text-xs text-surface-muted leading-relaxed mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Respite resources */}
      <Section label="🏡 Respite & caregiver support resources">
        <div className="space-y-2">
          {[
            { name: 'ARCH National Respite Network', description: 'Find respite services in your area', url: 'https://archrespite.org', phone: undefined },
            { name: 'NAMI Family Support Group', description: 'Free peer-led groups for family members of people with mental illness', url: 'https://nami.org/Support-Education/Support-Groups', phone: '1-800-950-6264' },
            { name: 'Family Caregiver Alliance', description: 'National center on caregiving — fact sheets, legal resources, support', url: 'https://caregiver.org', phone: '1-800-445-8106' },
            { name: 'Caregiver Action Network', description: 'Resources, peer support, and advocacy for family caregivers', url: 'https://caregiveraction.org', phone: undefined },
            { name: 'Easter Seals', description: 'Respite programs and disability services in many communities', url: 'https://easterseals.com', phone: undefined },
          ].map((res) => (
            <a
              key={res.name}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl border border-surface-ink/[0.06] bg-surface-raised p-3 hover:bg-pink-50 transition-colors"
            >
              <span className="text-pink-500 text-lg flex-shrink-0">→</span>
              <div>
                <div className="font-semibold text-sm text-surface-ink">{res.name}</div>
                <div className="text-xs text-surface-muted">{res.description}</div>
                {res.phone && <div className="text-xs text-brand-indigo font-medium mt-0.5">📞 {res.phone}</div>}
              </div>
            </a>
          ))}
        </div>
      </Section>

      <p className="text-[10px] text-surface-muted">
        This content is general information only. If you are in crisis, call 988. If you are experiencing severe burnout or depression, please speak with a licensed healthcare professional.
      </p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-surface-ink">{label}</h3>
      {children}
    </div>
  );
}
