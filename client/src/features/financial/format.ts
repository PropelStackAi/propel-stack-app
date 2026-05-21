const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const USD_CENTS = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function money(n: number, cents = false): string {
  if (!Number.isFinite(n)) return '$0';
  return (cents ? USD_CENTS : USD).format(n);
}

export function pct(n: number): string {
  if (!Number.isFinite(n)) return '0%';
  return `${n >= 0 ? '' : ''}${n.toFixed(1)}%`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
