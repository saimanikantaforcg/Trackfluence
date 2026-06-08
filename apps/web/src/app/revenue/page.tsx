import { api } from '@/lib/api';
import { RevenueClient } from '@/components/revenue/revenue-client';

async function fetchData() {
  try {
    const [roas, performance, timeSeries, campaigns, cohorts] = await Promise.all([
      api.getRoas() as Promise<{ totalAttributedRevenue: number; creatorBreakdown: { creatorId: string; creatorName: string; attributedRevenue: number }[] }>,
      api.getCreatorPerformance(20),
      api.getTimeSeries(),
      api.getCampaigns(),
      api.getCohorts(),
    ]);
    return { roas, performance, timeSeries, campaigns, cohorts, error: null };
  } catch {
    return { roas: null, performance: [], timeSeries: [], campaigns: [], cohorts: [], error: 'API unavailable' };
  }
}

export default async function RevenuePage() {
  const { roas, performance, timeSeries, campaigns, cohorts, error } = await fetchData();
  return <RevenueClient roas={roas} performance={performance} timeSeries={timeSeries} campaigns={campaigns} cohorts={cohorts} error={error} />;
}
