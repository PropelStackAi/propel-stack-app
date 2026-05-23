import { IMPORTANT_DOCUMENTS } from '../types';

export function DocumentOrganizer(): JSX.Element {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-700">
        <strong>Document Organizer:</strong> A checklist of important documents to keep organized for your care recipient.
        Use this as a guide — not all documents apply to every situation.
        Store physical documents securely and consider a digital backup.
      </div>

      <p className="text-sm text-surface-ink">
        Families navigating special needs services often deal with many different systems — schools, medical providers, insurance, legal services, and government benefits.
        Keeping the right documents organized saves significant time and stress. The categories below cover the most commonly needed records.
      </p>

      <div className="space-y-4">
        {IMPORTANT_DOCUMENTS.map((section) => (
          <div key={section.category} className="rounded-xl border border-surface-ink/[0.06] bg-surface-raised overflow-hidden">
            <div className="px-4 py-3 bg-surface-sunk/30 border-b border-surface-ink/[0.06]">
              <h3 className="font-semibold text-sm text-surface-ink">{section.category}</h3>
            </div>
            <div className="px-4 py-3">
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <span className="text-indigo-400 flex-shrink-0 mt-0.5 font-bold">□</span>
                    <span className="text-xs text-surface-ink leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">📁 Organization tips</h4>
        <ul className="space-y-1">
          {[
            'Keep a master binder with tabbed sections for each category.',
            'Scan important documents and store in a secure cloud folder.',
            'IEPs — request copies of ALL evaluations, not just the IEP itself.',
            'Medical records — request records every time you change providers.',
            'Benefits — keep copies of every application, approval, and denial letter.',
            'Date and label everything. Note who sent what and when.',
            'Give your care coordinator or trusted family member access to your document system.',
          ].map((tip, i) => (
            <li key={i} className="flex gap-2 text-xs text-blue-800">
              <span className="flex-shrink-0">✓</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
