/**
 * "Capture first" entry point (Session 2 spec). Three methods, all functional:
 *  - Business card scanner (camera/photo -> AI extract)
 *  - QR vCard scanner (camera, with paste fallback)
 *  - Manual entry
 */
export function CaptureBar({
  onScanCard,
  onScanQr,
  onManual,
}: {
  onScanCard: () => void;
  onScanQr: () => void;
  onManual: () => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <CaptureButton
        accent="coral"
        label="Scan business card"
        sublabel="Photo → AI extract"
        onClick={onScanCard}
        icon={
          <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm4 3h4m-4 4h7m3-5.5h.01" strokeLinecap="round" />
        }
      />
      <CaptureButton
        accent="teal"
        label="Scan QR vCard"
        sublabel="Camera or paste"
        onClick={onScanQr}
        icon={
          <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 3h3m0 0h3m-3 0v3m0-3v-3" strokeLinecap="round" strokeLinejoin="round" />
        }
      />
      <CaptureButton
        accent="indigo"
        label="Add manually"
        sublabel="Full contact form"
        onClick={onManual}
        icon={<path d="M12 5v14m-7-7h14" strokeLinecap="round" />}
      />
    </div>
  );
}

function CaptureButton({
  label,
  sublabel,
  onClick,
  icon,
  accent,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
  icon: React.ReactNode;
  accent: 'indigo' | 'coral' | 'teal';
}) {
  const ring = {
    indigo: 'hover:border-brand-indigo/40 text-brand-indigo',
    coral: 'hover:border-brand-coral/40 text-brand-coral',
    teal: 'hover:border-brand-teal/40 text-brand-teal',
  }[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl border border-surface-ink/10 bg-surface-raised px-4 py-3 text-left shadow-card transition-colors ${ring}`}
    >
      <span className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-surface-sunk">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          {icon}
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-sm text-surface-ink">{label}</span>
        <span className="block text-xs text-surface-muted">{sublabel}</span>
      </span>
    </button>
  );
}
