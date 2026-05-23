import type { ChildProfile } from '../../parental/types';
import { getBadge } from '../types';

interface Props {
  child: ChildProfile;
  totalStars: number;
  remainingMinutes: number;
  limitMinutes: number;
}

export function KidsBanner({ child, totalStars, remainingMinutes, limitMinutes }: Props): JSX.Element {
  const badge = getBadge(totalStars);
  const timePct = limitMinutes > 0 ? Math.min(100, (remainingMinutes / limitMinutes) * 100) : 0;
  const timeColor = timePct < 20 ? 'bg-red-400' : timePct < 50 ? 'bg-amber-400' : 'bg-green-400';

  return (
    <div className="rounded-2xl bg-gradient-to-r from-brand-purple to-purple-500 text-white p-5 mb-6 shadow-raised">
      <div className="flex items-center gap-4">
        <span className="text-5xl">{child.avatar_emoji}</span>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-extrabold text-2xl leading-tight">
            Hi, {child.name}! 👋
          </h1>
          {badge && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-lg">{badge.emoji}</span>
              <span className="text-sm font-semibold opacity-90">{badge.label}</span>
            </div>
          )}
        </div>
        {/* Star count */}
        <div className="text-center">
          <div className="text-3xl font-extrabold leading-none">⭐{totalStars}</div>
          <div className="text-xs opacity-75 mt-0.5">stars</div>
        </div>
      </div>

      {/* Screen time bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs opacity-80 mb-1">
          <span>Time left today</span>
          <span>
            {remainingMinutes > 0
              ? `${remainingMinutes} min remaining`
              : '⛔ Time is up!'}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${timeColor}`}
            style={{ width: `${timePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
