// ─── Home & Property Hub ──────────────────────────────────────────────────────
// Enhancement 21 — Propel Stack AI, LLC

import { useState } from 'react';
import { PropertiesTab }          from '../features/homeProperty/components/PropertiesTab';
import { MaintenanceTab }         from '../features/homeProperty/components/MaintenanceTab';
import { VehiclesTab }            from '../features/homeProperty/components/VehiclesTab';
import { InsuranceAppliancesTab } from '../features/homeProperty/components/InsuranceAppliancesTab';
import { UtilitiesRentalTab }     from '../features/homeProperty/components/UtilitiesRentalTab';
import { useMaintenanceTasks }    from '../features/homeProperty/api';

type Tab = 'properties' | 'maintenance' | 'vehicles' | 'insurance' | 'utilities';

export function HomePropertyHub(): JSX.Element {
  const [tab, setTab] = useState<Tab>('properties');
  const { data: taskData } = useMaintenanceTasks();

  // Count overdue maintenance tasks for badge
  const overdueTasks = (taskData?.tasks ?? []).filter((t) => {
    if (!t.next_due) return false;
    return new Date(t.next_due) < new Date();
  }).length;

  const TABS: { id: Tab; label: string; emoji: string; badge?: number }[] = [
    { id: 'properties',  label: 'Properties',  emoji: '🏠' },
    { id: 'maintenance', label: 'Maintenance',  emoji: '🔧', badge: overdueTasks },
    { id: 'vehicles',    label: 'Vehicles',     emoji: '🚗' },
    { id: 'insurance',   label: 'Insurance',    emoji: '🛡️' },
    { id: 'utilities',   label: 'Utilities',    emoji: '⚡' },
  ];

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-ink flex items-center gap-2">
          🏠 Home & Property Hub
        </h2>
        <p className="text-xs text-surface-muted">
          Track properties, maintenance schedules, vehicles, appliances, insurance, utilities, and rentals — all in one place.
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
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative',
              tab === t.id
                ? 'bg-brand-teal text-white'
                : 'bg-surface-raised border border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`text-[9px] font-bold px-1 rounded-full ${tab === t.id ? 'bg-white/30 text-white' : 'bg-orange-400 text-white'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {tab === 'properties'  && <PropertiesTab />}
        {tab === 'maintenance' && <MaintenanceTab />}
        {tab === 'vehicles'    && <VehiclesTab />}
        {tab === 'insurance'   && <InsuranceAppliancesTab />}
        {tab === 'utilities'   && <UtilitiesRentalTab />}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-surface-muted pb-4">
        Propel Stack AI · Home & Property Hub · All property data is private. Never shared with third parties.
      </p>
    </div>
  );
}
