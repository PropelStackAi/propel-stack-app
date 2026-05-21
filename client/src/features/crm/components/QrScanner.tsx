import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseVCard } from '../vcard';
import type { ContactInput } from '../types';
import { Modal } from './Modal';

const READER_ID = 'psai-qr-reader';

/**
 * QR vCard scanner using html5-qrcode, with a manual paste fallback (per the build
 * guide) for when the camera is unavailable or the device blocks it.
 */
export function QrScanner({
  onClose,
  onExtracted,
}: {
  onClose: () => void;
  onExtracted: (input: ContactInput) => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  function handleDecoded(text: string): boolean {
    const input = parseVCard(text);
    if (!input) return false;
    handledRef.current = true;
    void stop();
    onExtracted(input);
    return true;
  }

  async function stop() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      /* already stopped */
    }
    scannerRef.current = null;
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          if (!handledRef.current) handleDecoded(decodedText);
        },
        () => {
          /* per-frame decode misses are expected; ignore */
        },
      )
      .catch((err: unknown) => {
        setCameraError(
          err instanceof Error
            ? `Camera unavailable: ${err.message}. Paste the vCard text below instead.`
            : 'Camera unavailable. Paste the vCard text below instead.',
        );
      });

    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function usePaste() {
    if (!handleDecoded(paste)) {
      setPasteError('That text is not a recognizable vCard (must contain BEGIN:VCARD).');
    }
  }

  return (
    <Modal title="Scan QR vCard" subtitle="Point your camera at a vCard QR code" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden bg-surface-ink/5">
          <div id={READER_ID} className="w-full" />
        </div>
        {cameraError && (
          <p className="text-sm text-amber-700 bg-amber-500/10 ring-1 ring-amber-500/20 rounded-lg px-3 py-2">
            {cameraError}
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-surface-muted mb-1">
            Or paste vCard text
          </label>
          <textarea
            value={paste}
            onChange={(e) => {
              setPaste(e.target.value);
              setPasteError(null);
            }}
            placeholder={'BEGIN:VCARD\nVERSION:3.0\nFN:Jordan Rivera\n…\nEND:VCARD'}
            className="w-full rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm min-h-[90px] font-mono"
          />
          {pasteError && <p className="text-sm text-red-600 mt-1">{pasteError}</p>}
          <button type="button" onClick={usePaste} disabled={!paste.trim()} className="btn-primary w-full mt-2 disabled:opacity-60">
            Use pasted vCard
          </button>
        </div>
      </div>
    </Modal>
  );
}
