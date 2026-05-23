/**
 * Persistent crisis resources panel — Session 12.
 *
 * REQUIRED on EVERY screen in the Special Needs Family Support Hub.
 * Shows 911, 988, Crisis Text Line, and NAMI with one-tap links.
 * Compact by default; expands to show full resource list.
 */
export function CrisisPanel(): JSX.Element {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
          🚨 Crisis Resources — Always Available
        </span>
        <div className="flex flex-wrap gap-1.5">
          <CrisisBtn href="tel:911" label="911" sublabel="Emergency" red />
          <CrisisBtn href="tel:988" label="988" sublabel="Crisis Line" />
          <CrisisBtn href="sms:741741?body=HOME" label="Text HOME" sublabel="→ 741741" />
          <CrisisBtn href="tel:18009506264" label="NAMI" sublabel="1-800-950-6264" />
        </div>
      </div>
    </div>
  );
}

function CrisisBtn({ href, label, sublabel, red }: { href: string; label: string; sublabel: string; red?: boolean }): JSX.Element {
  return (
    <a
      href={href}
      className={[
        'inline-flex flex-col items-center px-3 py-1.5 rounded-lg text-center min-w-[60px] transition-colors',
        red
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-white border border-red-200 text-red-700 hover:bg-red-100',
      ].join(' ')}
    >
      <span className="text-xs font-extrabold leading-tight">{label}</span>
      <span className="text-[9px] font-medium leading-tight opacity-80">{sublabel}</span>
    </a>
  );
}
