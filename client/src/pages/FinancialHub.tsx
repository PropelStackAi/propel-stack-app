import { useState } from 'react';
import { useDisclaimer } from '../features/financial/api';
import { DisclaimerGate } from '../features/financial/components/DisclaimerGate';
import { DisclaimerWatermark } from '../features/financial/components/DisclaimerWatermark';
import { BudgetTracker } from '../features/financial/components/BudgetTracker';
import { NetWorthTracker } from '../features/financial/components/NetWorthTracker';
import { DebtCalculator } from '../features/financial/components/DebtCalculator';
import { InvestmentTracker } from '../features/financial/components/InvestmentTracker';
import { BillCalendar } from '../features/financial/components/BillCalendar';
import { GoalsTracker } from '../features/financial/components/GoalsTracker';
import { FinanceAssistant } from '../features/financial/components/FinanceAssistant';

const TABS = [
  { id: 'budget', label: 'Budget', render: () => <BudgetTracker /> },
  { id: 'networth', label: 'Net Worth', render: () => <NetWorthTracker /> },
  { id: 'debt', label: 'Debt Payoff', render: () => <DebtCalculator /> },
  { id: 'investments', label: 'Investments', render: () => <InvestmentTracker /> },
  { id: 'bills', label: 'Bills', render: () => <BillCalendar /> },
  { id: 'goals', label: 'Goals', render: () => <GoalsTracker /> },
  { id: 'assistant', label: 'AI Q&A', render: () => <FinanceAssistant /> },
] as const;

export function FinancialHub() {
  const { data: disclaimer, isLoading, isError } = useDisclaimer();
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('budget');

  if (isLoading) return <div className="card text-sm text-surface-muted">Loading Financial Hub…</div>;
  if (isError) return <div className="card text-sm text-red-600">Could not reach the server. Is it running?</div>;

  // Gate: no financial content renders until the disclaimer is acknowledged.
  if (!disclaimer?.acknowledged) return <DisclaimerGate />;

  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-indigo/10 text-brand-indigo border-transparent ring-1 ring-brand-indigo/20">Session 3</span>
        <span className="chip text-surface-muted">Financial Command Center</span>
      </div>
      <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">Financial Hub</h1>

      <div className="mt-5 flex flex-wrap gap-1.5 border-b border-surface-ink/[0.06] pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={[
              'px-3.5 py-2 text-sm rounded-t-lg transition-colors -mb-px border-b-2',
              active === t.id
                ? 'border-brand-indigo text-brand-indigo font-semibold'
                : 'border-transparent text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">{current.render()}</div>

      <DisclaimerWatermark />
    </div>
  );
}
