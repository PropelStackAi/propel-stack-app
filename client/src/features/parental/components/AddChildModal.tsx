import { useState } from 'react';
import { useCreateChild } from '../api';
import { AVATAR_OPTIONS } from '../types';

interface Props {
  onClose: () => void;
}

export function AddChildModal({ onClose }: Props): JSX.Element {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🧒');
  const [ageRange, setAgeRange] = useState<'child' | 'tween'>('child');
  const [screenTime, setScreenTime] = useState(60);
  const create = useCreateChild();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), avatarEmoji: avatar, ageRange, screenTimeLimitMinutes: screenTime },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-surface-raised rounded-2xl shadow-raised w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display font-bold text-xl text-surface-ink mb-1">Add Child Profile</h2>
        <p className="text-sm text-surface-muted mb-5">
          COPPA-compliant — no email or date of birth stored.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Child name */}
          <div>
            <label className="block text-sm font-semibold text-surface-ink mb-1">First name only</label>
            <input
              className="w-full rounded-lg border border-surface-ink/10 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              required
            />
          </div>

          {/* Avatar picker */}
          <div>
            <label className="block text-sm font-semibold text-surface-ink mb-2">Pick an avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setAvatar(em)}
                  className={[
                    'text-2xl rounded-xl p-2 transition-all',
                    avatar === em ? 'bg-brand-purple/20 ring-2 ring-brand-purple' : 'hover:bg-surface-sunk',
                  ].join(' ')}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Age range */}
          <div>
            <label className="block text-sm font-semibold text-surface-ink mb-2">Age range</label>
            <div className="flex gap-3">
              {(['child', 'tween'] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setAgeRange(r)}
                  className={[
                    'flex-1 rounded-xl border py-2 text-sm font-semibold transition-all',
                    ageRange === r
                      ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                      : 'border-surface-ink/10 text-surface-muted hover:border-brand-purple/40',
                  ].join(' ')}
                >
                  {r === 'child' ? 'Ages 5–8' : 'Ages 9–12'}
                </button>
              ))}
            </div>
          </div>

          {/* Screen time limit */}
          <div>
            <label className="block text-sm font-semibold text-surface-ink mb-1">
              Daily screen time limit — <span className="text-brand-purple">{screenTime} min</span>
            </label>
            <input
              type="range"
              min={15}
              max={240}
              step={15}
              value={screenTime}
              onChange={(e) => setScreenTime(Number(e.target.value))}
              className="w-full accent-brand-purple"
            />
            <div className="flex justify-between text-xs text-surface-muted mt-0.5">
              <span>15 min</span><span>4 hrs</span>
            </div>
          </div>

          {/* Actions */}
          {create.error && (
            <p className="text-sm text-red-600">
              {(create.error as Error).message || 'Failed to create profile.'}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Cancel</button>
            <button
              type="submit"
              disabled={create.isPending || !name.trim()}
              className="flex-1 btn bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50"
            >
              {create.isPending ? 'Adding…' : 'Add Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
