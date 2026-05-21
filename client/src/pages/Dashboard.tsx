import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Health { status: string; timestamp: string }
interface User {
  id: string;
  email: string;
  display_name: string;
  plan_tier: string;
  ai_tokens_used_this_month: number;
}

export function Dashboard() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<User>('/api/me'),
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiRequest<Health>('/api/health'),
    refetchInterval: 30_000,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-indigo/10 text-brand-indigo border-transparent ring-1 ring-brand-indigo/20">
          Scaffold
        </span>
        <span className="chip text-surface-muted">Real dashboard arrives in Session 5</span>
      </div>

      <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">
        {userLoading ? 'Welcome' : `Welcome, ${user?.display_name?.split(' ')[0] ?? 'there'}`}
      </h1>
      <p className="mt-3 text-surface-muted max-w-2xl leading-relaxed">
        This is the scaffolded shell. The morning brief, agenda, habits, quick capture,
        stats row, recent activity, weather, birthdays, and overdue follow-ups all land in Session 5.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <StatusCard
          label="Server"
          value={healthLoading ? 'Checking…' : health?.status === 'ok' ? 'Online' : 'Offline'}
          tone={health?.status === 'ok' ? 'good' : 'neutral'}
          detail={health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
        />
        <StatusCard
          label="Account"
          value={userLoading ? '…' : (user?.plan_tier ?? 'spark')}
          detail={user?.email ?? '—'}
          tone="neutral"
          capitalize
        />
        <StatusCard
          label="AI tokens used"
          value={(user?.ai_tokens_used_this_month ?? 0).toLocaleString()}
          detail="This billing month"
          tone="neutral"
        />
      </div>

      <div className="card mt-8">
        <h2 className="font-display font-bold text-base text-surface-ink mb-3">
          Routing &amp; rules verification
        </h2>
        <ul className="text-sm text-surface-muted space-y-1.5 leading-relaxed">
          <li>• URL uses <code className="text-surface-ink font-mono text-xs">#/</code> hash routing — open any page from the sidebar and confirm the address bar shows <code className="text-surface-ink font-mono text-xs">#/contacts</code>, etc.</li>
          <li>• Server health refetches every 30 seconds through TanStack Query v5 object form.</li>
          <li>• Reduced-motion preference at OS level disables all transitions and animations site-wide.</li>
          <li>• No browser storage is used — refresh the page and the app re-fetches state from the server.</li>
        </ul>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  detail,
  tone,
  capitalize,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'good' | 'neutral';
  capitalize?: boolean;
}) {
  const dotClass = tone === 'good' ? 'bg-emerald-500' : 'bg-surface-ink/30';
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-surface-muted font-semibold">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden />
        {label}
      </div>
      <div className={`mt-2 font-display font-bold text-2xl text-surface-ink ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-surface-muted">{detail}</div>
    </div>
  );
}
