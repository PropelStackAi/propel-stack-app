import { useRef, useState } from 'react';
import { extractBusinessCard } from '../api';
import { emptyContactInput, type ContactInput } from '../types';
import { Modal } from './Modal';

/**
 * Business card scanner. On mobile the file input opens the camera (capture=environment);
 * on desktop it falls back to a file picker. The photo is sent to the AI gateway for
 * field extraction (stubbed until Session 4), then the contact form opens pre-filled.
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

  async function runExtract(dataUrl: string) {
    setBusy(true);
    try {
      const result = await extractBusinessCard(dataUrl);
      const input = emptyContactInput();
      const f = result.fields;
      input.firstName = f.firstName;
      input.lastName = f.lastName;
      input.company = f.company;
      input.title = f.title;
      input.website = f.website;
      input.phones = f.phone ? [{ label: 'Mobile', value: f.phone }] : input.phones;
      input.emails = f.email ? [{ label: 'Work', value: f.email }] : input.emails;
      onExtracted(input, result.stubbed ? result.note : 'Fields extracted from the card — review before saving.');
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
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="btn-primary w-full disabled:opacity-60"
        >
          {busy ? 'Reading card…' : preview ? 'Use a different photo' : 'Open camera / choose photo'}
        </button>
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
