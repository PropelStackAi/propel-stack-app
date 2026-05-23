import { useRef, useState } from 'react';
import { extractBusinessCard } from '../api';
import { emptyContactInput, type ContactInput } from '../types';
import { Modal } from './Modal';
import { isNative, takeCameraPhoto, hapticMedium } from '../../../lib/native';

/**
 * Business card scanner — Session 11 update.
 *
 * On native (iOS/Android): opens the Capacitor Camera sheet so the user can
 * choose Camera or Photo Library; the result is a DataUrl fed straight to AI
 * extraction.
 *
 * On web: falls back to a hidden <input type="file" capture="environment"> which
 * opens the camera on mobile browsers and a file picker on desktop.
 *
 * The photo is sent to the AI gateway for field extraction (stubbed until the
 * OpenAI Vision key is configured), then the contact form opens pre-filled.
 */
export function BusinessCardScanner({
  onClose,
  onExtracted,
}: {
  onClose: () => void;
  onExtracted: (input: ContactInput, banner?: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── File input path (web) ────────────────────────────────────────────────
  function pickFile(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPreview(dataUrl);
      void runExtract(dataUrl);
    };
    reader.onerror = () => setError('Could not read that image.');
    reader.readAsDataURL(file);
  }

  // ── Unified capture entry-point ──────────────────────────────────────────
  async function openCapture() {
    setError(null);
    void hapticMedium();

    if (isNative()) {
      // Capacitor Camera — shows a native action sheet (Camera vs. Library)
      try {
        const dataUrl = await takeCameraPhoto(fileRef);
        if (dataUrl) {
          setPreview(dataUrl);
          void runExtract(dataUrl);
        }
        // If dataUrl is null the user cancelled — no error needed
      } catch (err) {
        // Permission denied or camera unavailable — degrade to file input
        setError('Camera access was denied. Please choose a photo instead.');
        fileRef.current?.click();
      }
    } else {
      // Web — trigger the hidden file input (camera on mobile, picker on desktop)
      fileRef.current?.click();
    }
  }

  // ── AI extraction ────────────────────────────────────────────────────────
  async function runExtract(dataUrl: string) {
    setBusy(true);
    try {
      const result = await extractBusinessCard(dataUrl);
      const input = emptyContactInput();
      const f = result.fields;
      input.firstName = f.firstName;
      input.lastName  = f.lastName;
      input.company   = f.company;
      input.title     = f.title;
      input.website   = f.website;
      input.phones    = f.phone ? [{ label: 'Mobile', value: f.phone }] : input.phones;
      input.emails    = f.email ? [{ label: 'Work',   value: f.email }] : input.emails;
      onExtracted(
        input,
        result.stubbed ? result.note : 'Fields extracted from the card — review before saving.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Scan business card" subtitle="Take a photo or choose an image" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-dashed border-surface-ink/15 p-6 text-center">
          {preview ? (
            <img src={preview} alt="Captured business card" className="mx-auto max-h-44 rounded-lg object-contain" />
          ) : (
            <p className="text-sm text-surface-muted">No image yet. Use your camera or choose a file.</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void openCapture()}
          disabled={busy}
          className="btn-primary w-full disabled:opacity-60"
        >
          {busy ? 'Reading card…' : preview ? 'Use a different photo' : 'Open camera / choose photo'}
        </button>

        {/* Hidden file input — web fallback & native degraded fallback */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickFile(file);
          }}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={() => onExtracted(emptyContactInput())}
          className="w-full text-sm text-surface-muted hover:text-surface-ink"
        >
          Skip and enter manually
        </button>
      </div>
    </Modal>
  );
}
