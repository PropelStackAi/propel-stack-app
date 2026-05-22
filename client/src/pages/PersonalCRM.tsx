import { useState } from 'react';
import {
  useContacts,
  useCreateContact,
  useUpdateContact,
} from '../features/crm/api';
import {
  emptyContactInput,
  toContactInput,
  type ContactInput,
  type ContactWithInteractions,
} from '../features/crm/types';
import { CaptureBar } from '../features/crm/components/CaptureBar';
import { CsvTools } from '../features/crm/components/CsvTools';
import { RemindersPanel } from '../features/crm/components/RemindersPanel';
import { ContactList } from '../features/crm/components/ContactList';
import { ContactDetail } from '../features/crm/components/ContactDetail';
import { ContactForm } from '../features/crm/components/ContactForm';
import { BusinessCardScanner } from '../features/crm/components/BusinessCardScanner';
import { QrScanner } from '../features/crm/components/QrScanner';
import { Modal } from '../features/crm/components/Modal';

type ModalState = 'none' | 'form' | 'card' | 'qr';

export function PersonalCRM() {
  const { data: contacts, isLoading, isError } = useContacts();
  const create = useCreateContact();
  const update = useUpdateContact();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>('none');
  const [formInitial, setFormInitial] = useState<ContactInput>(emptyContactInput);
  const [formBanner, setFormBanner] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);

  function openManual() {
    setFormInitial(emptyContactInput());
    setFormBanner(undefined);
    setEditingId(null);
    setModal('form');
  }

  function openFromScan(input: ContactInput, banner?: string) {
    setFormInitial(input);
    setFormBanner(banner);
    setEditingId(null);
    setModal('form');
  }

  function openEdit(contact: ContactWithInteractions) {
    setFormInitial(toContactInput(contact));
    setFormBanner(undefined);
    setEditingId(contact.id);
    setModal('form');
  }

  function submitForm(input: ContactInput) {
    if (editingId) {
      update.mutate(
        { id: editingId, input },
        {
          onSuccess: (c) => {
            setSelectedId(c.id);
            setModal('none');
          },
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: (c) => {
          setSelectedId(c.id);
          setModal('none');
        },
      });
    }
  }

  const list = contacts ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="chip bg-brand-indigo/10 text-brand-indigo border-transparent ring-1 ring-brand-indigo/20">
              Session 2
            </span>
            <span className="chip text-surface-muted">Personal CRM</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">Contacts</h1>
        </div>
        <CsvTools contacts={list} />
      </div>

      <CaptureBar onScanCard={() => setModal('card')} onScanQr={() => setModal('qr')} onManual={openManual} />

      <div className="mt-6">
        <RemindersPanel onSelect={setSelectedId} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-6">
        <aside className="card p-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]">
          {isLoading ? (
            <p className="text-sm text-surface-muted p-4">Loading contacts…</p>
          ) : isError ? (
            <p className="text-sm text-red-600 p-4">Could not load contacts. Is the server running?</p>
          ) : list.length === 0 ? (
            <EmptyList onAdd={openManual} />
          ) : (
            <ContactList contacts={list} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </aside>

        <section>
          {selectedId ? (
            <ContactDetail contactId={selectedId} onEdit={openEdit} onDeleted={() => setSelectedId(null)} />
          ) : (
            <EmptyDetail hasContacts={list.length > 0} />
          )}
        </section>
      </div>

      {modal === 'form' && (
        <Modal
          title={editingId ? 'Edit contact' : 'New contact'}
          onClose={() => setModal('none')}
          maxWidth="max-w-2xl"
        >
          <ContactForm
            initial={formInitial}
            mode={editingId ? 'edit' : 'create'}
            banner={formBanner}
            busy={create.isPending || update.isPending}
            onSubmit={submitForm}
            onCancel={() => setModal('none')}
          />
        </Modal>
      )}

      {modal === 'card' && (
        <BusinessCardScanner onClose={() => setModal('none')} onExtracted={openFromScan} />
      )}

      {modal === 'qr' && <QrScanner onClose={() => setModal('none')} onExtracted={(input) => openFromScan(input)} />}
    </div>
  );
}

interface EmptyListProps {
  onAdd: () => void;
}

function EmptyList({ onAdd }: EmptyListProps): JSX.Element {
  return (
    <div className="text-center p-6">
      <p className="text-sm text-surface-muted">No contacts yet.</p>
      <button type="button" onClick={onAdd} className="btn-primary mt-3 !py-2 !text-xs">
        Add your first contact
      </button>
    </div>
  );
}

interface EmptyDetailProps {
  hasContacts: boolean;
}

function EmptyDetail({ hasContacts }: EmptyDetailProps): JSX.Element {
  return (
    <div className="card grid place-items-center text-center min-h-[16rem]">
      <div>
        <div className="font-display font-bold text-surface-ink">
          {hasContacts ? 'Select a contact' : 'Capture your first contact'}
        </div>
        <p className="text-sm text-surface-muted mt-1 max-w-sm">
          {hasContacts
            ? 'Pick someone from the list to see details, log interactions, and set follow-ups.'
            : 'Scan a business card, scan a QR vCard, or add a contact manually to get started.'}
        </p>
      </div>
    </div>
  );
}
