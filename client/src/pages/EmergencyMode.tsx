import { Link } from 'wouter';

/**
 * Emergency Mode lives OUTSIDE the app shell.
 * Full implementation (cached health profile, allergies, meds, contacts, QR code, geolocation)
 * arrives in Session 10. This placeholder confirms the route resolves and the visual identity
 * communicates urgency the moment someone lands here.
 */
export function EmergencyMode() {
  return (
    <div className="min-h-screen bg-red-700 text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="font-display font-extrabold uppercase tracking-widest text-sm bg-white text-red-700 px-3 py-1 rounded">
          Emergency Mode
        </div>
        <h1 className="mt-6 font-display font-black text-5xl tracking-tight">
          Get help now
        </h1>
        <p className="mt-4 max-w-md text-red-50 leading-relaxed">
          Use the buttons below for immediate help. The full emergency card with your
          health profile, allergies, medications, and contacts ships in Session 10.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          <EmergencyAction href="tel:911" label="Call 911" sublabel="Emergency services" />
          <EmergencyAction href="tel:988" label="Call 988" sublabel="Crisis Lifeline" />
          <EmergencyAction href="sms:741741?body=HOME" label="Text 741741" sublabel="Crisis Text Line" />
        </div>

        <Link
          href="/"
          className="mt-12 text-sm text-red-100 hover:text-white underline underline-offset-4"
        >
          Back to app
        </Link>
      </div>
    </div>
  );
}

function EmergencyAction({
  href,
  label,
  sublabel,
}: {
  href: string;
  label: string;
  sublabel: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-2xl bg-white text-red-700 p-5 shadow-raised hover:bg-red-50 transition-colors"
    >
      <div className="font-display font-extrabold text-2xl">{label}</div>
      <div className="text-xs text-red-700/70 font-semibold uppercase tracking-wider mt-1">
        {sublabel}
      </div>
    </a>
  );
}
