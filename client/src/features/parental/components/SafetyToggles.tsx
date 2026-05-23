import { useState } from 'react';
import type { ChildProfile } from '../types';
import { SECTION_LABELS } from '../types';
import { useSetPin, useUpdateChild } from '../api';

interface Props {
  child: ChildProfile;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-surface-ink/[0.06] last:border-0">
      <div>
        <div className="text-sm font-semibold text-surface-ink">{label}</div>
        <div className="text-xs text-surface-muted mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        aria-pressed={checked}
        className={[
          'shrink-0 w-11 h-6 rounded-full transition-colors relative mt-0.5',
          checked ? 'bg-brand-purple' : 'bg-surface-ink/20',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function SafetyToggles({ child }: Props): JSX.Element {
  const update = useUpdateChild();
  const setPin = useSetPin();
  const [pin, setPin2] = useState('');
  const [pinSaved, setPinSaved] = useState(false);
  const [pinError, setPinError] = useState('');

  const sections = JSON.parse(child.app_sections_approved) as string[];

  function toggleSection(section: string) {
    const current = JSON.parse(child.app_sections_approved) as string[];
    const next = current.includes(section)
      ? current.filter((s) => s !== section)
      : [...current, section];
    update.mutate({ id: child.id, body: { appSectionsApproved: next } });
  }

  function savePin() {
    if (!/^\d{6}$/.test(pin)) {
      setPinError('PIN must be exactly 6 digits.');
      return;
    }
    setPinError('');
    setPin.mutate(
      { childId: child.id, pin },
      {
        onSuccess: () => {
          setPinSaved(true);
          setPin2('');
          setTimeout(() => setPinSaved(false), 3000);
        },
      },
    );
  }

  return (
    <div className="space-y-1">
      <ToggleRow
        label="Content filter"
        description="Blocks adult topics, violence, and inappropriate content in Kids Zone AI."
        checked={child.content_filter === 1}
        onChange={(v) => update.mutate({ id: child.id, body: { contentFilter: v } })}
        disabled={update.isPending}
      />
      <ToggleRow
        label="AI usage logging"
        description="Logs activity categories only (story, homework, game) — never message content."
        checked={child.ai_logging_enabled === 1}
        onChange={(v) => update.mutate({ id: child.id, body: { aiLoggingEnabled: v } })}
        disabled={update.isPending}
      />

      {/* Section approvals */}
      <div className="pt-2 pb-1">
        <div className="text-sm font-semibold text-surface-ink mb-2">App sections approved</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SECTION_LABELS).map(([key, label]) => {
            const active = sections.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleSection(key)}
                disabled={update.isPending}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  active
                    ? 'bg-brand-purple/10 border-brand-purple text-brand-purple'
                    : 'border-surface-ink/10 text-surface-muted hover:border-brand-purple/40',
                ].join(' ')}
              >
                {active ? '✓ ' : ''}{label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Parent PIN */}
      <div className="pt-3 border-t border-surface-ink/[0.06] mt-2">
        <div className="text-sm font-semibold text-surface-ink mb-1">Parent override PIN</div>
        <p className="text-xs text-surface-muted mb-2">
          6-digit PIN to unlock the screen-time lock screen. Keep this private.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            pattern="\d{6}"
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-28 rounded-lg border border-surface-ink/10 bg-surface px-3 py-1.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
          <button
            onClick={savePin}
            disabled={setPin.isPending || pin.length !== 6}
            className="btn text-xs bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50 py-1.5 px-3"
          >
            {setPin.isPending ? 'Saving…' : pinSaved ? '✓ Saved' : 'Set PIN'}
          </button>
        </div>
        {pinError && <p className="text-xs text-red-600 mt-1">{pinError}</p>}
      </div>
    </div>
  );
}
