import { useState } from 'react';
import { useVerifyPin } from '../../parental/api';

interface Props {
  childId: string;
  childName: string;
  onUnlock: () => void;
}

export function ScreenTimeLock({ childId, childName, onUnlock }: Props): JSX.Element {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const verify = useVerifyPin();

  function handleVerify() {
    if (!/^\d{6}$/.test(pin)) {
      setError('Enter the 6-digit parent PIN.');
      return;
    }
    setError('');
    verify.mutate(
      { childId, pin },
      {
        onSuccess: () => onUnlock(),
        onError: () => setError('Incorrect PIN. Please try again.'),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-purple flex flex-col items-center justify-center px-6 text-white">
      <div className="text-7xl mb-6">⏰</div>
      <h2 className="font-display font-extrabold text-3xl mb-2 text-center">Time's up, {childName}!</h2>
      <p className="text-lg opacity-80 text-center mb-8">
        You've used all your screen time for today.
        Come back tomorrow for more fun!
      </p>

      {/* Decorative stars */}
      <div className="flex gap-2 mb-10 text-2xl opacity-40">
        {['⭐', '🌙', '⭐', '🌙', '⭐'].map((s, i) => <span key={i}>{s}</span>)}
      </div>

      {/* Parent unlock section */}
      <div className="w-full max-w-xs bg-white/10 rounded-2xl p-5 text-center">
        <p className="text-sm opacity-80 mb-3 font-semibold">Parent unlock</p>
        <p className="text-xs opacity-60 mb-4">Enter your 6-digit parent PIN to add more time.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
          placeholder="••••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-white/50 px-4 py-3 text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-white mb-3"
        />
        {error && <p className="text-red-300 text-xs mb-2">{error}</p>}
        <button
          onClick={handleVerify}
          disabled={verify.isPending || pin.length !== 6}
          className="w-full bg-white text-brand-purple font-bold rounded-xl py-3 disabled:opacity-50 transition-all hover:bg-white/90"
        >
          {verify.isPending ? 'Checking…' : 'Unlock'}
        </button>
      </div>
    </div>
  );
}
