import { useState } from 'react';
import type { ChildProfile } from '../types';
import { useUpdateChild } from '../api';

interface Props {
  child: ChildProfile;
}

export function EmergencyContactCard({ child }: Props): JSX.Element {
  const update = useUpdateChild();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(child.emergency_contact_name);
  const [phone, setPhone] = useState(child.emergency_contact_phone);
  const [relation, setRelation] = useState(child.emergency_contact_relation);

  const hasContact = child.emergency_contact_name || child.emergency_contact_phone;

  function save() {
    update.mutate(
      {
        id: child.id,
        body: {
          emergencyContactName: name,
          emergencyContactPhone: phone,
          emergencyContactRelation: relation,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <h3 className="font-semibold text-base text-red-700 mb-4">📞 Emergency Contact — {child.name}</h3>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-surface-ink/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Contact name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-surface-ink/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-surface-ink/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Relationship (e.g. Mom, Teacher)"
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
          />
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="flex-1 btn-outline text-sm">Cancel</button>
            <button
              onClick={save}
              disabled={update.isPending}
              className="flex-1 btn bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50"
            >
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base text-red-700 mb-1">📞 Emergency Contact — {child.name}</h3>
          {hasContact ? (
            <div className="space-y-0.5">
              <p className="text-sm text-red-800 font-medium">{child.emergency_contact_name}</p>
              {child.emergency_contact_relation && (
                <p className="text-xs text-red-600">{child.emergency_contact_relation}</p>
              )}
              {child.emergency_contact_phone && (
                <a
                  href={`tel:${child.emergency_contact_phone}`}
                  className="text-sm text-red-700 font-semibold underline block"
                >
                  {child.emergency_contact_phone}
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-600">No emergency contact set yet.</p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-red-600 hover:text-red-800 underline shrink-0 mt-0.5"
        >
          {hasContact ? 'Edit' : 'Add'}
        </button>
      </div>
    </div>
  );
}
