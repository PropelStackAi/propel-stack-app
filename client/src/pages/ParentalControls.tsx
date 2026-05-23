import { useState } from 'react';
import { useChildren } from '../features/parental/api';
import { ChildProfileCard } from '../features/parental/components/ChildProfileCard';
import { AddChildModal } from '../features/parental/components/AddChildModal';
import { EmergencyContactCard } from '../features/parental/components/EmergencyContactCard';

/**
 * Parental Controls — Session 9.
 * Requires Family plan. Child profiles are COPPA-compliant (no email, no DOB).
 */
export function ParentalControls(): JSX.Element {
  const [showAdd, setShowAdd] = useState(false);
  const { data: children, isLoading, error } = useChildren();

  const isFamilyGate = (error as Error | null)?.message?.includes('Family plan');

  if (isFamilyGate) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="font-display font-bold text-2xl text-surface-ink mb-2">Family Plan Required</h2>
        <p className="text-surface-muted mb-6">
          Parental Controls and the Kids Zone are available on the Family plan and above.
          Upgrade to manage child profiles, screen time, and safe AI for your kids.
        </p>
        <a href="#/financial" className="btn bg-brand-purple text-white hover:bg-brand-purple/90">
          View Plans
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-surface-ink">Parental Controls</h1>
          <p className="text-surface-muted text-sm mt-0.5">
            Manage child profiles, screen time, content filters, and Kids Zone access.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn bg-brand-purple text-white hover:bg-brand-purple/90"
        >
          + Add Child
        </button>
      </div>

      {/* COPPA notice */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 mb-6 flex gap-3 items-start">
        <span className="text-lg mt-0.5">🔵</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">COPPA Compliant</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Child profiles store only a first name and avatar — no email, date of birth, or personal identifiers.
            AI sessions log activity type (story, homework, game) only — never message content.
            No ads or behavioral tracking.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-surface-sunk animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && children?.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h3 className="font-display font-bold text-xl text-surface-ink mb-2">No child profiles yet</h3>
          <p className="text-surface-muted mb-6 max-w-sm mx-auto">
            Add a child profile to set up screen time limits, content filters, and access to the Kids Zone.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="btn bg-brand-purple text-white hover:bg-brand-purple/90"
          >
            Add first child
          </button>
        </div>
      )}

      {/* Child profile cards */}
      {!isLoading && children && children.length > 0 && (
        <div className="space-y-4 mb-8">
          {children.map((child) => (
            <ChildProfileCard key={child.id} child={child} />
          ))}
        </div>
      )}

      {/* Emergency contacts for all children */}
      {!isLoading && children && children.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg text-surface-ink mb-3">Emergency Contacts</h2>
          <div className="space-y-3">
            {children.map((child) => (
              <EmergencyContactCard key={child.id} child={child} />
            ))}
          </div>
        </div>
      )}

      {/* Add child modal */}
      {showAdd && <AddChildModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
