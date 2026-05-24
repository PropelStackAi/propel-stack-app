// ─── Personal Finance Hub ─────────────────────────────────────────────────────
// Enhancement 18 — Propel Stack AI, LLC
//
// COMPLIANCE: Visibility & organisation tool only.
// No investment advice. No buy/sell/hold recommendations.

import { useState } from 'react';
import { AccountsTab }        from '../features/personalFinance/components/AccountsTab';
import { SpendingTab }        from '../features/personalFinance/components/SpendingTab';
import { BudgetsTab }         from '../features/personalFinance/components/BudgetsTab';
import { BillsTab }           from '../features/personalFinance/components/BillsTab';
import { SavingsTab }         from '../features/personalFinance/components/SavingsTab';
import { NetWorthTab }        from '../features/personalFinance/components/NetWorthTab';
import { FinanceInsightsTab } from '../features/personalFinance/components/FinanceInsightsTab';

type Tab = 'accounts' | 'spending' | 'budgets' | 'bills' | 'savings' | 'networth' | 'insights';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'accounts',  label: 'Accounts',   emoji: '🏦' },
  { id: 'spending',  label: 'Spending',   emoji: '📊' },
  { id: 'budgets',   label: 'Budgets',    emoji: '📋' },
  { id: 'bills',     label: 'Bills',      emoji: '📅' },
  { id: 'savings',   label: 'Savings',    emoji: '💰' },
  { id: 'networth',  label: 'Net Worth',  emoji: '📈' },
  { id: 'insights',  label: 'Insights',   emoji: '🤖' },
];

export function PersonalFinanceHub(): JSX.Element {
  const [tab, setTab] = useState<Tab>('accounts');

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          💳 Personal Finance Hub
        </h2>
        <p className="text-xs text-surface-muted">
          Track accounts, spending, budgets, bills, savings goals, and net worth — all in one place.
        </p>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              tab === t.id
                ? 'bg-brand-indigo text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'accounts'  && <AccountsTab />}
        {tab === 'spending'  && <SpendingTab />}
        {tab === 'budgets'   && <BudgetsTab />}
        {tab === 'bills'     && <BillsTab />}
        {tab === 'savings'   && <SavingsTab />}
        {tab === 'networth'  && <NetWorthTab />}
        {tab === 'insights'  && <FinanceInsightsTab />}
      </div>

      {/* Compliance footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI, LLC · Personal Finance Hub · Visibility &amp; organisation only ·
        Not financial, investment, tax, or legal advice. Consult a licensed financial advisor for personal guidance.
      </p>
    </div>
  );
}
