import { DISCLAIMER_WATERMARK } from '../constants';

/**
 * Persistent disclaimer watermark shown at the bottom of every Financial Hub page
 * (Build Guide follow-up requirement).
 */
export function DisclaimerWatermark() {
  return (
    <p className="mt-10 border-t border-surface-ink/[0.06] pt-3 text-center text-[11px] text-surface-muted">
      {DISCLAIMER_WATERMARK}
    </p>
  );
}
