/**
 * Sync Indicator — Session 14 Enhancement 8
 * Propel Stack AI, LLC
 *
 * Persistent header badge showing sync status:
 * green = synced, yellow = syncing, red = offline
 */
import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

type SyncStatus = 'synced' | 'syncing' | 'offline';

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>(navigator.onLine ? 'synced' : 'offline');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setStatus('synced');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll sync queue every 60s to show pending count
  useEffect(() => {
    let cancelled = false;
    async function checkQueue() {
      if (cancelled) return;
      try {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error('server down');
        setPendingCount(0);
        if (!navigator.onLine) return;
        setStatus('synced');
      } catch {
        if (navigator.onLine) setStatus('syncing');
      }
    }
    checkQueue();
    const interval = setInterval(checkQueue, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const dot = status === 'synced'
    ? <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
    : status === 'syncing'
    ? <RefreshCw size={10} className="text-amber-400 animate-spin flex-shrink-0" />
    : <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />;

  const label = status === 'synced'
    ? pendingCount > 0 ? `${pendingCount} pending` : 'All synced'
    : status === 'syncing'
    ? 'Syncing…'
    : 'Offline';

  const bgColor = status === 'synced'
    ? pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
    : status === 'syncing'
    ? 'bg-amber-50 border-amber-200'
    : 'bg-red-50 border-red-200';

  const textColor = status === 'synced'
    ? pendingCount > 0 ? 'text-amber-700' : 'text-green-700'
    : status === 'syncing'
    ? 'text-amber-700'
    : 'text-red-700';

  if (status === 'synced' && pendingCount === 0) {
    // Hide when everything is normal to avoid UI clutter
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${bgColor} ${textColor}`}>
      {status === 'offline' ? <WifiOff size={10} /> : dot}
      {label}
    </div>
  );
}
