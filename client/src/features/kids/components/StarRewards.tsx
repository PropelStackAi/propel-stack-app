import { STAR_BADGES, getBadge } from '../types';

interface Props {
  totalStars: number;
}

export function StarRewards({ totalStars }: Props): JSX.Element {
  const badge = getBadge(totalStars);
  const next = STAR_BADGES.find((b) => b.threshold > totalStars);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">⭐</span>
        <div>
          <div className="font-display font-bold text-xl text-amber-800">{totalStars} Stars</div>
          {badge && <div className="text-sm text-amber-600">{badge.emoji} {badge.label}</div>}
        </div>
      </div>

      {/* Progress to next badge */}
      {next && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-amber-700 mb-1.5">
            <span>Next: {next.emoji} {next.label}</span>
            <span>{totalStars}/{next.threshold}</span>
          </div>
          <div className="h-2.5 rounded-full bg-amber-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(100, (totalStars / next.threshold) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* All badges */}
      <div className="space-y-1.5">
        {STAR_BADGES.map((b) => {
          const earned = totalStars >= b.threshold;
          return (
            <div
              key={b.threshold}
              className={[
                'flex items-center gap-2.5 text-sm rounded-lg px-3 py-1.5 transition-all',
                earned ? 'bg-amber-200/60 text-amber-800 font-semibold' : 'text-amber-700/50',
              ].join(' ')}
            >
              <span className={earned ? '' : 'grayscale opacity-40'}>{b.emoji}</span>
              <span>{b.label}</span>
              <span className="ml-auto text-xs">{b.threshold} ⭐</span>
              {earned && <span className="text-green-600 text-xs">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
