import { api, type TimeSeriesPoint, type CreatorPerformance } from '@/lib/api';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import OnboardingWizard from '@/components/onboarding/onboarding-wizard';

async function fetchDashboardData() {
  try {
    const [metrics, timeSeries, creators] = await Promise.all([
      api.getDashboard(),
      api.getTimeSeries(),
      api.getCreatorPerformance(10),
    ]);
    return { metrics, timeSeries, creators };
  } catch {
    return {
      metrics: null,
      timeSeries: [] as TimeSeriesPoint[],
      creators: [] as CreatorPerformance[],
    };
  }
}

export default async function DashboardPage() {
  const initial = await fetchDashboardData();
  return (
    <div className="space-y-6">
      <OnboardingWizard />
      <DashboardClient initial={initial} />
    </div>
  );
}
