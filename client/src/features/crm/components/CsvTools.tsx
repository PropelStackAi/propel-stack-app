import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { importContacts } from '../api';
import { contactsToCsv, csvToContacts, downloadCsv } from '../csv';
import type { Contact } from '../types';

export function CsvTools({ contacts }: { contacts: Contact[] }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleExport() {
    if (contacts.length === 0) {
      setMessage('No contacts to export yet.');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`propel-contacts-${stamp}.csv`, contactsToCsv(contacts));
    setMessage(`Exported ${contacts.length} contacts.`);
  }

  async function handleImportFile(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = csvToContacts(text);
      if (parsed.length === 0) {
        setMessage('No rows found in that CSV.');
        return;
      }
      const result = await importContacts(parsed);
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setMessage(`Imported ${result.imported}${result.skipped ? `, skipped ${result.skipped}` : ''}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleExport} className="btn-secondary !py-2 !text-xs">
        Export CSV
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="btn-secondary !py-2 !text-xs disabled:opacity-60"
      >
        {busy ? 'Importing…' : 'Import CSV'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportFile(file);
        }}
      />
      {message && <span className="text-xs text-surface-muted">{message}</span>}
    </div>
  );
}
