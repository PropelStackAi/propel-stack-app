import { HEALTH_DISCLAIMER } from '../types';

/** Persistent disclaimer bar — must appear on every Health Hub page. */
export function HealthDisclaimer(): JSX.Element {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-6 flex gap-3 items-start">
      <span className="text-amber-500 text-lg mt-0.5 shrink-0">⚕️</span>
      <p className="text-xs text-amber-800 leading-relaxed">
        <strong>Medical Disclaimer:</strong> {HEALTH_DISCLAIMER}
      </p>
    </div>
  );
}
