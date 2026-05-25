/**
 * Smart Tasks — Enhancement 9 (Predictive Task Surfacing)
 *
 * Surfaces the 3 most relevant things the user should work on right now,
 * with reasons (overdue, due today, habit streak protection, etc.)
 */
import { AlertCircle, Clock, CheckSquare, CreditCard, Users, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useSmartTasks } from '../api';
import type { SmartTask } from '../types';

const PRIORITY_COLORS: Record<SmartTask['priority'], string> = {
  high:   'text-red-600 bg-red-50 border-red-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low:    'text-teal-700 bg-teal-50 border-teal-200',
};

const TYPE_ICONS: Record<SmartTask['type'], typeof Clock> = {
  task:     CheckSquare,
  habit:    Sparkles,
  bill:     CreditCard,
  followup: Users,
};

const TYPE_LINKS: Record<SmartTask['type'], string> = {
  task:     '/dashboard',
  habit:    '/dashboard',
  bill:     '/financial',
  followup: '/contacts',
};

function TaskRow({ task }: { task: SmartTask }) {
  const Icon = TYPE_ICONS[task.type];
  const colorClasses = PRIORITY_COLORS[task.priority];
  const href = TYPE_LINKS[task.type];

  return (
    <Link href={href}>
      <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-sunk/50 transition-colors cursor-pointer group">
        <div className={`mt-0.5 flex-shrink-0 rounded-lg p-1.5 border ${colorClasses}`}>
          <Icon size={13} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-surface-ink truncate group-hover:text-brand-indigo transition-colors">
            {task.title}
          </p>
          <p className="text-xs text-surface-muted mt-0.5">{task.reason}</p>
        </div>
        {task.priority === 'high' && (
          <AlertCircle size={14} color="#DC2626" className="mt-0.5 flex-shrink-0" />
        )}
      </div>
    </Link>
  );
}

export function SmartTasks() {
  const { data, isLoading } = useSmartTasks();

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-surface-sunk rounded w-32 mb-3" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-surface-sunk rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={15} color="#4F35C2" />
          <h3 className="font-display font-bold text-sm text-surface-ink">Smart suggestions</h3>
        </div>
        <p className="text-sm text-surface-muted">
          🎉 No urgent tasks — you're all caught up! Enjoy the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={15} color="#4F35C2" />
        <h3 className="font-display font-bold text-sm text-surface-ink">Smart suggestions</h3>
        <span className="ml-auto text-[11px] text-surface-muted">right now</span>
      </div>
      <div className="-mx-1">
        {data.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
