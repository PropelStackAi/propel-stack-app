import { expiryStatus, type ExpiryTone } from '../types';

const TONE: Record<ExpiryTone, string> = {
  red: 'bg-red-500/10 text-red-700 ring-1 ring-red-500/20 border-transparent',
  amber: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 border-transparent',
  green: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 border-transparent',
  none: 'text-surface-muted',
};

export function ExpiryChip({ date }: { date: string | null }) {
  const { tone, label } = expiryStatus(date);
  return <span className={`chip ${TONE[tone]}`}>{label}</span>;
}
