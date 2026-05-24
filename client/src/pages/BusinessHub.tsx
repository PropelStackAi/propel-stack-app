// ─── Business Hub ─────────────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC
//
// Small business workspace: Clients | Projects | Invoices | Expenses | Insights

import { useState } from 'react';
import { ClientsTab }  from '../features/business/components/ClientsTab';
import { ProjectsTab } from '../features/business/components/ProjectsTab';
import { InvoicesTab } from '../features/business/components/InvoicesTab';
import { ExpensesTab } from '../features/business/components/ExpensesTab';
import { InsightsTab } from '../features/business/components/InsightsTab';

type Tab = 'clients' | 'projects' | 'invoices' | 'expenses' | 'insights';

const TABS: { id: Tab; label: string; emoji: string; description: string }[] = [
  { id: 'clients',  label: 'Clients',  emoji: '👥', description: 'Manage your business client relationships' },
  { id: 'projects', label: 'Projects', emoji: '🚀', description: 'Track active work, deadlines, and budgets'  },
  { id: 'invoices', label: 'Invoices', emoji: '🧾', description: 'Create, send, and track invoices'           },
  { id: 'expenses', label: 'Expenses', emoji: '💸', description: 'Categorize and monitor business spending'    },
  { id: 'insights', label: 'Insights', emoji: '📊', description: 'AI-powered business health summary'          },
];

export function BusinessHub(): JSX.Element {
  const [tab, setTab] = useState<Tab>('insights');
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          🏢 Business Hub
        </h2>
        <p className="text-xs text-surface-muted">
          Small business workspace — clients, projects, invoicing, and AI insights all in one place.
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
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-surface-muted">{active.description}</p>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'clients'  && <ClientsTab />}
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'invoices' && <InvoicesTab />}
        {tab === 'expenses' && <ExpensesTab />}
        {tab === 'insights' && <InsightsTab />}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI, LLC · Business Hub ·
        Not financial, legal, or tax advice. Consult a licensed professional for your business needs.
      </p>
    </div>
  );
}
