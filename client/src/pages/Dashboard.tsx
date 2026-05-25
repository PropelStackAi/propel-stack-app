import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { MorningBrief } from '../features/dashboard/components/MorningBrief';
import { StatsRow } from '../features/dashboard/components/StatsRow';
import { TodayAgenda } from '../features/dashboard/components/TodayAgenda';
import { HabitStrip } from '../features/dashboard/components/HabitStrip';
import { WeatherWidget } from '../features/dashboard/components/WeatherWidget';
import { DashboardReminders } from '../features/dashboard/components/DashboardReminders';
import { RecentActivity } from '../features/dashboard/components/RecentActivity';
import { DashboardRecapBanner } from '../features/recap/components/DashboardRecapBanner';
import { StreakCard } from '../features/streaks/components/StreakCard';
import { CoachingInsightCard } from '../features/coaching/components/CoachingInsightCard';
import { SmartTasks } from '../features/dashboard/components/SmartTasks';

interface User { display_name: string }

export function Dashboard() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => apiRequest<User>('/api/me') });
  const firstName = user?.display_name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink mb-4">
        {greeting}, {firstName}
      </h1>

      <div className="mb-4 space-y-3">
        <DashboardRecapBanner />
        <StreakCard />
        <CoachingInsightCard compact />
      </div>

      <MorningBrief />

      <div className="mt-4">
        <SmartTasks />
      </div>

      <div className="mt-6">
        <StatsRow />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TodayAgenda />
          <HabitStrip />
        </div>
        <div className="space-y-6">
          <WeatherWidget />
          <DashboardReminders />
        </div>
      </div>

      <div className="mt-6">
        <RecentActivity />
      </div>
    </div>
  );
}
