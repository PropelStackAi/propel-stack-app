import { useChildUsage } from '../api';
import { SECTION_LABELS } from '../types';

interface Props {
  childId: string;
  loggingEnabled: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  story: '📚',
  homework: '✏️',
  game: '🎮',
  bedtime: '🌙',
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AIUsageSummary({ childId, loggingEnabled }: Props): JSX.Element {
  const { data, isLoading } = useChildUsage(childId);

  if (!loggingEnabled) {
    return (
      <div className="text-center py-6 text-surface-muted">
        <div className="text-2xl mb-2">📊</div>
        <p className="text-sm">AI usage logging is turned off for this profile.</p>
        <p className="text-xs mt-1">Enable it in the Safety tab to see activity categories here.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="py-6 text-center text-sm text-surface-muted">Loading usage data…</div>;
  }

  if (!data || (data.summary.length === 0 && data.recent.length === 0)) {
    return (
      <div className="text-center py-6 text-surface-muted">
        <div className="text-2xl mb-2">🌱</div>
        <p className="text-sm">No AI sessions yet.</p>
        <p className="text-xs mt-1">Activity categories will appear here once your child uses the Kids Zone.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-surface-muted bg-blue-50 rounded-lg px-3 py-2">
        <strong>Privacy note:</strong> You can see which types of activities your child used — story, homework, or games.
        Message content is never stored or shown to protect your child's privacy.
      </p>

      {/* Summary totals */}
      {data.summary.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-surface-ink mb-2">All-time activity</h4>
          <div className="space-y-2">
            {data.summary.map((row) => (
              <div key={row.session_type} className="flex items-center gap-3 py-2 border-b border-surface-ink/[0.06] last:border-0">
                <span className="text-xl">{TYPE_EMOJI[row.session_type] ?? '🤖'}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-surface-ink capitalize">
                    {SECTION_LABELS[row.session_type] ?? row.session_type}
                  </div>
                  <div className="text-xs text-surface-muted">
                    {row.session_count} session{row.session_count !== 1 ? 's' : ''} · {row.interaction_count} interaction{row.interaction_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {data.recent.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-surface-ink mb-2">Recent sessions</h4>
          <div className="space-y-1">
            {data.recent.slice(0, 8).map((row, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-1.5 text-surface-ink capitalize">
                  <span>{TYPE_EMOJI[row.session_type] ?? '🤖'}</span>
                  {SECTION_LABELS[row.session_type] ?? row.session_type}
                </span>
                <span className="text-surface-muted">{relTime(row.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
